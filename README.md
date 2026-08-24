# merkleye-website

The public marketing/docs site for [Merkleye](https://github.com/wesleykirkland/merkleye),
a self-hosted Certificate Transparency watchtower.

Built with [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com).
Static output, effectively zero shipped JavaScript. See
[`docs/DESIGN.md`](docs/DESIGN.md) for the framework and hosting rationale.

This repo is the marketing site only. The product's own dashboard UI lives
in [merkleye-ui](https://github.com/wesleykirkland/merkleye-ui) — a separate
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
docs/           project docs, including the stack decision record
```

## Deployment

CI builds the site on every push/PR (`.github/workflows/ci.yml`). Pushes to
`master` also deploy to GitHub Pages (`.github/workflows/deploy.yml`) — enable
it once under **Settings → Pages → Source: GitHub Actions**.

Cloudflare Pages is the recommended production host long-term; see
[`docs/DESIGN.md`](docs/DESIGN.md) for why and how to switch.

## License

Apache-2.0, matching the core [Merkleye](https://github.com/wesleykirkland/merkleye)
project.
