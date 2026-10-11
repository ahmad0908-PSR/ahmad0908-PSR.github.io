/* ==========================================================================
   product-page.js: entry point for product.html

   One template serves every product AND service page:
     product.html?id=dental-clinic          (a product)
     product.html?id=power-bi-dashboards    (a service)

   Page sections, in order (a section is skipped if its data is empty):
     1. Hero: name, tagline, status, buttons, preview (video loop, cover
        image, or drawn placeholder) in a browser-style frame
     2. Overview: the problem it solves, what it does, who it's for
     3. What you get: the features
     4. Demo video (YouTube, loads only when the visitor presses play)
     5. Screenshots (click to view full size)
     6. Examples of my work (services with "samples")
     7. Under the hood: tech stack, for technical readers (collapsed)
     8. Call to action: quote, WhatsApp, email
     9. Related products or services
   ========================================================================== */

import { bootstrap } from "./common.js";
import { t, tf, localize, getLanguage } from "./i18n.js";
import { icon, CATEGORY_ICONS } from "./icons.js";
import { escapeHTML, bidi, prefersReducedMotion, isExternalUrl } from "./utils.js";
import { cardHTML, coverHTML, coverPlaceholderHTML, attachImageFallbacks, audienceLabel } from "./cards.js";
import { setupGallery } from "./gallery.js";
import { initQuoteLinks } from "./sections.js";
import { initMotion } from "./motion.js";
import { messageButtonsHTML } from "./links.js";
import { state } from "./state.js";

/** Quote requests go to the contact section on the homepage (Phase 4 form). */
const QUOTE_HREF = "index.html#contact";

/** Subtitle language codes to request from YouTube, per site language. */
const CAPTION_LANG = { en: "en", fa: "fa", ps: "ps" };

const STATUS_CLASS = { "live-demo": "badge--live", "coming-soon": "badge--soon", available: "badge--live", screenshots: "badge--preview" };

async function init() {
  const ready = await bootstrap();
  if (!ready) return;

  const id = new URLSearchParams(window.location.search).get("id");
  render(id);

  // Re-render in the new language (i18n.js keeps ?id= in the URL)
  document.addEventListener("aa:languagechange", () => render(id));

  initQuoteLinks();
  initMotion();
}

/* --------------------------------------------------------------------------
   Page
-------------------------------------------------------------------------- */

function render(id) {
  const root = document.getElementById("product-root");
  const item = state.products.find((entry) => entry.id === id);

  if (!item) {
    root.innerHTML = notFoundHTML();
    document.title = `${t("product.notFound.title")} | ${t("brand.full")}`;
    return;
  }

  const content = localize(item.content) || {};
  const screenshots = normalizeScreenshots(item.media?.screenshots);

  root.innerHTML = `
    ${heroHTML(item, content)}
    <div class="product-sections">
      ${overviewHTML(content)}
      ${featuresHTML(content)}
      ${videoHTML(item, content)}
      ${galleryHTML(screenshots, content)}
      ${samplesHTML(item)}
      ${techHTML(item)}
      ${ctaHTML(item, content)}
      ${relatedHTML(item)}
    </div>`;

  attachImageFallbacks(root);
  setupGallery(root, screenshots);
  setupVideo(root, content);
  setupPreview(root);
  updateMeta(content);
}

/** Browser tab title + search description for this item. */
function updateMeta(content) {
  document.title = `${content.name} | ${t("brand.full")}`;
  const description = document.querySelector('meta[name="description"]');
  if (description && content.summary) description.setAttribute("content", content.summary);
}

/* --------------------------------------------------------------------------
   1. Hero
-------------------------------------------------------------------------- */

function heroHTML(item, content) {
  const isService = item.type === "service";
  const category = item.category;
  const backHref = isService ? "index.html#services" : "index.html#products";
  const backLabel = t(isService ? "product.backServices" : "product.backProducts");

  return `
    <section class="page-hero" aria-labelledby="page-title">
      <div class="container page-hero__grid">
        <div class="page-hero__text">
          <a class="crumbs" href="${backHref}">
            <span class="icon-back">${icon("arrowRight")}</span><span>${escapeHTML(backLabel)}</span>
          </a>

          <p class="page-hero__category" data-hero-intro>${icon(CATEGORY_ICONS[category] || "grid")}<span>${escapeHTML(t(`categories.${category}`))}</span></p>
          <h1 class="page-hero__title" id="page-title" data-hero-intro>${bidi(content.name || item.id)}</h1>
          <p class="page-hero__tagline" data-hero-intro>${bidi(content.tagline || "")}</p>

          <div class="page-hero__meta" data-hero-intro>
            <span class="badge badge--inline ${STATUS_CLASS[item.status] || "badge--soon"}">${escapeHTML(t(`status.${item.status}`))}</span>
            <span class="pill">${escapeHTML(audienceLabel(item))}</span>
          </div>

          ${heroActionsHTML(item)}
        </div>

        <div class="page-hero__media" data-hero-intro>
          <div class="frame">
            <div class="frame__bar" aria-hidden="true"><span></span><span></span><span></span></div>
            <div class="frame__screen">${previewHTML(item, content)}</div>
          </div>
        </div>
      </div>
    </section>`;
}

/** Categories whose demos are dashboards (explore data) rather than systems (enter data). */
const DASHBOARD_CATEGORIES = ["data", "monitoring"];

/** Buttons depend on what the visitor can do right now. */
function heroActionsHTML(item) {
  const quote = (label, style) =>
    `<a class="btn ${style}" href="${QUOTE_HREF}" data-quote="${escapeHTML(item.id)}">${escapeHTML(label)}</a>`;

  const external = (href, label, style) => `
    <a class="btn ${style}" href="${escapeHTML(href)}" target="_blank" rel="noopener">
      <span>${escapeHTML(label)}</span>${icon("external")}
      <span class="sr-only">${escapeHTML(t("common.newTab"))}</span>
    </a>`;

  let buttons = "";
  let note = "";

  const internal = (href, label, style) => `<a class="btn ${style}" href="${escapeHTML(href)}">${escapeHTML(label)}</a>`;

  if (item.type === "service") {
    const sample = (item.samples || []).find((s) => s.url);
    const sampleButton = !sample
      ? ""
      : isExternalUrl(sample.url)
        ? external(sample.url, t("services.sample"), "btn--ghost")
        : internal(sample.url, t("services.sample"), "btn--ghost");
    buttons = quote(t("product.quote"), "btn--primary") + sampleButton;
  } else if (item.status === "screenshots") {
    // Not published online (e.g. Power BI Desktop): the screenshots are the demo
    buttons = internal("#screenshots", t("product.seeScreenshots"), "btn--primary") + quote(t("product.quote"), "btn--ghost");
    note = localize(item.content)?.demoNote || t("product.screenshotsNote");
  } else if (item.status === "live-demo" && item.links?.demo) {
    buttons = external(item.links.demo, t("product.liveDemo"), "btn--primary") + quote(t("product.quote"), "btn--ghost");
    // A demo can explain how to try it ("demoNote" in its content);
    // otherwise: dashboards are for exploring data, systems for entering it
    note =
      localize(item.content)?.demoNote ||
      t(DASHBOARD_CATEGORIES.includes(item.category) ? "product.demoNoteDashboard" : "product.demoNote");
  } else {
    // No public demo yet: turn interest into a conversation
    buttons = quote(t("product.earlyDemo"), "btn--primary") + quote(t("product.quote"), "btn--ghost");
    note = t("product.soonNote");
  }

  // Demos are examples of what can be built, not products for sale: say so
  const callout =
    item.type === "service"
      ? ""
      : `<p class="demo-note" data-hero-intro>
           <span class="demo-note__tag" aria-hidden="true" dir="ltr">// demo</span>
           <span>${escapeHTML(t("product.demoCallout"))}</span>
         </p>`;

  return `
    <div class="page-hero__actions" data-hero-intro>${buttons}</div>
    ${note ? `<p class="page-hero__note" data-hero-intro>${escapeHTML(note)}</p>` : ""}
    ${callout}`;
}

/** Preview inside the frame: video loop > cover image > drawn placeholder. */
function previewHTML(item, content) {
  const media = item.media || {};
  if (media.previewVideo) {
    // Autoplay only for visitors who haven't asked for reduced motion;
    // they get a normal video with controls instead.
    const motion = prefersReducedMotion() ? "controls" : "autoplay";
    return `
      <video class="frame__video" src="${escapeHTML(media.previewVideo)}" ${media.cover ? `poster="${escapeHTML(media.cover)}"` : ""}
        muted loop playsinline preload="metadata" ${motion}
        aria-label="${escapeHTML(tf("product.previewLabel", { name: content.name || item.id }))}"></video>`;
  }
  return coverHTML(media.cover, item.category, { eager: true }) || coverPlaceholderHTML(item.category);
}

/** Pause the preview loop while it's off screen, to save battery and data. */
function setupPreview(root) {
  const video = root.querySelector(".frame__video[autoplay]");
  if (!video) return;
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) video.play().catch(() => {});
    else video.pause();
  });
  observer.observe(video);
}

/* --------------------------------------------------------------------------
   2. Overview
-------------------------------------------------------------------------- */

function overviewHTML(content) {
  if (!content.problem && !content.summary) return "";
  return `
    <section class="section section--tight" aria-labelledby="overview-problem">
      <div class="container overview">
        ${
          content.problem
            ? `<div class="overview__block">
                 <h2 class="overview__label" id="overview-problem">${escapeHTML(t("product.problemTitle"))}</h2>
                 <p class="overview__statement">${bidi(content.problem)}</p>
               </div>`
            : ""
        }
        <div class="overview__block">
          ${
            content.summary
              ? `<h2 class="overview__label">${escapeHTML(t("product.solutionTitle"))}</h2>
                 <p class="overview__text">${bidi(content.summary)}</p>`
              : ""
          }
          ${
            content.whoFor
              ? `<h2 class="overview__label overview__label--spaced">${escapeHTML(t("product.whoForTitle"))}</h2>
                 <p class="overview__text">${bidi(content.whoFor)}</p>`
              : ""
          }
        </div>
      </div>
    </section>`;
}

/* --------------------------------------------------------------------------
   3. Features
-------------------------------------------------------------------------- */

function featuresHTML(content) {
  const features = content.features || [];
  if (!features.length) return "";
  return `
    <section class="section section--tight" aria-labelledby="features-title">
      <div class="container">
        <header class="section__head">
          <h2 class="section__title" id="features-title">${escapeHTML(t("product.featuresTitle"))}</h2>
        </header>
        <ul class="features section__body">
          ${features
            .map(
              (feature) => `
            <li class="feature">
              <span class="feature__icon">${icon("check")}</span>
              <div>
                <h3 class="feature__title">${bidi(feature.title)}</h3>
                <p class="feature__text">${bidi(feature.text || "")}</p>
              </div>
            </li>`
            )
            .join("")}
        </ul>
      </div>
    </section>`;
}

/* --------------------------------------------------------------------------
   4. Demo video (YouTube)
   Only a thumbnail loads at first. The YouTube player (heavy, and sets
   cookies) loads only when the visitor presses play, and then uses
   youtube-nocookie.com with subtitles in the visitor's language.
-------------------------------------------------------------------------- */

function videoHTML(item, content) {
  const id = item.media?.youtubeId;
  if (!id) return "";
  const safeId = encodeURIComponent(id);
  return `
    <section class="section section--tight" aria-labelledby="video-title">
      <div class="container">
        <header class="section__head">
          <h2 class="section__title" id="video-title">${escapeHTML(t("product.videoTitle"))}</h2>
        </header>
        <div class="video section__body">
          <button class="video__facade" type="button" data-youtube="${safeId}">
            <img src="https://i.ytimg.com/vi/${safeId}/hqdefault.jpg" alt="" loading="lazy" />
            <span class="video__play">${icon("playSolid")}</span>
            <span class="sr-only">${escapeHTML(t("product.videoPlay"))}: ${escapeHTML(content.name || "")}</span>
          </button>
        </div>
      </div>
    </section>`;
}

function setupVideo(root, content) {
  const button = root.querySelector("[data-youtube]");
  if (!button) return;

  button.addEventListener("click", () => {
    const lang = CAPTION_LANG[getLanguage()] || "en";
    const params = new URLSearchParams({
      autoplay: "1",
      rel: "0",             // related videos from your own channel only
      cc_load_policy: "1",  // show subtitles
      cc_lang_pref: lang,   // ...in the visitor's language
      hl: lang,             // player interface language
    });

    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${button.dataset.youtube}?${params}`;
    iframe.title = tf("product.videoFrameTitle", { name: content.name || "" });
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.className = "video__frame";

    button.replaceWith(iframe);
    iframe.focus();
  });
}

/* --------------------------------------------------------------------------
   5. Screenshots
   Each entry in media.screenshots can be a plain path:
       "assets/products/dental/1.jpg"
   or a path with a caption in each language:
       { "src": "assets/products/dental/1.jpg",
         "caption": { "en": "Dental chart", "fa": "...", "ps": "..." } }
-------------------------------------------------------------------------- */

function normalizeScreenshots(list = []) {
  return list
    .map((entry) =>
      typeof entry === "string"
        ? { src: entry, caption: "" }
        : { src: entry?.src || "", caption: localize(entry?.caption) || "" }
    )
    .filter((shot) => shot.src);
}

function galleryHTML(screenshots) {
  if (!screenshots.length) return "";
  return `
    <section class="section section--tight" id="screenshots" aria-labelledby="gallery-title">
      <div class="container">
        <header class="section__head">
          <h2 class="section__title" id="gallery-title">${escapeHTML(t("product.galleryTitle"))}</h2>
        </header>
        <div class="gallery section__body">
          ${screenshots
            .map(
              (shot, index) => `
            <button class="shot" type="button" data-shot="${index}"
              aria-label="${escapeHTML(shot.caption || tf("gallery.open", { n: index + 1 }))}">
              <img src="${escapeHTML(shot.src)}" alt="" loading="lazy" decoding="async" />
            </button>`
            )
            .join("")}
        </div>
      </div>
    </section>`;
}

/* --------------------------------------------------------------------------
   6. Examples of my work (services)
-------------------------------------------------------------------------- */

function samplesHTML(item) {
  const samples = (item.samples || []).filter((sample) => sample.url);
  if (!samples.length) return "";
  return `
    <section class="section section--tight" aria-labelledby="samples-title">
      <div class="container">
        <header class="section__head">
          <h2 class="section__title" id="samples-title">${escapeHTML(t("product.samplesTitle"))}</h2>
        </header>
        <div class="samples section__body">
          ${samples
            .map((sample) => {
              const title = localize(sample.title) || "";
              const external = isExternalUrl(sample.url);
              return `
            <a class="sample" href="${escapeHTML(sample.url)}"${external ? ' target="_blank" rel="noopener"' : ""}>
              <div class="sample__media">${coverHTML(sample.image, item.category)}</div>
              <div class="sample__body">
                <span class="sample__title">${bidi(title)}</span>
                <span class="sample__open">${escapeHTML(t("product.sampleOpen"))}${external ? icon("external") : `<span class="icon-flip">${icon("arrowRight")}</span>`}</span>
              </div>
              ${external ? `<span class="sr-only">${escapeHTML(t("common.newTab"))}</span>` : ""}
            </a>`;
            })
            .join("")}
        </div>
      </div>
    </section>`;
}

/* --------------------------------------------------------------------------
   7. Under the hood (collapsed by default: most visitors don't need it)
-------------------------------------------------------------------------- */

function techHTML(item) {
  const stack = item.tech?.stack || [];
  const notes = localize(item.tech?.notes) || "";
  const repo = item.links?.repo;
  if (!stack.length && !notes && !repo) return "";

  return `
    <section class="section section--tight">
      <div class="container">
        <details class="tech">
          <summary class="tech__summary">
            <span>
              <span class="tech__title">${escapeHTML(t("product.techTitle"))}</span>
              <span class="tech__lead">${escapeHTML(t("product.techLead"))}</span>
            </span>
            <span class="faq__icon">${icon("plus")}</span>
          </summary>
          <div class="tech__body">
            ${stack.length ? `<ul class="tools__list">${stack.map((name) => `<li class="tools__item" dir="ltr">${escapeHTML(name)}</li>`).join("")}</ul>` : ""}
            ${notes ? `<p class="tech__notes">${bidi(notes)}</p>` : ""}
            ${
              repo
                ? `<a class="text-link tech__repo" href="${escapeHTML(repo)}" target="_blank" rel="noopener">
                     <span>${escapeHTML(t("product.repo"))}</span>${icon("external")}
                     <span class="sr-only">${escapeHTML(t("common.newTab"))}</span>
                   </a>`
                : ""
            }
          </div>
        </details>
      </div>
    </section>`;
}

/* --------------------------------------------------------------------------
   8. Call to action
-------------------------------------------------------------------------- */

function ctaHTML(item, content) {
  const name = content.name || item.id;
  const quote = `<a class="btn btn--primary" href="${QUOTE_HREF}" data-quote="${escapeHTML(item.id)}">${escapeHTML(t("product.quote"))}</a>`;
  // WhatsApp opens with a message that already names this product
  const direct = messageButtonsHTML({ message: tf("product.whatsappMessage", { name }), primary: false });

  return `
    <section class="section section--tight" aria-labelledby="cta-title">
      <div class="container">
        <div class="contact-cta">
          <div class="contact-cta__text">
            <h2 class="section__title" id="cta-title">${escapeHTML(t("product.ctaTitle"))}</h2>
            <p class="section__lead">${escapeHTML(t("product.ctaText"))}</p>
            <p class="contact-cta__note">${escapeHTML(t("contactCta.reply"))}</p>
          </div>
          <div class="contact-cta__actions">${quote}${direct}</div>
        </div>
      </div>
    </section>`;
}

/* --------------------------------------------------------------------------
   9. Related items: same type; same category first, then shared audience
-------------------------------------------------------------------------- */

function relatedHTML(item) {
  const shareAudience = (other) => (other.audience || []).some((a) => (item.audience || []).includes(a));

  const related = state.products
    .filter((other) => other.id !== item.id && other.type === item.type)
    .map((other) => ({
      other,
      score: (other.category === item.category ? 2 : 0) + (shareAudience(other) ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || (a.other.order ?? 999) - (b.other.order ?? 999))
    .slice(0, 3)
    .map(({ other }) => other);

  if (!related.length) return "";
  const title = t(item.type === "service" ? "product.relatedServicesTitle" : "product.relatedTitle");

  return `
    <section class="section section--tight" aria-labelledby="related-title">
      <div class="container">
        <header class="section__head">
          <h2 class="section__title" id="related-title">${escapeHTML(title)}</h2>
        </header>
        <div class="catalog-grid section__body">${related.map(cardHTML).join("")}</div>
      </div>
    </section>`;
}

/* --------------------------------------------------------------------------
   Not found (wrong or outdated ?id=)
-------------------------------------------------------------------------- */

function notFoundHTML() {
  return `
    <section class="page-hero page-hero--center">
      <div class="container not-found">
        <h1 class="page-hero__title">${escapeHTML(t("product.notFound.title"))}</h1>
        <p class="page-hero__tagline">${escapeHTML(t("product.notFound.text"))}</p>
        <a class="btn btn--primary" href="index.html#products">${escapeHTML(t("product.notFound.action"))}</a>
      </div>
    </section>`;
}

init();
