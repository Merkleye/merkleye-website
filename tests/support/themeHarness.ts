import { JSDOM } from "jsdom";
import path from "node:path";
import { extractScript, stripTypes } from "./extractScript";

const ROOT = path.resolve(import.meta.dirname, "../..");

const layoutInlineScript = extractScript(
  path.join(ROOT, "src/layouts/Layout.astro"),
  "is:inline",
);
const navThemeScript = stripTypes(
  extractScript(path.join(ROOT, "src/components/Nav.astro"), ""),
);

type MediaQueryListener = () => void;

/**
 * Boots a jsdom document with the real theme-toggle scripts from
 * Layout.astro and Nav.astro (see themeHarness's imports) evaluated against
 * it, matching how they run in the browser: Layout's inline script defines
 * `window.__toggleTheme` before Nav's script wires up the button.
 */
export function createThemeHarness(options?: { storedTheme?: "light" | "dark" }) {
  const dom = new JSDOM(
    `<!doctype html>
    <html>
      <head><meta name="theme-color" content="#05080a"></head>
      <body><button id="theme-toggle" type="button"></button></body>
    </html>`,
    { url: "https://merkleye.dev/" },
  );
  const { window } = dom;

  if (options?.storedTheme) {
    window.localStorage.setItem("theme", options.storedTheme);
  }

  let prefersLight = false;
  const listeners: MediaQueryListener[] = [];
  // jsdom doesn't implement matchMedia; the real script only relies on
  // `.matches` and `.addEventListener("change", ...)`, so a minimal stub
  // covers both the initial read and the OS-theme-change listener.
  window.matchMedia = ((query: string) => ({
    matches: query.includes("light") ? prefersLight : !prefersLight,
    media: query,
    addEventListener: (_event: string, cb: MediaQueryListener) => {
      listeners.push(cb);
    },
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;

  const run = (code: string) => {
    new Function("window", "document", "localStorage", "matchMedia", code)(
      window,
      window.document,
      window.localStorage,
      window.matchMedia,
    );
  };

  run(layoutInlineScript);
  run(navThemeScript);

  return {
    window,
    document: window.document,
    toggleButton: window.document.getElementById("theme-toggle")!,
    setPrefersLight(value: boolean) {
      prefersLight = value;
    },
    fireSystemThemeChange() {
      for (const listener of listeners) listener();
    },
  };
}
