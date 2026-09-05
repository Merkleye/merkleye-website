// Astro's own type-checker (`astro check`, run in `npm run build`) resolves
// `.astro` imports via its language-service plugin and doesn't need this.
// Plain `tsc` and editors without the Astro TS plugin registered do, since
// there's no ambient `*.astro` module declaration shipped for that case —
// this file supplies one, scoped to the test suite where it's needed.
declare module "*.astro" {
  import type { AstroComponentFactory } from "astro/runtime/server/index.js";

  const Component: AstroComponentFactory;
  export default Component;
}
