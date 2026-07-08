export interface Env {
  ASSETS: Fetcher
  /** Cross-user poe.ninja cache, shared with poe2-runeshape-rewards (same KV
   * namespace id — both apps read/write the same entries). */
  POE_NINJA_CACHE?: KVNamespace
  /** Staleness window for the poe.ninja KV cache, in seconds. */
  POE_NINJA_CACHE_TTL_SECONDS?: string
}

// KV-backed poe.ninja proxy, ported from poe2-runeshape-rewards
// (functions/poe-ninja/[[path]].ts) so both apps share one central cache.
//
// In front of poe.ninja sits a cross-user, globally-replicated Workers KV cache
// with a runtime-configurable staleness window (POE_NINJA_CACHE_TTL_SECONDS) and
// stale-while-revalidate: fresh entries are served straight from KV, stale ones
// are served immediately while a background refresh runs. This collapses many
// users' identical requests into at most one upstream call per window. KV is
// best-effort — any KV failure falls through to a direct upstream fetch so
// pricing never depends on the cache. Every call logs a structured line
// (visible via `wrangler tail`) including the cache outcome.

interface CachedEntry {
  body: string
  status: number
  contentType: string
  /** Epoch ms of the upstream fetch — freshness is measured against this. */
  fetchedAt: number
}

const DEFAULT_TTL_SECONDS = 600

const UPSTREAM_HEADERS: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) current-best-conversion',
  Referer: 'https://poe.ninja/',
  Accept: 'application/json',
}

// One upstream fetch, read fully so the body can be stored in KV. cf.cacheTtl
// keeps a cheap per-colo edge layer underneath KV.
async function fetchUpstream(target: string, method: string): Promise<CachedEntry> {
  const upstream = await fetch(target, {
    method,
    headers: UPSTREAM_HEADERS,
    cf: { cacheTtl: 300, cacheEverything: true },
  })
  return {
    body: await upstream.text(),
    status: upstream.status,
    contentType: upstream.headers.get('content-type') ?? 'application/json',
    fetchedAt: Date.now(),
  }
}

function respond(entry: CachedEntry, cacheState: string): Response {
  const headers = new Headers()
  headers.set('content-type', entry.contentType)
  headers.set('cache-control', 'public, max-age=300')
  // Surfaced for debugging (browser devtools) and the cache-hit-rate metric.
  headers.set('cf-cache', cacheState)
  return new Response(entry.body, { status: entry.status, headers })
}

// Only cache successful responses — a stale 200 beats a cached 404/429/5xx.
// expirationTtl is a self-eviction backstop for abandoned keys; freshness is
// decided by fetchedAt, keeping the staleness window runtime-configurable via
// the env var without a redeploy.
async function put(
  kv: KVNamespace,
  key: string,
  entry: CachedEntry,
  ttlMs: number,
): Promise<void> {
  try {
    const expirationTtl = Math.max(60, Math.floor((ttlMs / 1000) * 6))
    await kv.put(key, JSON.stringify(entry), { expirationTtl })
  } catch {
    // Best-effort; a failed write just means the next request is another miss.
  }
}

async function refresh(
  kv: KVNamespace,
  key: string,
  target: string,
  ttlMs: number,
): Promise<void> {
  try {
    const entry = await fetchUpstream(target, 'GET')
    if (entry.status === 200) await put(kv, key, entry, ttlMs)
  } catch {
    // Leave the stale entry in place; the next request retries.
  }
}

/**
 * Proxies `/poe-api/*` to https://poe.ninja/* through the shared KV cache.
 * Cache keys are `ninja:${path}${search}` — the same derivation as the
 * runeshape proxy, so identical upstream URLs share one entry across apps.
 */
export async function ninjaProxy(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const incoming = new URL(request.url)
  const path = incoming.pathname.replace(/^\/poe-api/, '')

  // Resolve against the fixed host so a crafted path can't escape elsewhere.
  const target = new URL(path + incoming.search, 'https://poe.ninja')
  if (target.hostname !== 'poe.ninja') {
    return new Response('bad request', { status: 400 })
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('method not allowed', { status: 405 })
  }

  const started = Date.now()
  let status = 0
  let cacheState = 'bypass'

  try {
    const kv = env.POE_NINJA_CACHE
    // Only GET responses are cacheable; HEAD and the no-binding case fall back
    // to a direct upstream fetch.
    if (request.method !== 'GET' || !kv) {
      const entry = await fetchUpstream(target.toString(), request.method)
      status = entry.status
      cacheState = kv ? 'bypass' : 'disabled'
      return respond(entry, cacheState)
    }

    const cacheKey = `ninja:${path}${incoming.search}`
    const ttlMs =
      Math.max(
        0,
        Number(env.POE_NINJA_CACHE_TTL_SECONDS) || DEFAULT_TTL_SECONDS,
      ) * 1000

    let hit: CachedEntry | null = null
    try {
      hit = await kv.get<CachedEntry>(cacheKey, 'json')
    } catch {
      hit = null // KV read failed — treat as a miss.
    }

    if (hit) {
      const fresh = Date.now() - hit.fetchedAt < ttlMs
      status = hit.status
      if (fresh) {
        cacheState = 'kv-hit'
      } else {
        // Stale: serve immediately, revalidate in the background.
        cacheState = 'kv-stale'
        ctx.waitUntil(refresh(kv, cacheKey, target.toString(), ttlMs))
      }
      return respond(hit, cacheState)
    }

    // Miss: fetch synchronously, return it, persist in the background.
    cacheState = 'kv-miss'
    const entry = await fetchUpstream(target.toString(), 'GET')
    status = entry.status
    if (entry.status === 200) ctx.waitUntil(put(kv, cacheKey, entry, ttlMs))
    return respond(entry, cacheState)
  } catch {
    status = 502
    return new Response(JSON.stringify({ error: 'upstream fetch failed' }), {
      status: 502,
      headers: { 'content-type': 'application/json', 'cf-cache': cacheState },
    })
  } finally {
    console.log(
      JSON.stringify({
        t: 'poe-ninja-proxy',
        path,
        status,
        cache: cacheState,
        ms: Date.now() - started,
      }),
    )
  }
}

/**
 * Plain edge-cached proxy for static upstream assets (item icons on GGG's
 * CDN). Images are immutable, so a per-colo edge cache is enough — no KV.
 */
export async function proxy(
  request: Request,
  prefix: string,
  upstreamOrigin: string,
  ttlSeconds: number,
): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }
  const url = new URL(request.url)
  const upstream = upstreamOrigin + url.pathname.slice(prefix.length) + url.search
  const res = await fetch(upstream, {
    headers: {
      'User-Agent': 'current-best-conversion (Cloudflare Workers; contact: hi@patneal.codes)',
      Accept: request.headers.get('Accept') ?? '*/*',
      'Accept-Encoding': 'gzip',
    },
    cf: { cacheTtl: ttlSeconds, cacheEverything: true },
  })
  const out = new Response(res.body, res)
  out.headers.set('Cache-Control', `public, max-age=${ttlSeconds}`)
  return out
}
