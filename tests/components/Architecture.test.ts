import { describe, expect, it } from "vitest";
import Architecture from "../../src/components/Architecture.astro";
import { renderAstro } from "../support/container";

describe("Architecture", () => {
  it("renders the #architecture anchor the nav links to", async () => {
    const html = await renderAstro(Architecture);
    expect(html).toContain('id="architecture"');
  });

  it("renders all six pipeline stages in order", async () => {
    const html = await renderAstro(Architecture);
    const titles = [
      "CT logs",
      "certspotter sidecar",
      "Normalize · dedup · match",
      "Policy &amp; score",
      "Persist",
      "Notify",
    ];
    let lastIndex = -1;
    for (const title of titles) {
      const index = html.indexOf(title);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  });

  it("renders one connector arrow between each pair of stages", async () => {
    const html = await renderAstro(Architecture);
    // Six stages need five connectors between them; each connector is the
    // only aria-hidden element this component renders.
    const arrowCount = (html.match(/aria-hidden="true"/g) ?? []).length;
    expect(arrowCount).toBe(5);
  });
});
