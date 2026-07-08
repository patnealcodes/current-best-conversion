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

## How it works

- Data comes from poe.ninja's exchange overview endpoint
  (`/poe2/api/economy/exchange/current/overview`). The response is cached in
  `localStorage` for the configured TTL; if poe.ninja is unreachable the app
  falls back to the stale cache and shows a warning. "Refresh now" bypasses
  the cache.
- poe.ninja sends no CORS headers, so the app requests `/poe-api/*` and the
  Vite dev/preview server proxies it (see `vite.config.ts`). Item icons are
  proxied the same way via `/poe-img/*` to GGG's CDN (`web.poecdn.com`).
  **If you deploy `dist/` to a static host, replicate those two rewrites**
  (nginx `location`, Netlify `_redirects`, etc.).
- The API provides one mid value per currency (in Divine Orbs), so buy/sell
  rates are reciprocals of each other unless the exact pair is a currency's
  most-traded pairing, in which case the real market rate from the API is
  used (marked *market pair* in the target view; mid-derived rates are marked
  *derived*).
