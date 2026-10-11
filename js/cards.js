/* ==========================================================================
   cards.js: the product / service card, shared by
   - the homepage catalog (catalog.js)
   - the "You might also need" section on product pages (product-page.js)
   ========================================================================== */

import { t, localize } from "./i18n.js";
import { icon, CATEGORY_ICONS } from "./icons.js";
import { escapeHTML, bidi } from "./utils.js";

/** Badge color per status. */
const STATUS_CLASS = {
  "live-demo": "badge--live",
  "coming-soon": "badge--soon",
  available: "badge--live",
  screenshots: "badge--preview",
};

/** Link to an item's own page. */
export function itemHref(item) {
  return `product.html?id=${encodeURIComponent(item.id)}`;
}

/** "For businesses", "For NGOs" or "For businesses and NGOs". */
export function audienceLabel(item) {
  const audience = item.audience || [];
  return audience.length > 1 ? t("audience.both") : t(`audience.${audience[0] || "business"}`);
}

/** The drawn cover shown until real screenshots are added. */
export function coverPlaceholderHTML(category) {
  return `<div class="cover-placeholder" aria-hidden="true"><span class="cover-placeholder__icon">${icon(
    CATEGORY_ICONS[category] || "grid"
  )}</span></div>`;
}

/**
 * Cover image with an automatic fallback: images carrying
 * data-fallback-category are swapped for the drawn placeholder if the file
 * is missing (see attachImageFallbacks below).
 */
export function coverHTML(src, category, { eager = false } = {}) {
  // Images at the top of a page load right away; the rest wait until needed
  const loading = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  return src
    ? `<img src="${escapeHTML(src)}" alt="" ${loading} decoding="async" data-fallback-category="${escapeHTML(category)}" />`
    : coverPlaceholderHTML(category);
}

/** Call after inserting HTML that contains cover images. */
export function attachImageFallbacks(root) {
  root.querySelectorAll("img[data-fallback-category]").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = coverPlaceholderHTML(img.dataset.fallbackCategory);
        img.replaceWith(wrapper.firstElementChild);
      },
      { once: true }
    );
  });
}

/** One card. The whole card links to the item's page. */
export function cardHTML(item) {
  const content = localize(item.content) || {};
  const category = item.category;
  const isLive = item.status === "live-demo" && item.links?.demo;

  const demoLink = isLive
    ? `<a class="product-card__demo" href="${escapeHTML(item.links.demo)}" target="_blank" rel="noopener">
         <span>${escapeHTML(t("catalog.tryDemo"))}</span>${icon("external")}
         <span class="sr-only">${escapeHTML(t("common.newTab"))}</span>
       </a>`
    : "";

  return `
    <article class="product-card" data-flip-id="${escapeHTML(item.id)}" data-id="${escapeHTML(item.id)}" data-category="${escapeHTML(category)}">
      <div class="product-card__media">
        ${coverHTML(item.media?.cover, category)}
        <span class="badge ${STATUS_CLASS[item.status] || "badge--soon"}">${escapeHTML(t(`status.${item.status}`))}</span>
      </div>
      <div class="product-card__body">
        <p class="product-card__category">${icon(CATEGORY_ICONS[category] || "grid")}<span>${escapeHTML(t(`categories.${category}`))}</span></p>
        <h3 class="product-card__title">
          <a class="product-card__link" href="${itemHref(item)}">${bidi(content.name || item.id)}</a>
        </h3>
        <p class="product-card__tagline">${bidi(content.tagline || "")}</p>
        <div class="product-card__footer">
          <span class="product-card__audience">${escapeHTML(audienceLabel(item))}</span>
          ${demoLink}
        </div>
      </div>
    </article>`;
}
