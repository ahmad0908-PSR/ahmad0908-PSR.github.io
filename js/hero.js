/* ==========================================================================
   hero.js: the rotating "Built for pharmacies / clinics / ..." line

   The sentence comes from i18n as a template with an {item} placeholder,
   because word order differs by language:
     English: "Built for {item}"
     Dari:    "ساخته شده برای {item}"
     Pashto:  "د {item} لپاره جوړ شوی"
   The text before and after {item} stays still; only {item} types itself.

   The typing works on whole characters, so Dari and Pashto letters join
   correctly as each one appears, just like typing on a keyboard.

   The typing PAUSES while the hero is off screen or the tab is hidden:
   changing text every few milliseconds makes the browser lay out the page
   again each time, which slowed down scrolling through the rest of the site.
   ========================================================================== */

import { t } from "./i18n.js";
import { prefersReducedMotion } from "./utils.js";

const TYPE_DELAY = 70;      // ms per character while typing
const DELETE_DELAY = 35;    // ms per character while deleting
const HOLD_DELAY = 1800;    // ms a finished word stays on screen
const NEXT_DELAY = 350;     // ms pause before typing the next word

export function initHero() {
  const beforeEl = document.getElementById("hero-for-before");
  const itemEl = document.getElementById("hero-for-item");
  const afterEl = document.getElementById("hero-for-after");
  const srEl = document.getElementById("hero-for-sr");
  if (!itemEl) return;

  let timer = null;
  let run = 0; // increases on every restart, so old loops stop themselves
  let visible = true;
  let pausedTick = null; // the step waiting to run when the hero is back

  const schedule = (tick, delay) => {
    timer = setTimeout(() => {
      if (!visible || document.hidden) {
        pausedTick = tick;
        return;
      }
      tick();
    }, delay);
  };
  const resume = () => {
    if (!pausedTick || !visible || document.hidden) return;
    const tick = pausedTick;
    pausedTick = null;
    tick();
  };

  const hero = document.getElementById("hero");
  if (hero) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    }).observe(hero);
  }
  document.addEventListener("visibilitychange", resume);

  function start() {
    clearTimeout(timer);
    pausedTick = null;
    const thisRun = ++run;

    const template = String(t("hero.forTemplate"));
    const items = toArray(t("hero.forItems"));
    const [before, after = ""] = template.split("{item}");

    beforeEl.textContent = before;
    afterEl.textContent = after;

    // Screen readers get the full sentence once, instead of the animation
    srEl.textContent = template.replace("{item}", items.join(String(t("hero.listSeparator"))));

    if (items.length === 0) return;
    if (prefersReducedMotion() || items.length === 1) {
      itemEl.textContent = items[0];
      return;
    }

    let index = 0;
    let length = 0;
    let deleting = false;

    const tick = () => {
      if (thisRun !== run) return; // a newer run has started

      const chars = Array.from(items[index]);

      if (!deleting) {
        length++;
        itemEl.textContent = chars.slice(0, length).join("");
        if (length >= chars.length) {
          deleting = true;
          schedule(tick, HOLD_DELAY);
          return;
        }
        schedule(tick, TYPE_DELAY);
      } else {
        length--;
        itemEl.textContent = chars.slice(0, length).join("");
        if (length <= 0) {
          deleting = false;
          index = (index + 1) % items.length;
          schedule(tick, NEXT_DELAY);
          return;
        }
        schedule(tick, DELETE_DELAY);
      }
    };

    itemEl.textContent = "";
    tick();
  }

  // Restart in the new language whenever the visitor switches
  document.addEventListener("aa:languagechange", start);
  start();
}

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}
