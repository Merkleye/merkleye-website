import { describe, expect, it } from "vitest";
import Ecosystem from "../../src/components/Ecosystem.astro";
import { renderAstro } from "../support/container";

describe("Ecosystem", () => {
  it("renders the #ecosystem anchor the nav links to", async () => {
    const html = await renderAstro(Ecosystem);
    expect(html).toContain('id="ecosystem"');
  });

  it("links both project cards to their own repo", async () => {
    const html = await renderAstro(Ecosystem);
    expect(html).toContain('href="https://github.com/merkleye/merkleye"');
    expect(html).toContain('href="https://github.com/merkleye/merkleye-ui"');
  });

  it("renders all six roadmap items, marking only the shipped ones done", async () => {
    const html = await renderAstro(Ecosystem);
    const doneItems = ["CT log ingestion", "Policy engine"];
    const nextItems = [
      "dnstwist lookalike pipeline",
      "Scoring &amp; digests",
      "Auth &amp; audit",
      "Web UI (merkleye-ui)",
    ];

    for (const label of [...doneItems, ...nextItems]) {
      expect(html).toContain(label);
    }

    const doneBadgeCount = (
      html.match(/border-\(--color-accent-dim\) bg-\(--color-accent\)\/3/g) ??
      []
    ).length;
    expect(doneBadgeCount).toBe(doneItems.length);
  });
});
