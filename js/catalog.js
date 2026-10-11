/* ==========================================================================
   catalog.js: the product catalog on the homepage

   - Audience switch (All / Businesses / NGOs), also set by the two
     "path" cards above the catalog.
   - "What do you need to manage?" tiles: one per category, with a count.
   - Product cards, filtered by both. Filtering animates smoothly with GSAP
     Flip when available (see motion.js); without it, it just updates.
   - The audience choice is kept in the URL (?for=ngo), so a filtered view
     can be shared, e.g. send an NGO contact  yoursite/?for=ngo#products

   Only items with "type": "product" appear here. Services have their own
   section (services.js).
   ========================================================================== */

import { t, tf } from "./i18n.js";
import { icon, CATEGORY_ICONS } from "./icons.js";
import { escapeHTML, prefersReducedMotion } from "./utils.js";
import { cardHTML, attachImageFallbacks } from "./cards.js";
import { animateLayoutChange } from "./motion.js";
import { state } from "./state.js";

const AUDIENCES = ["all", "business", "ngo"];
const filters = { audience: "all", category: "all" };
const el = {};

export function initCatalog() {
  el.grid = document.getElementById("catalog-grid");
  el.needs = document.getElementById("catalog-needs");
  el.count = document.getElementById("catalog-count");
  el.empty = document.getElementById("catalog-empty");
  el.reset = document.getElementById("catalog-reset");
  el.audience = document.getElementById("catalog-audience");
  if (!el.grid) return;

  // Start from ?for= in the URL if present
  const fromUrl = new URLSearchParams(window.location.search).get("for");
  if (AUDIENCES.includes(fromUrl)) filters.audience = fromUrl;

  render();

  /* ---- Controls ---- */
  el.audience.addEventListener("click", (event) => {
    const button = event.target.closest("[data-audience]");
    if (button) setFilters({ audience: button.dataset.audience });
  });

  el.needs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (button) setFilters({ category: button.dataset.category });
  });

  el.reset.addEventListener("click", () => setFilters({ audience: "all", category: "all" }));

  // The "path" cards: set the audience, then scroll down to the catalog
  document.querySelectorAll("[data-set-audience]").forEach((button) => {
    button.addEventListener("click", () => {
      setFilters({ audience: button.dataset.setAudience, category: "all" });
      document.getElementById("products").scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });
  });

  // Rebuild the text in the new language, keeping the current filters
  document.addEventListener("aa:languagechange", render);
}

/* --------------------------------------------------------------------------
   Data helpers
-------------------------------------------------------------------------- */

/** Products only (no services), in their "order". */
function getProducts() {
  return state.products
    .filter((item) => item.type === "product")
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

function matches(product, { audience, category }) {
  const audienceOk = audience === "all" || (product.audience || []).includes(audience);
  const categoryOk = category === "all" || product.category === category;
  return audienceOk && categoryOk;
}

/** Categories in the order they first appear in the product list. */
function getCategories(products) {
  return [...new Set(products.map((p) => p.category))];
}

/* --------------------------------------------------------------------------
   Rendering
-------------------------------------------------------------------------- */

function render() {
  const products = getProducts();
  renderNeeds(products);
  renderCards(products);
  applyFilters({ animate: false });
}

/** The "What do you need to manage?" tiles. */
function renderNeeds(products) {
  const tile = (category, iconName, label) => `
    <button class="need" type="button" data-category="${escapeHTML(category)}" aria-pressed="false">
      <span class="need__icon">${icon(iconName)}</span>
      <span class="need__label">${escapeHTML(label)}</span>
      <span class="need__count" data-need-count></span>
    </button>`;

  el.needs.innerHTML = [
    tile("all", "grid", t("catalog.allNeeds")),
    ...getCategories(products).map((category) =>
      tile(category, CATEGORY_ICONS[category] || "grid", t(`categories.${category}`))
    ),
  ].join("");
}

/** All product cards are rendered once; filtering only shows / hides them.
    The card markup itself lives in cards.js (shared with product pages). */
function renderCards(products) {
  el.grid.innerHTML = products.map(cardHTML).join("");
  attachImageFallbacks(el.grid);
}

/* --------------------------------------------------------------------------
   Filtering
-------------------------------------------------------------------------- */

function setFilters(next, options = {}) {
  Object.assign(filters, next);
  applyFilters(options);
}

function applyFilters({ animate = true } = {}) {
  const products = getProducts();
  const byId = new Map(products.map((p) => [p.id, p]));

  // Counts per category, within the chosen audience
  const inAudience = products.filter((p) => matches(p, { audience: filters.audience, category: "all" }));
  const counts = { all: inAudience.length };
  inAudience.forEach((p) => (counts[p.category] = (counts[p.category] || 0) + 1));

  // If the chosen category has nothing for this audience, fall back to "all"
  if (filters.category !== "all" && !counts[filters.category]) filters.category = "all";

  // Audience buttons
  el.audience.querySelectorAll("[data-audience]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.audience === filters.audience));
  });

  // Need tiles: pressed state, count, hide tiles with nothing in them
  el.needs.querySelectorAll("[data-category]").forEach((button) => {
    const category = button.dataset.category;
    const count = counts[category] || 0;
    button.setAttribute("aria-pressed", String(category === filters.category));
    button.classList.toggle("is-hidden", category !== "all" && count === 0);
    button.querySelector("[data-need-count]").textContent = String(count ? tf("catalog.countShort", { n: count }) : "");
  });

  // Cards
  const cards = Array.from(el.grid.children);
  let visible = 0;
  const update = () => {
    cards.forEach((card) => {
      const show = matches(byId.get(card.dataset.id), filters);
      card.classList.toggle("is-hidden", !show);
      if (show) visible++;
    });
  };
  animate ? animateLayoutChange(cards, update) : update();

  el.count.textContent = tf(visible === 1 ? "catalog.countOne" : "catalog.countMany", { n: visible });
  el.empty.classList.toggle("is-hidden", visible > 0);

  updateUrl();
}

/** Keep ?for= in the address bar in sync (other params like ?lang stay). */
function updateUrl() {
  const url = new URL(window.location.href);
  if (filters.audience === "all") url.searchParams.delete("for");
  else url.searchParams.set("for", filters.audience);
  window.history.replaceState(null, "", url);
}
