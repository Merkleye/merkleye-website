import { describe, expect, it } from "vitest";
import Footer from "../../src/components/Footer.astro";
import { renderAstro } from "../support/container";

describe("Footer", () => {
  it("renders the current year", async () => {
    const html = await renderAstro(Footer);
    const year = new Date().getFullYear().toString();
    expect(html).toContain(year);
  });

  it("links to both project repos and the license", async () => {
    const html = await renderAstro(Footer);
    expect(html).toContain('href="https://github.com/merkleye/merkleye"');
    expect(html).toContain('href="https://github.com/merkleye/merkleye-ui"');
    expect(html).toContain(
      'href="https://github.com/merkleye/merkleye/blob/main/LICENSE"',
    );
  });

  it("links back to the homepage top, so it still resolves from other pages", async () => {
    const html = await renderAstro(Footer);
    expect(html).toContain('href="/#top"');
  });

  it("links to the performance dashboard page", async () => {
    const html = await renderAstro(Footer);
    expect(html).toContain('href="/performance"');
  });
});
