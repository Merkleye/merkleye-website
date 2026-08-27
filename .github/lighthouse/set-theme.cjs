// LHCI puppeteerScript: forces the site's own dark/light theme before each
// collect run, via the same localStorage key Layout.astro's inline script
// reads before first paint. Reusing the app's real theme switch is more
// representative than emulating prefers-color-scheme at the browser level,
// and lets one Lighthouse run audit each theme explicitly instead of
// whatever the CI runner's default color scheme happens to be.
//
// Theme picked via LHCI_THEME env var so lighthouserc.dark.json and
// lighthouserc.light.json can share this one script.
module.exports = async (browser, context) => {
  const theme = process.env.LHCI_THEME === "light" ? "light" : "dark";
  const page = await browser.newPage();
  await page.goto(context.url);
  await page.evaluate((t) => localStorage.setItem("theme", t), theme);
  await page.close();
};
