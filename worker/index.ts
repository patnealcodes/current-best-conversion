import { proxy, ttlMinutes } from './proxy'
import type { Env } from './proxy'

// With `run_worker_first = ["/poe-api/*", "/poe-img/*"]` in wrangler.toml,
// only the proxy routes invoke this Worker; everything else is served
// straight from the static assets (dist/). The ASSETS fallback below covers
// any path that reaches the Worker anyway.
export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname.startsWith('/poe-api/')) {
      return proxy(request, '/poe-api', 'https://poe.ninja', ttlMinutes(env) * 60)
    }
    if (pathname.startsWith('/poe-img/')) {
      return proxy(request, '/poe-img', 'https://web.poecdn.com', 86_400)
    }
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
