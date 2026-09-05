import { describe, expect, it } from "vitest";
import Hero from "../../src/components/Hero.astro";
import { renderAstro } from "../support/container";

describe("Hero", () => {
  it("renders the #top anchor the nav and footer link back to", async () => {
    const html = await renderAstro(Hero);
    expect(html).toContain('id="top"');
  });

  it("renders all three headline stats", async () => {
    const html = await renderAstro(Hero);
    expect(html).toContain("20–30M");
    expect(html).toContain("100k+");
    // "0" is a common substring, so check it alongside its label instead.
    expect(html).toMatch(/third parties see your domain list/);
  });

  it("links the self-host CTA to the self-hosting section", async () => {
    const html = await renderAstro(Hero);
    expect(html).toContain('href="#self-hosting"');
  });

  it("links to the GitHub repo", async () => {
    const html = await renderAstro(Hero);
    expect(html).toContain('href="https://github.com/merkleye/merkleye"');
  });
});
