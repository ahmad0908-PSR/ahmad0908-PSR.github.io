/* ==========================================================================
   services.js: the "Custom dashboards and automation" section

   Renders:
   - the "Works with the tools you already use" list (config.json "tools")
   - one row per service (items with "type": "service" in products.json)

   Each row has a "Request a quote" button that jumps to the contact
   section and remembers which service was chosen (see sections.js), so
   the quote form in Phase 4 can fill it in automatically.
   ========================================================================== */

import { t, localize } from "./i18n.js";
import { icon, SERVICE_ICONS, CATEGORY_ICONS } from "./icons.js";
import { escapeHTML, bidi, isExternalUrl } from "./utils.js";
import { state } from "./state.js";

export function initServices() {
  renderTools();
  renderServices();
  document.addEventListener("aa:languagechange", renderServices);
}

/** Tool names stay in their original spelling in every language. */
function renderTools() {
  const list = document.getElementById("tools-list");
  if (!list) return;
  const tools = state.config?.tools || [];
  list.innerHTML = tools.map((tool) => `<li class="tools__item" dir="ltr">${escapeHTML(tool)}</li>`).join("");
}

function renderServices() {
  const container = document.getElementById("service-list");
  if (!container) return;

  const services = state.products
    .filter((item) => item.type === "service")
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  container.innerHTML = services.map(serviceHTML).join("");
}

function serviceHTML(service) {
  const content = localize(service.content) || {};
  const iconName = SERVICE_ICONS[service.id] || CATEGORY_ICONS[service.category] || "barChart";
  const features = (content.features || []).slice(0, 4);

  const featureList = features
    .map((feature) => `<li class="service__feature">${icon("check")}<span>${bidi(feature.title)}</span></li>`)
    .join("");

  // Show a link to the first sample, if the service has one
  const sample = (service.samples || []).find((s) => s.url);
  const external = sample && isExternalUrl(sample.url);
  const sampleLink = !sample
    ? ""
    : external
      ? `<a class="text-link" href="${escapeHTML(sample.url)}" target="_blank" rel="noopener">
           <span>${escapeHTML(t("services.sample"))}</span>${icon("external")}
           <span class="sr-only">${escapeHTML(t("common.newTab"))}</span>
         </a>`
      : `<a class="text-link" href="${escapeHTML(sample.url)}">
           <span>${escapeHTML(t("services.sample"))}</span><span class="icon-flip">${icon("arrowRight")}</span>
         </a>`;

  return `
    <article class="service" id="service-${escapeHTML(service.id)}">
      <div class="service__intro">
        <span class="service__icon">${icon(iconName)}</span>
        <div>
          <h3 class="service__title">${bidi(content.name || service.id)}</h3>
          <p class="service__tagline">${bidi(content.tagline || "")}</p>
        </div>
      </div>
      <div class="service__detail">
        <p class="service__summary">${bidi(content.summary || "")}</p>
        <ul class="service__features">${featureList}</ul>
        <div class="service__actions">
          <a class="btn btn--ghost btn--sm" href="#contact" data-quote="${escapeHTML(service.id)}">${escapeHTML(t("services.quote"))}</a>
          <a class="text-link" href="product.html?id=${encodeURIComponent(service.id)}">
            <span>${escapeHTML(t("services.details"))}</span><span class="icon-flip">${icon("arrowRight")}</span>
          </a>
          ${sampleLink}
        </div>
      </div>
    </article>`;
}
