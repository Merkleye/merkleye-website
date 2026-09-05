import { describe, expect, it, vi } from "vitest";
import { renderAstro } from "../support/container";

// The checked-in src/data/perf-claims.json (synced from a merkleye release)
// won't carry release_version/release_url until the first automated sync
// runs, and race_detector is false in that snapshot — so the "released as"
// row and the detector-on state need a fixture of their own to be exercised
// at all. See scripts/sync-perf-dashboard.sh in the merkleye repo, which is
// what stamps release_version/release_url on.
vi.mock("../../src/data/perf-claims.json", () => ({
  default: {
    schema: "merkleye.perf.claims/v1",
    environment: {
      generated_at: "2026-01-01T00:00:00Z",
      go_version: "go1.27.0",
      os: "linux",
      arch: "amd64",
      num_cpu: 4,
      race_detector: true,
      store_engine: "sqlite (in-memory, modernc.org/sqlite)",
      variant_source: "dnstwist 20250130 (real generator, via python3)",
      merkleye_revision: "abc1234",
      release_version: "v1.2.3",
      release_url: "https://github.com/merkleye/merkleye/releases/tag/v1.2.3",
    },
    complete: true,
    totals: { PASS: 1, QUALIFIED: 0, TOTAL: 1 },
    claims: [
      {
        id: "C-01",
        title: "Example claim",
        claim: "Example claim text.",
        sources: [{ file: "src/components/Hero.astro", probes: [] }],
        threshold: "example threshold",
        result: {
          claim_id: "C-01",
          verdict: "PASS",
          headline: "Example headline",
          method: "Example method.",
          metrics: [{ name: "example_metric", value: 42, unit: "things" }],
          notes: ["Example note."],
          measurement_duration_ms: 1,
        },
      },
    ],
  },
}));

describe("performance page (release-tagged data)", () => {
  it("shows the release stamp and an on race-detector state once synced for a release", async () => {
    const { default: Performance } = await import("../../src/pages/performance.astro");
    const html = await renderAstro(Performance);
    expect(html).toContain("Released as");
    expect(html).toContain('href="https://github.com/merkleye/merkleye/releases/tag/v1.2.3"');
    expect(html).toContain("v1.2.3");
    expect(html).toContain(">on<");
  });
});
