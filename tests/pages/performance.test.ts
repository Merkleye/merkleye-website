import { describe, expect, it, vi } from "vitest";
import { renderAstro } from "../support/container";

// A hand-authored fixture, not the live perf-results data — the real numbers
// in src/data/perf-claims.json change every time `make perf` reruns in the
// merkleye repo, which would make assertions pinned to them flaky. This
// tests the template's rendering logic, not any particular measurement.
vi.mock("../../src/data/perf-claims.json", () => ({
  default: {
    schema: "merkleye.perf.claims/v1",
    environment: {
      generated_at: "2026-01-01T00:00:00Z",
      go_version: "go1.27.0",
      os: "darwin",
      arch: "arm64",
      num_cpu: 14,
      race_detector: false,
      store_engine: "sqlite (in-memory, modernc.org/sqlite)",
      variant_source: "dnstwist 20250130 (real generator, via python3)",
      merkleye_revision: "abc1234-dirty",
    },
    complete: true,
    totals: { PASS: 2, QUALIFIED: 1, TOTAL: 3 },
    claims: [
      {
        id: "C-01",
        title: "Throughput claim",
        claim: "A claim about throughput.",
        sources: [{ file: "src/components/Hero.astro", probes: [] }],
        threshold: "some threshold",
        result: {
          claim_id: "C-01",
          verdict: "PASS",
          headline: "A big number was measured",
          method: "Measured by doing the thing.",
          metrics: [
            { name: "big_metric", value: 723858.9662723561, unit: "certificates/s" },
            {
              name: "big_metric_extrapolated",
              value: 62541414685.931564,
              unit: "certificates/day",
              note: "well over the claim",
            },
            { name: "sample_count", value: 300, unit: "alerts" },
          ],
          notes: ["An important caveat."],
          measurement_duration_ms: 1,
        },
      },
      {
        id: "C-02",
        title: "Latency claim",
        claim: "A claim about latency.",
        sources: [
          { file: "src/components/Hero.astro", probes: [] },
          { file: "src/components/Pillars.astro", probes: [] },
        ],
        threshold: "p99 under some budget",
        result: {
          claim_id: "C-02",
          verdict: "QUALIFIED",
          headline: "Sub-millisecond latency, under a stated condition",
          method: "Measured end to end.",
          metrics: [
            { name: "p50", value: 0.246209, unit: "ms" },
            { name: "false_criticals", value: 0, unit: "alerts" },
          ],
          notes: ["Only holds under the shipped default rate limit."],
          measurement_duration_ms: 1,
        },
      },
      {
        id: "C-03",
        title: "Scale claim",
        claim: "A claim about watch-set scale.",
        sources: [{ file: "src/components/Firehose.astro", probes: [] }],
        threshold: "flat cost as the watch set grows",
        result: {
          claim_id: "C-03",
          verdict: "PASS",
          headline: "Flat per-item cost",
          method: "Measured across watch-set sizes.",
          metrics: [{ name: "per_item_ns", value: 473.6903855676351, unit: "ns" }],
          notes: ["Two hash lookups per item."],
          measurement_duration_ms: 1,
        },
      },
    ],
  },
}));

describe("performance page", () => {
  it("renders the totals badges, computing FAIL from TOTAL minus PASS/QUALIFIED", async () => {
    const { default: Performance } = await import("../../src/pages/performance.astro");
    const html = await renderAstro(Performance);
    expect(html).toContain("2 PASS");
    expect(html).toContain("1 QUALIFIED");
    expect(html).toContain("0 FAIL");
    expect(html).toContain("of 3 claims");
  });

  it("links the revision with the -dirty suffix stripped, but displays it in full", async () => {
    const { default: Performance } = await import("../../src/pages/performance.astro");
    const html = await renderAstro(Performance);
    expect(html).toContain('href="https://github.com/merkleye/merkleye/commit/abc1234"');
    expect(html).toContain("abc1234-dirty");
  });

  it("omits the release stamp and shows the detector as off when absent/false", async () => {
    const { default: Performance } = await import("../../src/pages/performance.astro");
    const html = await renderAstro(Performance);
    expect(html).not.toContain("Released as");
    expect(html).toContain(">off<");
  });

  it("renders every claim's id, verdict and headline", async () => {
    const { default: Performance } = await import("../../src/pages/performance.astro");
    const html = await renderAstro(Performance);
    for (const id of ["C-01", "C-02", "C-03"]) {
      expect(html).toContain(id);
    }
    expect(html).toContain("A big number was measured");
    expect(html).toContain("QUALIFIED");
  });

  it("formats metric values by magnitude and keeps whole numbers exact, without forcing decimals on integers", async () => {
    const { default: Performance } = await import("../../src/pages/performance.astro");
    const html = await renderAstro(Performance);
    expect(html).toContain("723,859 certificates/s"); // >= 1000, non-integer
    expect(html).toContain("473.69 ns"); // 1-1000, non-integer
    expect(html).toContain("0.2462 ms"); // < 1, non-integer
    expect(html).toContain("300 alerts"); // integer, no forced decimals
    expect(html).toContain("0 alerts"); // integer zero, not "0.0000"
  });

  it("shows a metric's note when present and renders cleanly when absent", async () => {
    const { default: Performance } = await import("../../src/pages/performance.astro");
    const html = await renderAstro(Performance);
    expect(html).toContain("well over the claim");
  });

  it("lists every source component a claim appears in", async () => {
    const { default: Performance } = await import("../../src/pages/performance.astro");
    const html = await renderAstro(Performance);
    expect(html).toContain("Hero, Pillars");
  });

  it("links to the methodology and reproduction instructions", async () => {
    const { default: Performance } = await import("../../src/pages/performance.astro");
    const html = await renderAstro(Performance);
    expect(html).toContain(
      'href="https://github.com/merkleye/merkleye/blob/main/docs/PERFORMANCE.md"',
    );
    expect(html).toContain('href="https://github.com/merkleye/merkleye"');
  });
});
