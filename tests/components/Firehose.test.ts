import { describe, expect, it } from "vitest";
import Firehose from "../../src/components/Firehose.astro";
import { renderAstro } from "../support/container";

describe("Firehose", () => {
  it("contrasts query-per-domain volume against the firehose model", async () => {
    const html = await renderAstro(Firehose);
    expect(html).toContain("100,000");
    expect(html).toContain("certspotter");
    expect(html).toContain("dnstwist");
  });
});
