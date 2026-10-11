/* ==========================================================================
   stack.js: the developer-flavored parts of the homepage
   - the "Tech stack" section (config.json "stack")
   - the little code editor in the hero (config.json "person.codeCard")

   Technology names stay in their original spelling in every language.
   ========================================================================== */

import { t } from "./i18n.js";
import { icon } from "./icons.js";
import { escapeHTML, bidi } from "./utils.js";
import { state } from "./state.js";

/** Accent color per group, in order (repeats if there are more groups). */
const TONES = ["teal", "mustard", "coral", "mint"];

export function initStack() {
  renderStack();
  renderCodeCard();
  document.addEventListener("aa:languagechange", renderStack);
}

function renderStack() {
  const container = document.getElementById("stack-list");
  if (!container) return;

  const groups = state.config?.stack?.groups || [];
  container.closest("section").hidden = groups.length === 0;

  container.innerHTML = groups
    .map((group, index) => {
      const items = (group.items || []).map(techChipHTML).join("");
      return `
        <article class="stack-card">
          <span class="tone-icon tone-icon--${TONES[index % TONES.length]}">${icon(group.icon || "code")}</span>
          <h3 class="stack-card__title">${bidi(t(`stack.groups.${group.id}`))}</h3>
          <ul class="stack-card__items">${items}</ul>
        </article>`;
    })
    .join("");

  attachIconFallbacks(container);
}

/* --------------------------------------------------------------------------
   One technology: logo + name.
   Logo sources, in order: "iconUrl" (any image), then "icon" (a Simple Icons
   slug, from cdn.simpleicons.org), else a colored badge with "badge" letters.
   If a logo can't load (offline, renamed icon), the badge replaces it, so a
   broken image is never shown.
-------------------------------------------------------------------------- */
const HEX = /^[0-9a-f]{3}([0-9a-f]{3})?$/i;

function techChipHTML(item) {
  // Plain strings still work: "Python"
  const tech = typeof item === "string" ? { name: item } : item || {};
  const name = String(tech.name || "");
  const color = HEX.test(tech.color || "") ? tech.color : "";
  const badgeText = tech.badge || initials(name);
  const badge = badgeHTML(badgeText, color);

  let src = "";
  if (/^https:\/\//.test(tech.iconUrl || "")) src = tech.iconUrl;
  else if (/^[a-z0-9]+$/i.test(tech.icon || "")) src = `https://cdn.simpleicons.org/${tech.icon}${color ? `/${color}` : ""}`;

  const logo = src
    ? `<img class="tech-chip__logo" src="${escapeHTML(src)}" alt="" width="18" height="18" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-badge="${escapeHTML(badgeText)}" data-color="${color}" />`
    : badge;

  return `<li class="tech-chip" dir="ltr"><span class="tech-chip__icon" aria-hidden="true">${logo}</span>${escapeHTML(name)}</li>`;
}

/** Colored square with letters; dark letters on light colors so they stay readable. */
function badgeHTML(text, color) {
  const hex = color || "24695C";
  return `<span class="tech-chip__badge" style="--badge:#${hex};--badge-ink:${isLight(hex) ? "#102A3A" : "#FFFFFF"}">${escapeHTML(text)}</span>`;
}

function isLight(hex) {
  const full = hex.length === 3 ? hex.replace(/./g, "$&$&") : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

function initials(name) {
  const words = name.split(/[\s.&-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

function attachIconFallbacks(root) {
  root.querySelectorAll(".tech-chip__logo").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        const holder = document.createElement("span");
        holder.innerHTML = badgeHTML(img.dataset.badge, img.dataset.color);
        img.replaceWith(holder.firstElementChild);
      },
      { once: true }
    );
  });
}

/* --------------------------------------------------------------------------
   Hero code card: a JavaScript object describing you, with simple syntax
   coloring. Built once (code reads the same in every language).
-------------------------------------------------------------------------- */
function renderCodeCard() {
  const code = document.getElementById("code-card-code");
  if (!code) return;

  const person = state.config?.person || {};
  const card = person.codeCard || {};
  const languages = state.config?.site?.languages || ["en", "fa", "ps"];

  const str = (value) => `<span class="tk-str">"${escapeHTML(value)}"</span>`;
  // Long lists wrap onto new lines (lined up under the first item), so the
  // card stays narrow
  const list = (name, values) => {
    const rows = [[]];
    let width = 0;
    values.forEach((value) => {
      const itemWidth = String(value).length + 4;
      if (rows.at(-1).length && width + itemWidth > 30) {
        rows.push([]);
        width = 0;
      }
      rows.at(-1).push(str(value));
      width += itemWidth;
    });
    const indent = " ".repeat(name.length + 5);
    return `[${rows.map((row) => row.join(", ")).join(`,\n${indent}`)}]`;
  };
  const prop = (name, value) => `  <span class="tk-prop">${name}</span>: ${value},`;
  const variable = String(card.file || "ahmad.js").replace(/\.\w+$/, "").replace(/[^\w$]/g, "") || "ahmad";

  const lines = [
    `<span class="tk-key">const</span> <span class="tk-var">${escapeHTML(variable)}</span> = {`,
    prop("role", str(card.role || "Full-stack developer")),
    prop("stack", list("stack", card.stack || [])),
    prop("speaks", list("speaks", languages)),
    prop("available", `<span class="tk-key">${person.available === false ? "false" : "true"}</span>`),
    `};<span class="hero__caret"></span>`,
  ];

  code.innerHTML = lines.join("\n");
  const file = document.getElementById("code-card-file");
  if (file && card.file) file.textContent = card.file;
}
