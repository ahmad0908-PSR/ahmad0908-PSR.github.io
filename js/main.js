/* ==========================================================================
   main.js: entry point for the HOMEPAGE (index.html)

   Shared startup (theme, data, footer, language, navigation) happens in
   common.js. This file then starts the homepage's own sections, and the
   particle background and animation last, once the layout is final.
   ========================================================================== */

import { bootstrap } from "./common.js";
import { initHero } from "./hero.js";
import { initParticles } from "./particles.js";
import { initCatalog } from "./catalog.js";
import { initServices } from "./services.js";
import { initSections, renderAboutPhoto, renderHeroPhoto } from "./sections.js";
import { initStack } from "./stack.js";
import { initTestimonials } from "./testimonials.js";
import { initQuoteForm } from "./quote-form.js";
import { initMotion } from "./motion.js";
import { state } from "./state.js";
import { loadJSON } from "./utils.js";

async function init() {
  // The photos carry data-i18n attributes, so they're added before the
  // first translation pass
  const [ready, testimonials] = await Promise.all([
    bootstrap({
      loadFaq: true,
      beforeLanguage: () => {
        renderHeroPhoto();
        renderAboutPhoto();
      },
    }),
    // Optional file: if it's missing, the testimonials section just stays hidden
    loadJSON("data/testimonials.json").catch(() => null),
  ]);
  if (!ready) return;
  state.testimonials = testimonials;

  initHero();
  initStack();
  initCatalog();
  initServices();
  initSections();
  initTestimonials();
  initQuoteForm();

  initParticles(document.getElementById("hero-canvas"), state.config.particles);
  initMotion();

  console.info(`[site] Ready: ${state.products.length} products and services loaded.`);
}

init();
