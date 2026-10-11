/* ==========================================================================
   sections.js: the smaller homepage sections
   - About: photo (with initials fallback) and the three stat numbers
   - FAQ: questions from data/faq.json
   - Contact: Email and WhatsApp buttons from config.json
   - "Request a quote" links: remember which item the visitor asked about
   ========================================================================== */

import { t, localize, formatNumber } from "./i18n.js";
import { icon } from "./icons.js";
import { messageButtonsHTML } from "./links.js";
import { escapeHTML, bidi } from "./utils.js";
import { state } from "./state.js";

const QUOTE_KEY = "aa-quote-item";

/**
 * The photo is inserted before the first translation pass, so its
 * alt text (data-i18n-attr) is translated along with everything else.
 */
export function renderAboutPhoto() {
  const frame = document.getElementById("about-photo");
  const src = state.config?.person?.photo;
  if (!frame || !src) return;

  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.setAttribute("data-i18n-attr", "alt:about.photoAlt");
  // If the file is missing, remove it and let the initials show
  img.addEventListener("error", () => img.remove(), { once: true });
  frame.appendChild(img);
}

/**
 * Hero portrait: a cut-out PNG (transparent background) standing on the
 * brush stroke. The silhouette placeholder stays until the image loads.
 */
export function renderHeroPhoto() {
  const visual = document.getElementById("hero-visual");
  const src = state.config?.person?.heroPhoto;
  if (!visual || !src) return;

  const img = document.createElement("img");
  img.className = "hero__portrait";
  img.src = src;
  img.alt = "";
  img.decoding = "async";
  img.fetchPriority = "high";
  img.setAttribute("data-i18n-attr", "alt:hero.photoAlt");
  img.addEventListener("load", () => visual.classList.add("has-photo"), { once: true });
  img.addEventListener("error", () => img.remove(), { once: true });
  visual.appendChild(img);
}

export function initSections() {
  renderHeroDetails();
  renderStats();
  renderFaq();
  renderContactActions();
  initQuoteLinks();

  document.addEventListener("aa:languagechange", () => {
    renderStats();
    renderFaq();
    renderContactActions();
  });
}

/* --------------------------------------------------------------------------
   Hero: email link and the "Available for new projects" badge
-------------------------------------------------------------------------- */
function renderHeroDetails() {
  const email = state.config?.contact?.email;
  const link = document.getElementById("hero-email");
  if (link && /@/.test(email || "")) {
    link.href = `mailto:${email}`;
    link.textContent = email;
    link.hidden = false;
  }

  const status = document.getElementById("hero-status");
  if (status && state.config?.person?.available === false) status.hidden = true;
}

/* --------------------------------------------------------------------------
   About: stats (numbers are counted from the data, so they stay accurate
   as you add products). motion.js counts them up when they scroll in.
-------------------------------------------------------------------------- */
function renderStats() {
  const products = state.products.filter((item) => item.type === "product");
  const values = {
    products: products.length,
    demos: products.filter((item) => item.status === "live-demo").length,
    languages: (state.config?.site?.languages || ["en", "fa", "ps"]).length,
  };

  document.querySelectorAll("[data-stat]").forEach((node) => {
    const value = values[node.dataset.stat] ?? 0;
    node.dataset.value = String(value);
    node.textContent = formatNumber(value);
  });

  // "How it works" step numbers: 1 2 3 4 in English, ۱ ۲ ۳ ۴ in Dari/Pashto
  document.querySelectorAll("[data-number]").forEach((node) => {
    node.textContent = formatNumber(Number(node.dataset.number));
  });
}

/* --------------------------------------------------------------------------
   FAQ: native <details> elements, so they work without JavaScript and
   with keyboards and screen readers. Open questions stay open when the
   language changes.
-------------------------------------------------------------------------- */
function renderFaq() {
  const list = document.getElementById("faq-list");
  if (!list) return;

  const openIndexes = new Set(
    Array.from(list.querySelectorAll("details")).flatMap((d, i) => (d.open ? [i] : []))
  );

  list.innerHTML = (state.faq || [])
    .map((item, index) => {
      const content = localize(item.content) || {};
      if (!content.question) return "";
      return `
        <details class="faq__item"${openIndexes.has(index) ? " open" : ""}>
          <summary class="faq__question">
            <span>${bidi(content.question)}</span>
            <span class="faq__icon">${icon("plus")}</span>
          </summary>
          <div class="faq__answer"><p>${bidi(content.answer || "")}</p></div>
        </details>`;
    })
    .join("");
}

/* --------------------------------------------------------------------------
   Contact section buttons (WhatsApp, Telegram, Email), from links.js.
   The WhatsApp message is pre-written in the visitor's language.
-------------------------------------------------------------------------- */
function renderContactActions() {
  const box = document.getElementById("contact-actions");
  if (!box) return;
  box.innerHTML = messageButtonsHTML({ message: t("contactCta.whatsappMessage") });
}

/* --------------------------------------------------------------------------
   "Request a quote" links carry data-quote="item-id". The choice is kept
   for this browser session so the Phase 4 quote form can pre-select it.
   Also used on product pages, whose quote buttons lead to the homepage.
-------------------------------------------------------------------------- */
export function initQuoteLinks() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-quote]");
    if (!link) return;
    try {
      sessionStorage.setItem(QUOTE_KEY, link.dataset.quote);
    } catch {
      /* ignore */
    }
  });
}
