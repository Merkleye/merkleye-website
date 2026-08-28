import { describe, expect, it } from "vitest";
import Nav from "../../src/components/Nav.astro";
import { renderAstro } from "../support/container";

describe("Nav", () => {
  it("links every nav item to an in-page anchor", async () => {
    const html = await renderAstro(Nav);
    for (const id of [
      "pillars",
      "architecture",
      "correctness",
      "self-hosting",
      "ecosystem",
    ]) {
      expect(html).toContain(`href="#${id}"`);
    }
  });

  it("renders both the dark and light brand logo variants", async () => {
    const html = await renderAstro(Nav);
    expect(html).toContain("merkleye-logotype-dark-transparent-notagline.svg");
    expect(html).toContain("merkleye-logotype-light-transparent-notagline.svg");
  });

  it("links to the GitHub org and includes a theme toggle button", async () => {
    const html = await renderAstro(Nav);
    expect(html).toContain('href="https://github.com/merkleye/merkleye"');
    expect(html).toContain('id="theme-toggle"');
  });
});
