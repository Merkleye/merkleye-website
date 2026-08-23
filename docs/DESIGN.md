# Site framework & hosting recommendation

This document records the stack decision for the Merkleye marketing/docs site
and why, so future contributors don't have to re-litigate it.

## Constraints that actually matter here

- The site is **content-driven and mostly static** — a handful of long-lived
  marketing/docs pages, not an app with client state.
- Merkleye's pitch is partly about *speed and precision*. A slow, JS-heavy
  marketing site for a speed-and-correctness product would undercut the
  message. Near-zero shipped JS and top-tier Lighthouse scores are a
  requirement, not a nice-to-have.
- It's a small, self-hosted-software OSS project. The workflow is already
  GitHub-centric (issues, PRs, Actions). Whatever we pick should not add a
  second platform to administer, a build system to babysit, or ongoing cost.
- Security-conscious audience: fewer third-party runtime dependencies in the
  shipped page is itself a small trust signal.

## Framework options considered

| Option | Verdict |
|---|---|
| **Astro** | **Chosen.** Ships zero JS by default ("islands" architecture — you opt individual components *into* client-side JS, not out of it). First-class Markdown/MDX for docs-style content growing alongside the marketing pages. Static output is plain HTML/CSS. Build is a single `astro build`, no server runtime required at all. Best-in-class Lighthouse scores out of the box for exactly this kind of site. |
| Next.js (static export) | Viable, but it's an app framework wearing a static-site hat: React runtime and hydration boilerplate ship to the client even for pages with no interactivity, `next export` has real limitations (no built-in image optimization, some App Router features assume a Node/edge server), and it drags in a much larger dependency tree and mental model than a marketing site needs. Makes sense if the team were already deep in Next.js elsewhere; this project isn't. |
| Plain Vite + React | More manual wiring (routing, markdown pipeline, sitemap/RSS, image handling) for no real benefit over Astro, and still ships a React runtime to render content that doesn't need to be interactive. |

**Astro wins** because the site's actual shape — mostly static content,
occasional interactive widget at most — is exactly the case Astro is built
for, and "near-zero JS, great Lighthouse scores" is Astro's default behavior
rather than something to opt into.

Styling: **Tailwind CSS** (via `@tailwindcss/vite`) for velocity on a design
that needs a lot of one-off, considered layout work (hero, pipeline diagram,
feature grid) without hand-rolling a component library.

## Hosting options considered

| Option | Cost | Speed/edge | Fit for this project |
|---|---|---|---|
| **Cloudflare Pages** | Free tier, **unlimited bandwidth** | Cloudflare's edge network; fast globally; free PR preview deployments | Self-hosted infra projects very often already sit behind Cloudflare for DNS/proxy, so there's a good chance the account already exists. No cold-start/function-region concerns for a static site. This is the **recommended long-term host**. |
| GitHub Pages | Free | Fastly-backed CDN, solid but fewer knobs (limited custom headers/redirects) | Zero external accounts, zero secrets — deploys with the built-in `GITHUB_TOKEN` via `actions/deploy-pages`. The most "GitHub-centric workflow" option there is, and the one wired up in this repo today (see below). |
| Netlify / Vercel | Free tier, bandwidth-capped (100 GB/mo Netlify) | Good edge network, great DX, PR previews | Vercel's DX is optimized around Next.js specifically, which we're not using. Netlify is solid but doesn't offer a concrete advantage over Cloudflare Pages for a static Astro site, and its free bandwidth cap is lower. No reason to add a third platform account when Cloudflare or GitHub Pages already cover this. |

### Recommendation

**Cloudflare Pages** is the target production host: unlimited free bandwidth,
a fast global edge, and free preview deployments per PR if/when the repo is
connected directly in the Cloudflare dashboard (git integration, no Actions
YAML needed on Cloudflare's side).

**What's actually wired up in this repo right now:** a GitHub Actions
workflow (`.github/workflows/deploy.yml`) that builds the site on every push
and deploys to **GitHub Pages**, because that requires zero external
credentials — it works immediately with no setup beyond enabling Pages
("Settings → Pages → Source: GitHub Actions") once, in this repo. There's a
separate `ci.yml` that runs the build (and will run lint/typecheck) on every
push and PR regardless of where deploys go, so main is never red silently.

Moving to Cloudflare Pages later is a small, reversible step and needs no
code changes: connect the repo in the Cloudflare dashboard (build command
`npm run build`, output directory `dist`), or swap `deploy.yml` for
`cloudflare/wrangler-action` once a `CLOUDFLARE_API_TOKEN` secret exists.
The static `dist/` output is host-agnostic by construction.
