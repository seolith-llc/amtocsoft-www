// Cloudflare Pages Advanced Mode worker for amtocsoft.com.
//
// Recreates the original A/B/C variant routing that was wiped during a
// static-only deploy (the original lived as a Pages Function that
// didn't survive into the local source tree).
//
//   - Root `/` issues 308 to `/index-{variant}` with an `ab_variant` cookie
//   - Variant chosen from the existing cookie, or random 33/33/34 if no cookie
//   - All other paths fall through to the static asset handler (env.ASSETS)
//
// Advanced Mode docs: a single `_worker.js` at the project root replaces
// Pages Functions. We don't need `functions/_middleware.ts` alongside;
// Advanced Mode is mutually exclusive with the Functions directory layout.

const VARIANTS = ['alpha', 'beta', 'gamma'];

function readCookie(cookieHeader, name) {
  const m = cookieHeader.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? m[1] : null;
}

function pickVariant() {
  const r = Math.random();
  if (r < 1 / 3) return 'alpha';
  if (r < 2 / 3) return 'beta';
  return 'gamma';
}

function nextMidnightUTC() {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toUTCString();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      const cookieHeader = request.headers.get('Cookie') ?? '';
      const existing = readCookie(cookieHeader, 'ab_variant');
      const variant =
        existing && VARIANTS.includes(existing) ? existing : pickVariant();

      return new Response(null, {
        status: 308,
        headers: {
          'Location': `/index-${variant}`,
          'Set-Cookie': `ab_variant=${variant}; Path=/; Expires=${nextMidnightUTC()}; SameSite=Lax`,
          'Access-Control-Allow-Origin': '*',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Everything else: hand off to Pages' static asset handler.
    return env.ASSETS.fetch(request);
  },
};
