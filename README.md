# Current Best Conversion

## Powered by poe.ninja <3

A Vite + React app that shows Path of Exile 2 currency exchange rates from
[poe.ninja](https://poe.ninja), styled after its exchange overview. Typing a
currency into the **Target** box (with autocomplete) switches to a view that
compares buying/selling that currency with the main currencies (Divine,
Exalted, Chaos), sorted by the best value per Divine Orb of spend.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production bundle in dist/
npm run preview  # serve the production bundle (proxy included)
```

## Configuration (`.env`)

| Variable                  | Default          | Meaning                                   |
| ------------------------- | ---------------- | ----------------------------------------- |
| `VITE_CACHE_TTL_MINUTES`  | `5`              | How long the poe.ninja response is cached |
| `VITE_LEAGUE`             | `Runes of Aldur` | League whose exchange data is shown       |

Values are baked in at dev/build time (standard Vite behavior).

The Pages Function that proxies poe.ninja has its own edge-cache TTL,
`CACHE_TTL_MINUTES` in [wrangler.toml](wrangler.toml) — keep it aligned with
`VITE_CACHE_TTL_MINUTES`.

## Deploying (Cloudflare Pages)

The Pages project `current-best-conversion` is connected to this GitHub repo,
so **pushing to the production branch deploys automatically**. Cloudflare
reads `wrangler.toml` (project name, `dist` output, function vars) and picks
up the `functions/` directory for the `/poe-api/*` and `/poe-img/*` proxies.

In the Pages dashboard, Settings → Build, set:

- Build command: `npm run build`
- Build output directory: `dist` (must match `pages_build_output_dir`)

Useful wrangler commands (all read wrangler.toml; `npx wrangler login` once):

```sh
npm run cf:preview          # build + serve dist/ AND functions locally on :8788
npm run cf:deploy           # build + direct upload, bypassing GitHub CI
npm run cf:typecheck        # typecheck the Pages Functions
npx wrangler pages deployment list   # recent deployments
npx wrangler pages deployment tail   # live logs from the functions
```

## How it works

- Data comes from poe.ninja's exchange overview endpoint
  (`/poe2/api/economy/exchange/current/overview`). The response is cached in
  `localStorage` for the configured TTL; if poe.ninja is unreachable the app
  falls back to the stale cache and shows a warning. "Refresh now" bypasses
  the cache.
- poe.ninja sends no CORS headers, so the app requests `/poe-api/*` and the
  Vite dev/preview server proxies it (see `vite.config.ts`). Item icons are
  proxied the same way via `/poe-img/*` to GGG's CDN (`web.poecdn.com`).
  In production the same two routes are served by Cloudflare Pages Functions
  (see `functions/`), which additionally cache responses on Cloudflare's edge
  — poe.ninja is hit at most once per TTL per colo, no matter how many
  visitors the site has.
- The API provides one mid value per currency (in Divine Orbs), so buy/sell
  rates are reciprocals of each other unless the exact pair is a currency's
  most-traded pairing, in which case the real market rate from the API is
  used (marked *market pair* in the target view; mid-derived rates are marked
  *derived*).
