import { describe, expect, it } from "vitest";
import Index from "../../src/pages/index.astro";
import { renderAstro } from "../support/container";

describe("index page", () => {
  it("renders every section the nav links to, in nav order", async () => {
    const html = await renderAstro(Index);
    const navHrefs = ["pillars", "architecture", "correctness", "self-hosting", "ecosystem"];

    let lastIndex = -1;
    for (const id of navHrefs) {
      // Each nav href="#id" must resolve to a real id="..." further down
      // the same page, or the anchor link is dead.
      const targetIndex = html.indexOf(`id="${id}"`);
      expect(targetIndex, `missing id="${id}" for nav link #${id}`).toBeGreaterThan(-1);
      expect(targetIndex).toBeGreaterThan(lastIndex);
      lastIndex = targetIndex;
    }
  });

  it("renders the sections in document order: nav, hero, ..., footer", async () => {
    const html = await renderAstro(Index);
    const order = [
      "<header",
      'id="top"',
      'id="pillars"',
      'id="architecture"',
      'id="correctness"',
      'id="self-hosting"',
      'id="ecosystem"',
      "<footer",
    ];

    let lastIndex = -1;
    for (const marker of order) {
      const index = html.indexOf(marker);
      expect(index, `missing marker: ${marker}`).toBeGreaterThan(-1);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  });
});
