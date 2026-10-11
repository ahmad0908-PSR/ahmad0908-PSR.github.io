/* ==========================================================================
   testimonials.js: the "What clients say" carousel (data/testimonials.json)

   - The section stays hidden until there's at least one testimonial.
     While "items" is empty and "showExamples" is true, clearly-marked
     example cards are shown instead, so the design can be previewed.
   - It's a native horizontal scroller with scroll snapping: swipe on
     phones, arrow buttons everywhere. The card nearest the middle is the
     "active" one (bigger, full color); the others fade back.
   - Moving between cards scrolls ONLY the track, by the distance between
     the card's center and the track's center, so it works the same in
     left-to-right and right-to-left pages and never moves the page itself.
   ========================================================================== */

import { t, tf, localize } from "./i18n.js";
import { escapeHTML, bidi, debounce, prefersReducedMotion } from "./utils.js";
import { state } from "./state.js";

/** Avatar colors for cards without a photo, in order. */
const TONES = ["teal", "mustard", "coral", "mint"];

let activeIndex = 0;

export function initTestimonials() {
  const section = document.getElementById("testimonials");
  const track = document.getElementById("quotes-track");
  if (!section || !track) return;

  const { list, examples } = getTestimonials();
  if (!list.length) return; // section stays hidden
  section.hidden = false;

  const prev = document.getElementById("quotes-prev");
  const next = document.getElementById("quotes-next");
  document.getElementById("quotes-controls").hidden = list.length < 2;

  const render = () => {
    track.innerHTML = list.map((item, index) => quoteHTML(item, index, list.length, examples)).join("");
    attachAvatarFallbacks(track);
    updateActive(track, prev, next);
  };

  prev.addEventListener("click", () => goTo(track, activeIndex - 1));
  next.addEventListener("click", () => goTo(track, activeIndex + 1));
  track.addEventListener("scroll", debounce(() => updateActive(track, prev, next), 60), { passive: true });
  // Re-center after a real width change only (on phones, the address bar
  // showing or hiding also fires "resize", with the same width)
  let lastWidth = window.innerWidth;
  window.addEventListener(
    "resize",
    debounce(() => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      goTo(track, activeIndex, false);
    }, 200)
  );

  document.addEventListener("aa:languagechange", () => {
    render();
    // The page direction may have flipped: re-center the current card
    requestAnimationFrame(() => goTo(track, activeIndex, false));
  });

  render();
}

function getTestimonials() {
  const data = state.testimonials || {};
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length) return { list: items, examples: false };
  const examples = data.showExamples === true && Array.isArray(data.examples) ? data.examples : [];
  return { list: examples, examples: true };
}

function quoteHTML(item, index, total, isExample) {
  const quote = localize(item.quote) || "";
  const role = localize(item.role) || "";
  const org = item.organization || "";
  const subtitle = [role, org].filter(Boolean).join(", ");
  const tone = TONES[index % TONES.length];

  const avatar = item.photo
    ? `<img src="${escapeHTML(item.photo)}" alt="" loading="lazy" decoding="async" />`
    : "";

  return `
    <li class="quote" aria-roledescription="slide" aria-label="${escapeHTML(tf("testimonials.slide", { n: index + 1, total }))}">
      <figure class="quote__card">
        <span class="quote__avatar tone-icon--${tone}" aria-hidden="true">
          <span class="quote__initials">${escapeHTML(initials(item.name))}</span>${avatar}
        </span>
        ${isExample ? `<span class="quote__example">${escapeHTML(t("testimonials.example"))}</span>` : ""}
        <blockquote class="quote__text"><p>${bidi(quote)}</p></blockquote>
        <figcaption class="quote__by">
          <span class="quote__name">${bidi(item.name || "")}</span>
          ${subtitle ? `<span class="quote__role">${bidi(subtitle)}</span>` : ""}
        </figcaption>
      </figure>
    </li>`;
}

function initials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] || "")
    .join("")
    .toUpperCase();
}

/** A missing photo is removed, so the initials underneath show instead. */
function attachAvatarFallbacks(root) {
  root.querySelectorAll(".quote__avatar img").forEach((img) =>
    img.addEventListener("error", () => img.remove(), { once: true })
  );
}

function goTo(track, index, smooth = true) {
  const cards = track.children;
  if (!cards.length) return;
  const target = cards[Math.max(0, Math.min(cards.length - 1, index))];
  const card = target.getBoundingClientRect();
  const box = track.getBoundingClientRect();
  track.scrollBy({
    left: card.left + card.width / 2 - (box.left + box.width / 2),
    behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto",
  });
}

/** The card whose center is closest to the track's center is active. */
function updateActive(track, prev, next) {
  const cards = Array.from(track.children);
  if (!cards.length) return;

  const box = track.getBoundingClientRect();
  const middle = box.left + box.width / 2;
  let best = 0;
  let bestDistance = Infinity;
  cards.forEach((card, index) => {
    const rect = card.getBoundingClientRect();
    const distance = Math.abs(rect.left + rect.width / 2 - middle);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });

  activeIndex = best;
  cards.forEach((card, index) => card.classList.toggle("is-active", index === best));
  prev.disabled = best === 0;
  next.disabled = best === cards.length - 1;
}
