import { describe, expect, it } from "vitest";
import Correctness from "../../src/components/Correctness.astro";
import { renderAstro } from "../support/container";

describe("Correctness", () => {
  it("renders the #correctness anchor the nav links to", async () => {
    const html = await renderAstro(Correctness);
    expect(html).toContain('id="correctness"');
  });

  it("renders all four correctness details", async () => {
    const html = await renderAstro(Correctness);
    for (const title of [
      "Dedup on sha256(DER), never serial",
      "Punycode/A-label normalization",
      "Public Suffix List aware",
      "Transparent, additive scoring",
    ]) {
      expect(html).toContain(title);
    }
  });
});
