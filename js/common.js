/* ==========================================================================
   common.js: startup steps shared by every page (homepage and product pages)

     1. Theme toggle
     2. Load config.json and products.json (+ faq.json when asked)
     3. The page's own "before language" step, icons
     4. Language (translates the page, flips to RTL if needed)
     5. Footer contact / social buttons (links.js) and navigation

   Each page then adds its own parts:
     js/main.js          -> homepage
     js/product-page.js  -> product.html
   ========================================================================== */

import { loadJSON } from "./utils.js";
import { detectLanguage, setLanguage } from "./i18n.js";
import { initTheme } from "./theme.js";
import { initNav } from "./nav.js";
import { hydrateIcons } from "./icons.js";
import { renderFooterLinks, initPlaceholderLinks } from "./links.js";
import { state } from "./state.js";

/**
 * Run the shared startup. Returns true when the page can continue,
 * false if the data couldn't be loaded (an error screen is shown instead).
 *
 * @param {object}   options
 * @param {boolean}  options.loadFaq         also load data/faq.json
 * @param {Function} options.beforeLanguage  runs before the first
 *        translation pass, for elements that carry data-i18n attributes
 */
export async function bootstrap({ loadFaq = false, beforeLanguage } = {}) {
  initTheme(document.getElementById("theme-toggle"));

  try {
    const [config, productData, faqData] = await Promise.all([
      loadJSON("data/config.json"),
      loadJSON("data/products.json"),
      loadFaq ? loadJSON("data/faq.json") : Promise.resolve({ items: [] }),
    ]);
    state.config = config;
    state.products = Array.isArray(productData.items) ? productData.items : [];
    state.faq = Array.isArray(faqData.items) ? faqData.items : [];

    beforeLanguage?.();
    hydrateIcons();
    document.getElementById("footer-year").textContent = String(new Date().getFullYear());

    await setLanguage(detectLanguage(config.site?.defaultLanguage));
    renderFooterLinks();
    initPlaceholderLinks();
    initNav({ onLanguageSelect: (lang) => setLanguage(lang) });
    return true;
  } catch (error) {
    showLoadError(error);
    return false;
  }
}

/* --------------------------------------------------------------------------
   Error screen, shown if the data files can't be loaded.
   Written in English on purpose: the translations may be what failed.
-------------------------------------------------------------------------- */
function showLoadError(error) {
  console.error("[site] Startup failed:", error);
  document.documentElement.removeAttribute("data-i18n-pending");
  document.getElementById("main").innerHTML = `
    <div class="load-error">
      <h1>The site data couldn't be loaded</h1>
      <p>
        This page needs to be served over http(s) for its data files to load.
        Opening the HTML file directly from your computer won't work.
        Run <code>python -m http.server</code> in the site folder and open
        <code>http://localhost:8000</code>, or view the site on GitHub Pages.
      </p>
    </div>`;
}
