import { proxy, ttlMinutes } from '../_proxy'
import type { Env } from '../_proxy'

export const onRequest: PagesFunction<Env> = (ctx) =>
  proxy(ctx.request, '/poe-api', 'https://poe.ninja', ttlMinutes(ctx.env) * 60)
