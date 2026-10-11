/* ==========================================================================
   theme.js: light (default, warm cream) / dark mode toggle

   The saved theme is applied before the page paints by the small inline
   script in index.html's <head>. This module wires up the button and
   announces changes with an "aa:themechange" event, which the particle
   animation listens to so it can switch colors.
   ========================================================================== */

const STORAGE_KEY = "aa-theme";

/** Browser UI color (mobile address bar) per theme. Matches --bg in style.css. */
const THEME_COLORS = {
  light: "#F7F4EC",
  dark: "#0E1B1E",
};

export function initTheme(button) {
  const root = document.documentElement;
  applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light", { persist: false });

  button?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
  });
}

function applyTheme(theme, { persist = true } = {}) {
  document.documentElement.setAttribute("data-theme", theme);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLORS[theme]);

  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }

  document.dispatchEvent(new CustomEvent("aa:themechange", { detail: { theme } }));
}
