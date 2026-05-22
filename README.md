# amtocsoft-www

Source for **amtocsoft.com** — the marketing landing for the AmtocSoft Content Automation Pipeline Starter Kit. Deployed via Cloudflare Pages (project name: `amtocsoft`).

## Why this repo exists

The original Pages project was deployed via direct upload (no Git provider) and the source on disk was lost. A breaking deploy in May 2026 wiped the variant-routing middleware, which had to be recreated from observed production behavior. This repo is the recovered source-of-truth.

## Architecture

Cloudflare Pages **Advanced Mode** — a single `_worker.js` at the project root handles all incoming requests:

- `GET /` → 308 redirect to `/index-{variant}` with `ab_variant` cookie
- All other paths → fall through to static asset handler (`env.ASSETS.fetch`)

### A/B/C variant routing

The marketing landing runs a three-way split test. The worker:

- Reads `ab_variant` cookie if present; otherwise picks alpha/beta/gamma at random (33/33/34)
- Sets the cookie with `Path=/`, `Expires=next midnight UTC`, `SameSite=Lax`
- Redirects to `/index-alpha`, `/index-beta`, or `/index-gamma`

### Variants

| Variant | Approach |
|---|---|
| `index-alpha.html` | Tall counter widgets in pink/purple/orange/coral, hero with prominent stats |
| `index-beta.html` | Inline counter row + headline, more text-forward layout |
| `index-gamma.html` | "Living pipeline" hero with static stat tags, no animated counters |

All three share `styles.css`, `script.js`, `analytics.js`, `favicon.ico`.

### Counter widgets (alpha/beta only)

`script.js` fetches `https://amtocbot.com/api/content-stats` on hero scroll-into-view and animates counters from 0 to the live value. CORS must allow `amtocsoft.com` origin (see `amtocbot-droid/amtocbot-site` PR #15).

Counter elements declare `data-counter="N"` as a stale-fallback value and `data-stat="X"` for the API field name. Gamma doesn't use counters — it has static stat-tag text instead.

## Deploy

```bash
cd /Users/amtoc/amtocsoft-www
npx wrangler pages deploy . --project-name=amtocsoft --branch=main
```

Cloudflare detects `_worker.js` and bundles it as the Worker entry point. No `functions/` directory should exist alongside `_worker.js` — they're mutually exclusive.

## Verify post-deploy

```bash
# Variant routing
curl -sI "https://amtocsoft.com/" | grep -iE "(^HTTP|location|set-cookie)"
# Should see: HTTP/2 308 + location: /index-{variant} + set-cookie: ab_variant=...

# All variants
for v in alpha beta gamma; do
  curl -sI "https://amtocsoft.com/index-$v" | head -1
done

# CORS path
curl -sI -H "Origin: https://amtocsoft.com" "https://amtocbot.com/api/content-stats"
```

## Editing stale numbers

The counter fallbacks (`data-counter="N"`) and gamma's static stat text need periodic refresh as the content catalog grows. Current snapshot (2026-05-22):

- 235 blog posts (live; D1 has 252 total, filter excludes 17 future-dated)
- 50 videos
- 39 podcasts
- 137 shorts
- 53 days since launch (2026-03-30)
- 8 platforms

Update both the `data-counter` values in `index-alpha.html` / `index-beta.html` AND the visible text snippets in `index-gamma.html` (`250+ blog posts`, `50+ videos`, etc.) and the two `<meta description>` tags in gamma.

## Known caveats

- The 4 legal pages (`/license`, `/privacy`, `/terms`, `/refund-policy`, `/acceptable-use`) referenced in variant footers don't have corresponding files in this project. Cloudflare returns the SPA fallback HTML (a stale CEOClone landing). Worth either: (a) creating real legal-page files, (b) updating footer links to remove them, or (c) configuring the SPA fallback to a sensible default.
- `index.html` is a copy of `index-gamma.html` as a defensive fallback in case the `_worker.js` routing fails to fire.
