/* ==========================================================================
   i18n.js: language engine for English, Dari and Pashto

   How translations work:
   - Interface text (buttons, headings, labels) lives in i18n/en.json,
     i18n/fa.json and i18n/ps.json.
   - In the HTML, an element marked  data-i18n="hero.title"  gets its text
     replaced with that key's translation.
   - To translate an attribute, use  data-i18n-attr="aria-label:nav.label"
     (several pairs can be separated with ";").
   - Product and service content lives inside data/products.json, with an
     "en", "fa" and "ps" block per item. Use localize() to pick the right one.
   - Anything missing in Dari or Pashto falls back to English automatically,
     so an untranslated string never shows up blank.

   Language codes:  en = English,  fa = Dari,  ps = Pashto
   (Dari uses the "fa" code because browsers and fonts key Persian-script
   shaping to it; the page itself is tagged fa-AF / ps-AF for Afghanistan.)
   ========================================================================== */

import { loadJSON, getPath } from "./utils.js";

/** Supported languages and how each one is set up on the <html> element. */
const LANGUAGES = {
  en: { dir: "ltr", htmlLang: "en" },
  fa: { dir: "rtl", htmlLang: "fa-AF" },
  ps: { dir: "rtl", htmlLang: "ps-AF" },
};

const DEFAULT_LANG = "en";
const STORAGE_KEY = "aa-lang";
const RTL_FONT_ID = "font-vazirmatn";
const RTL_FONT_URL = "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap";

/** Loaded dictionaries, cached so switching back and forth is instant. */
const dictionaries = new Map();
let currentLang = DEFAULT_LANG;

/* --------------------------------------------------------------------------
   Public helpers
-------------------------------------------------------------------------- */

export const isSupported = (lang) => Object.prototype.hasOwnProperty.call(LANGUAGES, lang);
export const getLanguage = () => currentLang;
export const getDirection = () => LANGUAGES[currentLang].dir;

/**
 * Decide which language to start in. Priority:
 *   1. ?lang= in the URL (so you can share a link that opens in Pashto)
 *   2. the visitor's last choice, saved in this browser
 *   3. the site default from config.json
 */
export function detectLanguage(siteDefault = DEFAULT_LANG) {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (isSupported(fromUrl)) return fromUrl;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (isSupported(saved)) return saved;
  } catch {
    /* localStorage blocked: ignore */
  }
  return isSupported(siteDefault) ? siteDefault : DEFAULT_LANG;
}

/**
 * Translate a key such as "hero.title".
 * Falls back to English, then to the key itself (so a missing key is
 * visible during development instead of silently blank).
 * Can return a string OR an array (e.g. "hero.forItems").
 */
export function t(key) {
  const value = getPath(dictionaries.get(currentLang), key);
  if (!isEmpty(value)) return value;

  const fallback = getPath(dictionaries.get(DEFAULT_LANG), key);
  return isEmpty(fallback) ? key : fallback;
}

/**
 * Pick the current language from a per-language object like
 *   { "en": {...}, "fa": {...}, "ps": {...} }
 * Fields missing or empty in the current language are filled from English,
 * so a half-translated product still displays completely.
 */
export function localize(field) {
  if (field == null || typeof field !== "object" || Array.isArray(field)) return field;

  const base = field[DEFAULT_LANG];
  const local = field[currentLang];
  if (currentLang === DEFAULT_LANG || isEmpty(local)) return base;

  // Both are strings: use the translation
  if (typeof local !== "object") return local;

  // Both are objects: English first, then overwrite with non-empty translations
  const merged = { ...base };
  for (const [key, value] of Object.entries(local)) {
    if (!isEmpty(value)) merged[key] = value;
  }
  return merged;
}

/**
 * Format a number for the current language. Dari and Pashto get
 * Eastern Arabic digits (۱۲۳), English gets 123.
 */
export function formatNumber(value) {
  const { htmlLang, dir } = LANGUAGES[currentLang];
  // Some browsers lack Pashto number data, so ask for the digits explicitly
  const options = dir === "rtl" ? { numberingSystem: "arabext" } : {};
  return new Intl.NumberFormat(htmlLang, options).format(value);
}

/**
 * Translate a key and fill in {placeholders}:
 *   tf("catalog.countMany", { n: 5 })  ->  "5 systems"
 * Numbers are formatted for the current language automatically.
 */
export function tf(key, values = {}) {
  return String(t(key)).replace(/\{(\w+)\}/g, (match, name) => {
    if (!(name in values)) return match;
    const value = values[name];
    return typeof value === "number" ? formatNumber(value) : String(value);
  });
}

/** Apply translations to every marked element inside `root`. */
export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = t(el.dataset.i18n);
    if (typeof value === "string") el.textContent = value;
  });

  root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":").map((part) => part.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}

/**
 * Switch the whole site to `lang`:
 * loads the dictionary, flips direction, loads the Persian-script font if
 * needed, re-translates the page, updates the URL, and announces the change
 * with an "aa:languagechange" event so other modules can re-render.
 */
export async function setLanguage(lang, { persist = true } = {}) {
  if (!isSupported(lang)) lang = DEFAULT_LANG;

  // English is always loaded: it's the fallback for everything else
  await loadDictionary(DEFAULT_LANG);
  if (lang !== DEFAULT_LANG) {
    try {
      await loadDictionary(lang);
    } catch (error) {
      console.error(`[i18n] Could not load "${lang}", staying in English.`, error);
      lang = DEFAULT_LANG;
    }
  }

  currentLang = lang;
  const { dir, htmlLang } = LANGUAGES[lang];
  const root = document.documentElement;

  if (dir === "rtl") ensureRtlFont();
  root.setAttribute("lang", htmlLang);
  root.setAttribute("dir", dir);

  applyTranslations();
  updateDocumentMeta();

  if (persist) {
    saveChoice(lang);
    updateUrl(lang);
  }

  root.removeAttribute("data-i18n-pending");
  document.dispatchEvent(new CustomEvent("aa:languagechange", { detail: { lang, dir } }));
}

/* --------------------------------------------------------------------------
   Internal helpers
-------------------------------------------------------------------------- */

async function loadDictionary(lang) {
  if (!dictionaries.has(lang)) {
    dictionaries.set(lang, await loadJSON(`i18n/${lang}.json`));
  }
  return dictionaries.get(lang);
}

function isEmpty(value) {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/** Add the Vazirmatn stylesheet once, the first time Dari/Pashto is used. */
function ensureRtlFont() {
  if (document.getElementById(RTL_FONT_ID)) return;
  const link = document.createElement("link");
  link.id = RTL_FONT_ID;
  link.rel = "stylesheet";
  link.href = RTL_FONT_URL;
  document.head.appendChild(link);
}

/** Translate the browser tab title and the search-engine description. */
function updateDocumentMeta() {
  document.title = t("meta.title");
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", t("meta.description"));
}

function saveChoice(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

/** Keep ?lang= in the address bar so the current page can be shared as-is. */
function updateUrl(lang) {
  const url = new URL(window.location.href);
  if (lang === DEFAULT_LANG) url.searchParams.delete("lang");
  else url.searchParams.set("lang", lang);
  window.history.replaceState(null, "", url);
}
