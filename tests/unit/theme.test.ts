import { describe, expect, it } from "vitest";
import { createThemeHarness } from "../support/themeHarness";

const DARK = "#05080a";
const LIGHT = "#f7f9fa";

function themeColor(document: Document): string | null {
  return document.querySelector('meta[name="theme-color"]')?.getAttribute("content") ?? null;
}

describe("theme toggle (real scripts from Layout.astro + Nav.astro)", () => {
  it("defaults to the system preference and syncs the theme-color meta tag", () => {
    // The harness's matchMedia stub defaults to prefersLight=false (dark).
    const harness = createThemeHarness();
    expect(harness.document.documentElement.getAttribute("data-theme")).toBeNull();
    expect(themeColor(harness.document)).toBe(DARK);
  });

  it("respects a theme already stored in localStorage over the system preference", () => {
    const harness = createThemeHarness({ storedTheme: "light" });
    expect(harness.document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(themeColor(harness.document)).toBe(LIGHT);
  });

  it("__toggleTheme flips the theme, persists it, and updates the meta color", () => {
    const harness = createThemeHarness({ storedTheme: "dark" });
    const next = (harness.window as unknown as { __toggleTheme: () => string }).__toggleTheme();

    expect(next).toBe("light");
    expect(harness.window.localStorage.getItem("theme")).toBe("light");
    expect(harness.document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(themeColor(harness.document)).toBe(LIGHT);
  });

  it("__toggleTheme is idempotent-safe: toggling twice returns to the start", () => {
    const harness = createThemeHarness({ storedTheme: "dark" });
    const toggle = (harness.window as unknown as { __toggleTheme: () => string }).__toggleTheme;

    expect(toggle()).toBe("light");
    expect(toggle()).toBe("dark");
    expect(harness.document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("clicking the nav toggle button flips the theme via __toggleTheme", () => {
    const harness = createThemeHarness({ storedTheme: "dark" });
    harness.toggleButton.click();

    expect(harness.document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(harness.window.localStorage.getItem("theme")).toBe("light");
  });

  it("sets the toggle button's aria-label from the current theme, and updates it on click", () => {
    const harness = createThemeHarness({ storedTheme: "dark" });
    expect(harness.toggleButton.getAttribute("aria-label")).toBe("Switch to light theme");

    harness.toggleButton.click();
    expect(harness.toggleButton.getAttribute("aria-label")).toBe("Switch to dark theme");
  });

  it("syncs the meta color on a system theme change only when no theme is stored", () => {
    const noPref = createThemeHarness();
    noPref.setPrefersLight(true);
    noPref.fireSystemThemeChange();
    expect(themeColor(noPref.document)).toBe(LIGHT);

    const stored = createThemeHarness({ storedTheme: "dark" });
    stored.setPrefersLight(true);
    stored.fireSystemThemeChange();
    // A stored preference wins over the OS-level change.
    expect(themeColor(stored.document)).toBe(DARK);
  });
});
