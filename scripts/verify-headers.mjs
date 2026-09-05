// Verifies the generated dist/_headers against the real build.
//
// The CSP in _headers pins inline scripts by hash, so a source change that
// alters an inline script — or any new external resource — would be blocked in
// production only. This serves dist/ with those headers actually applied, loads
// every built page in Chrome, and fails on any CSP violation or broken request.
//
// Chrome comes from CHROME_PATH, or the usual Linux/macOS install locations.

import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const DIST = fileURLToPath(new URL("../dist", import.meta.url));
const PORT = 8787;

const REQUIRED_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
];

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const CONTENT_TYPES = {
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".json": "application/json",
  ".md": "text/markdown",
  ".svg": "image/svg+xml",
};

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const headersPath = join(DIST, "_headers");
if (!existsSync(headersPath)) {
  throw new Error("dist/_headers is missing — run npm run build first.");
}

// Only the single `/*` block is emitted, so every indented line applies to all
// responses; parsing anything smarter would outrun what the generator writes.
const headers = readFileSync(headersPath, "utf8")
  .split("\n")
  .filter((line) => line.startsWith("  ") && line.includes(":"))
  .map((line) => {
    const split = line.indexOf(":");
    return [line.slice(0, split).trim(), line.slice(split + 1).trim()];
  });

const missing = REQUIRED_HEADERS.filter(
  (name) => !headers.some(([key]) => key.toLowerCase() === name),
);
if (missing.length > 0) {
  throw new Error(`dist/_headers is missing: ${missing.join(", ")}`);
}

const csp = headers.find(([k]) => k.toLowerCase() === "content-security-policy")?.[1] ?? "";
if (/unsafe-inline|unsafe-eval/.test(csp)) {
  throw new Error(`CSP must not weaken script/style execution: ${csp}`);
}

// The HSTS header is submitted to the browser preload list, and getting removed
// from that list takes months, so hold it to the list's own eligibility rules
// rather than to whatever the generator happened to emit.
// https://hstspreload.org/#submission-requirements
const hsts = headers.find(([k]) => k.toLowerCase() === "strict-transport-security")?.[1] ?? "";
const maxAge = Number(hsts.match(/max-age=(\d+)/)?.[1] ?? 0);
const ONE_YEAR = 31536000;
if (maxAge < ONE_YEAR) {
  throw new Error(`HSTS max-age must be at least ${ONE_YEAR} for preload, got ${maxAge}.`);
}
for (const directive of ["includeSubDomains", "preload"]) {
  if (!new RegExp(`\\b${directive}\\b`, "i").test(hsts)) {
    throw new Error(`HSTS must include ${directive} to stay preload-eligible: ${hsts}`);
  }
}

const chrome = CHROME_CANDIDATES.find((path) => existsSync(path));
if (!chrome) {
  throw new Error(`No Chrome found. Tried: ${CHROME_CANDIDATES.join(", ")}`);
}

const server = createServer((req, res) => {
  let path = join(DIST, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  if (!existsSync(path) || !path.startsWith(DIST)) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  for (const [name, value] of headers) res.setHeader(name, value);
  res.setHeader("Content-Type", CONTENT_TYPES[extname(path)] ?? "application/octet-stream");
  res.writeHead(200);
  res.end(readFileSync(path));
});
await new Promise((resolve) => server.listen(PORT, resolve));

const pages = walk(DIST)
  .filter((path) => path.endsWith(".html"))
  .map((path) => "/" + relative(DIST, path).split(sep).join("/").replace(/index\.html$/, ""));

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--disable-gpu", "--no-sandbox", "--no-zygote"],
});

const failures = [];
for (const route of pages) {
  const page = await browser.newPage();
  const problems = [];

  page.on("console", (message) => {
    const text = message.text();
    if (/Content Security Policy|Refused to/i.test(text)) problems.push(text);
  });
  page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
  page.on("requestfailed", (request) =>
    problems.push(`request failed: ${request.url()} (${request.failure()?.errorText})`),
  );

  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "networkidle0" });

  // The inline theme bootstrap and the bundled module script are exactly what
  // the hashes pin, so prove both actually ran rather than just that nothing
  // logged a violation.
  const bootstrapRan = await page.evaluate(() => typeof window.__toggleTheme === "function");
  if (!bootstrapRan) problems.push("inline theme script did not run");

  const toggle = await page.$("#theme-toggle");
  if (toggle) {
    const before = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await toggle.click();
    const after = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    if (before === after) problems.push("theme toggle did not change the theme");
  }

  const imagesLoaded = await page.evaluate(() =>
    [...document.images].every((image) => image.complete && image.naturalWidth > 0),
  );
  if (!imagesLoaded) problems.push("one or more images failed to load");

  await page.close();
  if (problems.length > 0) failures.push({ route, problems });
  console.log(`${problems.length === 0 ? "✓" : "✗"} ${route}`);
}

await browser.close();
server.close();

if (failures.length > 0) {
  for (const { route, problems } of failures) {
    console.error(`\n${route}:`);
    for (const problem of problems) console.error(`  - ${problem}`);
  }
  console.error("\nThe security headers break the site — see above.");
  process.exit(1);
}

console.log(`\nAll ${pages.length} page(s) load cleanly under the generated headers.`);
