import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type { ContainerRenderOptions } from "astro/container";

/**
 * Renders an .astro component to a static HTML string via Astro's Container
 * API, so component tests exercise the real render pipeline (props, slots,
 * Astro.site, etc.) instead of a hand-rolled stand-in.
 */
export async function renderAstro(
  Component: AstroComponentFactory,
  options?: ContainerRenderOptions,
): Promise<string> {
  // Matches astro.config.mjs's `site` — Layout.astro's canonical <link> uses
  // Astro.site, which is otherwise undefined under the container API.
  const container = await AstroContainer.create({
    astroConfig: { site: "https://merkleye.dev" },
  });
  return container.renderToString(Component, options);
}
