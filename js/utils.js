/* ==========================================================================
   utils.js: small shared helpers used by the other modules
   ========================================================================== */

/**
 * Fetch and parse a JSON file.
 * NOTE: fetch() only works when the site is served over http(s), for example
 * on GitHub Pages or with `python -m http.server` locally. Opening
 * index.html directly from disk (file://) will fail.
 */
export async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path} (HTTP ${response.status})`);
  }
  return response.json();
}

/** Escape text before inserting it into HTML, so data can never inject markup. */
export function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape AND direction-isolate text that comes from the data files.
 * <bdi> lets each piece of text keep its own direction, so an English
 * sentence shown on a Dari page (before it's translated) keeps its
 * punctuation in the right place, and vice versa.
 */
export function bidi(value) {
  return `<bdi>${escapeHTML(value)}</bdi>`;
}

/** Links to other websites open in a new tab; links within this site don't. */
export function isExternalUrl(url) {
  return /^https?:\/\//i.test(String(url || ""));
}

/** Run `fn` only after calls have stopped for `wait` ms (used for resize). */
export function debounce(fn, wait = 200) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** True when the visitor's device asks for reduced motion. */
export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Read a nested value by dotted path: getPath(obj, "hero.title").
 * Returns undefined if any step is missing.
 */
export function getPath(obj, path) {
  return path.split(".").reduce(
    (node, key) => (node != null && node[key] !== undefined ? node[key] : undefined),
    obj
  );
}
