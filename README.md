# merkleye-website

The public marketing/docs site for [Merkleye](https://github.com/merkleye/merkleye),
a self-hosted Certificate Transparency watchtower.

Built with [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com).
Static output, effectively zero shipped JavaScript. See
[`docs/DESIGN.md`](docs/DESIGN.md) for the framework and hosting rationale.

This repo is the marketing site only. The product's own dashboard UI lives
in [merkleye-ui](https://github.com/merkleye/merkleye-ui) — a separate
project.

## Development

Requires Node.js 24+.

```bash
npm install
npm run dev       # http://localhost:4321
```

## Build

```bash
npm run build      # type-checks (astro check) and outputs to dist/
npm run preview    # serve the built output locally
```

## Project structure

```
src/
  components/   section components (Nav, Hero, Pillars, Architecture, ...)
  layouts/      base HTML layout + <head>
  pages/        route-level pages (index.astro is the whole site today)
  styles/       global.css — Tailwind + design tokens (colors, fonts)
public/         static assets served as-is (favicon, etc.)
scripts/        build-time tooling (security header generation + verification)
docs/           project docs, including the stack decision record
```

## Deployment

CI builds the site on every push/PR (`.github/workflows/ci.yml`). Pushes to
`master` also deploy to GitHub Pages (`.github/workflows/deploy.yml`) — enable
it once under **Settings → Pages → Source: GitHub Actions**.

Cloudflare Pages is the recommended production host long-term; see
[`docs/DESIGN.md`](docs/DESIGN.md) for why and how to switch.

### Security headers

`npm run build` runs `scripts/generate-headers.mjs`, which writes `dist/_headers`
— the file [Cloudflare Pages reads](https://developers.cloudflare.com/pages/configuration/headers/)
to set response headers. It carries HSTS, `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, and a `default-src 'none'` CSP.

The CSP has no `unsafe-inline`: the site's two inline scripts (the theme
bootstrap that prevents a flash of the wrong theme, and Astro's bundled module
script) are pinned by SHA-256 hash. Those hashes change whenever the scripts do,
which is why the file is generated at build time rather than committed under
`public/`.

`npm run verify:headers` serves `dist/` with those headers actually applied and
loads every built page in Chrome, failing on any CSP violation or blocked
request. Both the PR preview and the production deploy run it before publishing
— Lighthouse serves `dist/` through its own static server, which ignores
`_headers`, so nothing else in CI would catch a policy that blanks the site.

Adding an external script, style, font, or analytics endpoint means widening the
CSP in the generator; `verify:headers` is what tells you that you forgot.

#### HSTS preload

The HSTS header is `max-age=63072000; includeSubDomains; preload`, which meets
the [preload list's submission requirements](https://hstspreload.org/#submission-requirements).
Shipping the header is only half of it — **`merkleye.com` still has to be
submitted at [hstspreload.org](https://hstspreload.org)** once this is deployed.
Until then the header protects returning visitors only; preloading is what
closes the first-visit gap.

`includeSubDomains` was safe to commit to at the time of writing: CT logs and a
DNS sweep showed only `merkleye.com` and `www.merkleye.com`, both HTTPS with
HTTP→HTTPS redirects, and no mail/dev subdomains to strand. That is a standing
constraint, not a one-time check — **every future `*.merkleye.com` host must
serve valid HTTPS from the day it gets DNS**, or browsers will refuse to reach
it. Getting removed from the preload list takes months and ships on browser
release trains, so it isn't a quick rollback.

`verify:headers` enforces the eligibility rules (`max-age` ≥ 1 year,
`includeSubDomains`, `preload`) so the header can't quietly drift out of
qualification after submission.

### PR previews

Every PR against `main` is built and deployed to its own Cloudflare Pages
preview branch (`pr-<number>`), with the preview URL posted as a comment on
the PR (`.github/workflows/pr-preview.yml`). The preview is torn down when
the PR closes (`pr-preview-cleanup.yml`), with a daily scheduled job pruning
any preview older than 7 days as a safety net (`pr-preview-prune.yml`).

Each preview also gets audited with [Lighthouse CI](https://github.com/treosh/lighthouse-ci-action)
against the deployed URL (thresholds in `.github/lighthouserc.json`). The PR
fails if Performance, Accessibility, Best Practices, or SEO drops below 0.9;
scores are posted as their own sticky comment on the PR.

Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets
(same ones used for the production deploy). Previews don't build for PRs
from forks, since `pull_request` runs from forks don't get repo secrets.

## License

Apache-2.0, matching the core [Merkleye](https://github.com/merkleye/merkleye)
project.
