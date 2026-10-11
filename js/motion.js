/* ==========================================================================
   motion.js: all GSAP animation in one place

   The motion is deliberately limited to moments that mean something:
     1. Hero intro: one orchestrated entrance when the page loads (text,
        then the brush stroke sweeps in and the portrait rises onto it).
     2. Product and tech-stack cards: ease in the first time they scroll
        into view.
     3. Catalog filtering: cards glide into their new places (GSAP Flip).
     4. How it works: the progress line fills as you scroll, and each step
        lights up as the line reaches it.
     5. About stats: numbers count up once.

   Safety rules:
   - If GSAP didn't load, every function here quietly does nothing and the
     page still works and looks complete.
   - Visitors who ask their device for reduced motion get no animation
     (gsap.matchMedia handles this).
   - Text is never split into letters, so Dari and Pashto stay connected.
   ========================================================================== */

import { formatNumber } from "./i18n.js";
import { prefersReducedMotion } from "./utils.js";

const hasGsap = () => typeof window.gsap !== "undefined";

export function initMotion() {
  if (!hasGsap()) return;

  const { gsap, ScrollTrigger, Flip } = window;
  const plugins = [ScrollTrigger, Flip].filter(Boolean);
  if (plugins.length) gsap.registerPlugin(...plugins);

  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    heroIntro(gsap);
    if (ScrollTrigger) {
      cardsReveal(gsap, ScrollTrigger, "#catalog-grid .product-card");
      cardsReveal(gsap, ScrollTrigger, "#stack-list .stack-card");
      stepsProgress(gsap);
      countUp(gsap, ScrollTrigger);
    }
  });

  // Text length changes between languages, so trigger positions must be
  // measured again after a switch
  if (ScrollTrigger) {
    document.addEventListener("aa:languagechange", () => ScrollTrigger.refresh());
  }
}

/**
 * Animate a layout change (used by catalog filtering).
 * `change` must synchronously show/hide the elements.
 */
export function animateLayoutChange(targets, change) {
  const { gsap, Flip } = window;
  if (!gsap || !Flip || prefersReducedMotion()) {
    change();
    return;
  }

  const flipState = Flip.getState(targets);
  change();

  Flip.from(flipState, {
    duration: 0.55,
    ease: "power3.inOut",
    absolute: true,
    nested: true,
    onEnter: (elements) =>
      gsap.fromTo(elements, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power3.out" }),
    onLeave: (elements) => gsap.to(elements, { autoAlpha: 0, scale: 0.96, duration: 0.3 }),
    onComplete: () => window.ScrollTrigger?.refresh(),
  });
}

/* --------------------------------------------------------------------------
   1. Hero intro: status, headline, "Built for" line, lead, buttons
-------------------------------------------------------------------------- */
function heroIntro(gsap) {
  gsap.from("[data-hero-intro]", {
    y: 26,
    autoAlpha: 0,
    duration: 1,
    ease: "power3.out",
    stagger: 0.09,
    delay: 0.1,
    clearProps: "transform,opacity,visibility",
  });

  // Brush stroke sweeps in from one corner, then the portrait rises onto it
  gsap.from(".hero__brush", {
    autoAlpha: 0,
    scale: 0.85,
    rotate: -6,
    duration: 1.2,
    ease: "power3.out",
    delay: 0.2,
    clearProps: "transform,opacity,visibility",
  });
  gsap.from(".hero__portrait, .hero__placeholder", {
    y: 60,
    autoAlpha: 0,
    duration: 1.1,
    ease: "power3.out",
    delay: 0.45,
    clearProps: "transform,opacity,visibility",
  });
}

/* --------------------------------------------------------------------------
   2. Cards: ease in, in small groups, the first time they appear
-------------------------------------------------------------------------- */
function cardsReveal(gsap, ScrollTrigger, selector) {
  const cards = gsap.utils.toArray(selector);
  if (!cards.length) return;

  gsap.set(cards, { autoAlpha: 0, y: 28 });
  ScrollTrigger.batch(cards, {
    start: "top 90%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.07,
        clearProps: "transform,opacity,visibility",
      }),
  });
}

/* --------------------------------------------------------------------------
   4. How it works: progress line + steps lighting up.
   The line's length is the CSS variable --progress (0 to 1), so the same
   animation works for the horizontal (desktop) and vertical (phone) layout,
   and in both reading directions.
-------------------------------------------------------------------------- */
function stepsProgress(gsap) {
  const container = document.getElementById("how-steps");
  if (!container) return;

  const steps = Array.from(container.querySelectorAll(".step"));
  const last = Math.max(steps.length - 1, 1);
  container.classList.add("steps--animated");

  const markReached = (progress) => {
    steps.forEach((step, index) => {
      step.classList.toggle("is-reached", progress >= index / last - 0.02);
    });
  };

  gsap.fromTo(
    container,
    { "--progress": 0 },
    {
      "--progress": 1,
      ease: "none",
      scrollTrigger: {
        trigger: container,
        start: "top 72%",
        end: "bottom 55%",
        scrub: 0.6,
        onUpdate: (self) => markReached(self.progress),
        onRefresh: (self) => markReached(self.progress),
      },
    }
  );

  // Undo when the visitor switches to reduced motion mid-visit
  return () => {
    container.classList.remove("steps--animated");
    steps.forEach((step) => step.classList.remove("is-reached"));
  };
}

/* --------------------------------------------------------------------------
   5. Stats: count up from zero, once
-------------------------------------------------------------------------- */
function countUp(gsap, ScrollTrigger) {
  const statsBlock = document.getElementById("about-stats");
  if (!statsBlock) return;

  ScrollTrigger.create({
    trigger: statsBlock,
    start: "top 85%",
    once: true,
    onEnter: () => {
      statsBlock.querySelectorAll("[data-stat]").forEach((node) => {
        const end = Number(node.dataset.value) || 0;
        const counter = { value: 0 };
        gsap.to(counter, {
          value: end,
          duration: 1.4,
          ease: "power2.out",
          onUpdate: () => {
            node.textContent = formatNumber(Math.round(counter.value));
          },
        });
      });
    },
  });
}
