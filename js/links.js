/* ==========================================================================
   links.js: every contact and social link on the site, built from
   data/config.json ("contact" and "social").

   Used by:
   - the footer (all channels, as round icon buttons)
   - the homepage contact section and product pages (WhatsApp, Telegram,
     Email as labelled buttons)

   PREVIEW MODE ("social.previewMode": true in config.json)
   While you're still collecting your links, buttons with an empty link are
   shown anyway, so you can see the design. They're marked "Link coming
   soon" and clicking them does nothing. Set previewMode to false before
   launch: any channel still without a link then disappears completely.
   ========================================================================== */

import { t } from "./i18n.js";
import { icon } from "./icons.js";
import { escapeHTML } from "./utils.js";
import { state } from "./state.js";

const digitsOnly = (value) => String(value || "").replace(/[^\d]/g, "");

/**
 * How each channel turns the value in config.json into a link.
 * Returns null when the value isn't usable yet.
 */
const CHANNELS = {
  email: {
    source: "contact",
    external: false,
    href: (value) => (/@/.test(value) ? `mailto:${value}` : null),
  },
  whatsapp: {
    source: "contact",
    // Full international number, digits only: 93700000000
    href: (value, message) => {
      const number = digitsOnly(value);
      if (number.length < 8) return null;
      return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
    },
  },
  telegram: {
    source: "contact",
    // A username ("ahmadakbary"), "@ahmadakbary", or a full t.me link
    href: (value) => {
      const username = String(value || "").trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//i, "");
      return /^[A-Za-z0-9_]{5,32}$/.test(username) ? `https://t.me/${username}` : null;
    },
  },
  facebook: { source: "social", href: httpsOnly },
  instagram: { source: "social", href: httpsOnly },
  x: { source: "social", href: httpsOnly },
  linkedin: { source: "social", href: httpsOnly },
  github: { source: "social", href: httpsOnly },
};

function httpsOnly(value) {
  const url = String(value || "").trim();
  return url.startsWith("https://") ? url : null;
}

/** Order of the round buttons in the footer. */
const FOOTER_CHANNELS = ["whatsapp", "telegram", "email", "facebook", "instagram", "x", "linkedin", "github"];

const isPreviewMode = () => state.config?.social?.previewMode === true;

/**
 * The link for one channel:
 *   { key, href }                     ready to use
 *   { key, href: null, placeholder }  empty, but shown because of preview mode
 *   null                              hidden
 */
export function getChannel(key, message) {
  const channel = CHANNELS[key];
  if (!channel) return null;
  const value = state.config?.[channel.source]?.[key];
  const href = channel.href(value, message);
  if (href) return { key, href, external: channel.external !== false };
  return isPreviewMode() ? { key, href: null, placeholder: true } : null;
}

/** Shared attributes for a link (real or placeholder). */
function linkAttributes(link) {
  if (link.placeholder) {
    return `href="#" data-placeholder aria-disabled="true" title="${escapeHTML(t("social.soon"))}"`;
  }
  return `href="${escapeHTML(link.href)}"${link.external ? ' target="_blank" rel="noopener"' : ""}`;
}

/**
 * Labelled buttons for direct messages (contact section, product pages).
 * `message` pre-fills the WhatsApp chat. The first available channel gets
 * the primary (filled) style.
 */
export function messageButtonsHTML({ message = "", primary = true } = {}) {
  const buttonText = {
    whatsapp: t("contactCta.whatsapp"),
    telegram: t("contactCta.telegram"),
    email: t("contactCta.email"),
  };

  return ["whatsapp", "telegram", "email"]
    .map((key) => getChannel(key, key === "whatsapp" ? message : ""))
    .filter(Boolean)
    .map((link, index) => {
      const style = primary && index === 0 && !link.placeholder ? "btn--primary" : "btn--ghost";
      const newTab = link.external && !link.placeholder ? `<span class="sr-only">${escapeHTML(t("common.newTab"))}</span>` : "";
      return `
        <a class="btn ${style}${link.placeholder ? " is-placeholder" : ""}" ${linkAttributes(link)}>
          ${icon(link.key)}<span>${escapeHTML(buttonText[link.key])}</span>${newTab}
        </a>`;
    })
    .join("");
}

/** Round icon buttons for the footer. */
export function renderFooterLinks() {
  const list = document.getElementById("footer-links");
  if (!list) return;

  list.innerHTML = FOOTER_CHANNELS.map((key) => getChannel(key))
    .filter(Boolean)
    .map((link) => {
      const label = t(`contact.${link.key}`);
      const title = link.placeholder ? `${label}: ${t("social.soon")}` : label;
      return `
        <li>
          <a class="social-btn${link.placeholder ? " is-placeholder" : ""}" ${linkAttributes(link)}
             aria-label="${escapeHTML(title)}" title="${escapeHTML(title)}">${icon(link.key)}</a>
        </li>`;
    })
    .join("");
}

/** Placeholder links (preview mode) must never navigate. Set up once. */
export function initPlaceholderLinks() {
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-placeholder]")) event.preventDefault();
  });
  // Footer labels are built with t(), so rebuild them in the new language
  document.addEventListener("aa:languagechange", renderFooterLinks);
}
