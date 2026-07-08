export interface Env {
  /** Edge-cache lifetime for poe.ninja API responses, in minutes. */
  CACHE_TTL_MINUTES?: string
}

/**
 * Proxies GET requests to an upstream origin, stripping a path prefix.
 * Responses are cached on Cloudflare's edge for `ttlSeconds`, so upstream is
 * hit at most once per TTL per colo regardless of visitor count.
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
      'User-Agent': 'current-best-conversion (Cloudflare Pages; contact: hi@patneal.codes)',
      Accept: request.headers.get('Accept') ?? '*/*',
      'Accept-Encoding': 'gzip',
    },
    cf: { cacheTtl: ttlSeconds, cacheEverything: true },
  })
  const out = new Response(res.body, res)
  out.headers.set('Cache-Control', `public, max-age=${ttlSeconds}`)
  return out
}

export function ttlMinutes(env: Env): number {
  const n = Number(env.CACHE_TTL_MINUTES)
  return n > 0 ? n : 5
}
