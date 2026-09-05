import { describe, expect, it } from "vitest";
import Pillars from "../../src/components/Pillars.astro";
import { renderAstro } from "../support/container";

describe("Pillars", () => {
  it("renders the #pillars anchor the nav links to", async () => {
    const html = await renderAstro(Pillars);
    expect(html).toContain('id="pillars"');
  });

  it("renders all three pillars with their icons", async () => {
    const html = await renderAstro(Pillars);
    for (const title of ["Security", "Speed", "Accuracy"]) {
      expect(html).toContain(title);
    }
    // Each pillar's icon path must resolve — a typo'd icon key would silently
    // render an empty <path d="">.
    expect(html).not.toContain('<path d="">');
  });

  it("renders three supporting points per pillar", async () => {
    const html = await renderAstro(Pillars);
    const listItemCount = (html.match(/<li\b/g) ?? []).length;
    expect(listItemCount).toBe(9);
  });
});
