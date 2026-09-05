import { describe, expect, it } from "vitest";
import Layout from "../../src/layouts/Layout.astro";
import { renderAstro } from "../support/container";

describe("Layout", () => {
  it("uses the default title and description when no props are given", async () => {
    const html = await renderAstro(Layout, {
      slots: { default: "<p>content</p>" },
    });
    expect(html).toContain(
      "<title>Merkleye — Certificate Transparency watchtower</title>",
    );
    expect(html).toContain(
      'content="Merkleye tails every CT log in real time',
    );
  });

  it("overrides the title and description via props", async () => {
    const html = await renderAstro(Layout, {
      props: { title: "Custom title", description: "Custom description" },
      slots: { default: "<p>content</p>" },
    });
    expect(html).toContain("<title>Custom title</title>");
    expect(html).toContain('content="Custom description"');
    expect(html).not.toContain("Certificate Transparency watchtower");
  });

  it("renders the default slot inside the body", async () => {
    const html = await renderAstro(Layout, {
      slots: { default: '<main id="marker">hi</main>' },
    });
    expect(html).toContain('<main id="marker">hi</main>');
  });

  it("points the canonical link at the configured site", async () => {
    const html = await renderAstro(Layout, {
      slots: { default: "<p>content</p>" },
      request: new Request("https://merkleye.dev/some/path"),
    });
    expect(html).toMatch(
      /<link rel="canonical" href="https:\/\/merkleye\.dev\/some\/path">/,
    );
  });

  it("carries the theme-detection script inline, before the body", async () => {
    const html = await renderAstro(Layout, {
      slots: { default: "<p>content</p>" },
    });
    const scriptIndex = html.indexOf("__toggleTheme");
    const bodyIndex = html.indexOf("<body");
    expect(scriptIndex).toBeGreaterThan(-1);
    expect(scriptIndex).toBeLessThan(bodyIndex);
  });
});
