/* ==========================================================================
   state.js: data loaded once at startup, shared by every module.
   main.js fills this in; the other modules read from it instead of
   fetching the JSON files again.
   ========================================================================== */

export const state = {
  config: null,   // data/config.json
  products: [],   // data/products.json  ->  "items" (products AND services)
  faq: [],        // data/faq.json       ->  "items"
  testimonials: null, // data/testimonials.json (homepage only)
};
