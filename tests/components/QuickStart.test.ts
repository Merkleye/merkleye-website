import { describe, expect, it } from "vitest";
import QuickStart from "../../src/components/QuickStart.astro";
import { renderAstro } from "../support/container";

describe("QuickStart", () => {
  it("renders the #self-hosting anchor the nav links to", async () => {
    const html = await renderAstro(QuickStart);
    expect(html).toContain('id="self-hosting"');
  });

  it("renders a docker-compose snippet with the merkleye and postgres services", async () => {
    const html = await renderAstro(QuickStart);
    expect(html).toContain("docker-compose.yml");
    expect(html).toContain("merkleye:");
    expect(html).toContain("postgres:16-alpine");
  });

  it("renders a config.yaml snippet with the expected-issuer policy shape", async () => {
    const html = await renderAstro(QuickStart);
    expect(html).toContain("config.yaml");
    expect(html).toContain("expected_issuers:");
    expect(html).toContain("watch_lookalikes: true");
  });

  it("links to the self-hosting docs", async () => {
    const html = await renderAstro(QuickStart);
    expect(html).toContain('href="https://github.com/merkleye/merkleye"');
  });
});
