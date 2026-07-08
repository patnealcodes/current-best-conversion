import { proxy } from '../_proxy'
import type { Env } from '../_proxy'

// Icon URLs contain content hashes, so cache them for a day.
export const onRequest: PagesFunction<Env> = (ctx) =>
  proxy(ctx.request, '/poe-img', 'https://web.poecdn.com', 86_400)
