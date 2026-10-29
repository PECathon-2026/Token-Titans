import { beforeEach, describe, expect, it, vi } from "vitest";

/** The reader's saved choice must always beat the system one, and the dark class must follow the theme. */
async function loadTheme() {
  vi.resetModules();
  return import("./theme");
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("theme", () => {
  it("follows the system while the reader hasn't chosen", async () => {
    const { preferredTheme } = await loadTheme();
    expect(preferredTheme()).toBe("light");
  });

  it("keeps a saved choice over the system", async () => {
    localStorage.setItem("swr-theme", "dark");
    const { preferredTheme } = await loadTheme();
    expect(preferredTheme()).toBe("dark");
  });

  it("paints the dark class on and off with the theme", async () => {
    const { setTheme, currentTheme } = await loadTheme();
    setTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(currentTheme()).toBe("dark");
    setTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(currentTheme()).toBe("light");
  });
});
