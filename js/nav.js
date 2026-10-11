/* ==========================================================================
   nav.js: navigation behavior
   - Solid nav background after scrolling
   - Mobile menu open / close (burger, link click, Escape key, resize)
   - Language buttons (desktop + mobile)
   - Highlights the nav link of the section currently on screen
   ========================================================================== */

import { t, getLanguage } from "./i18n.js";

const DESKTOP_BREAKPOINT = 960;

export function initNav({ onLanguageSelect }) {
  const navWrap = document.getElementById("nav-wrap");
  const burger = document.getElementById("nav-burger");
  const menu = document.getElementById("mobile-menu");

  /* ---- Solid background on scroll ------------------------------------- */
  let ticking = false;
  const updateScrolled = () => {
    navWrap.classList.toggle("is-scrolled", window.scrollY > 12);
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateScrolled);
      }
    },
    { passive: true }
  );
  updateScrolled();

  /* ---- Mobile menu ---------------------------------------------------- */
  const setMenuOpen = (open) => {
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", String(!open));
    menu.inert = !open; // keeps hidden links out of keyboard tab order
    navWrap.classList.toggle("is-menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", t(open ? "nav.menuClose" : "nav.menuOpen"));
  };
  const isMenuOpen = () => burger.getAttribute("aria-expanded") === "true";

  burger.addEventListener("click", () => setMenuOpen(!isMenuOpen()));

  // Close after choosing a link
  menu.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => setMenuOpen(false))
  );

  // Close with Escape and return focus to the burger
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isMenuOpen()) {
      setMenuOpen(false);
      burger.focus();
    }
  });

  // Close if the window grows to desktop size
  window.addEventListener("resize", () => {
    if (window.innerWidth > DESKTOP_BREAKPOINT && isMenuOpen()) setMenuOpen(false);
  });

  /* ---- Language buttons ------------------------------------------------ */
  const langButtons = document.querySelectorAll("[data-lang]");

  const syncLangButtons = () => {
    const current = getLanguage();
    langButtons.forEach((btn) =>
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === current))
    );
  };

  langButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      if (btn.dataset.lang !== getLanguage()) onLanguageSelect(btn.dataset.lang);
    })
  );

  document.addEventListener("aa:languagechange", () => {
    syncLangButtons();
    // keep the burger label in the current language
    burger.setAttribute("aria-label", t(isMenuOpen() ? "nav.menuClose" : "nav.menuOpen"));
  });
  syncLangButtons();
  burger.setAttribute("aria-label", t("nav.menuOpen"));

  /* ---- Highlight the section on screen -------------------------------- */
  const navLinks = Array.from(document.querySelectorAll(".nav__links a[href^='#']"));

  // Watch EVERY section, not just the linked ones: when a section without a
  // nav link (hero, paths, about, FAQ) is on screen, no link is highlighted.
  const sections = Array.from(document.querySelectorAll("main section[id]"));

  if (sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = `#${entry.target.id}`;
          navLinks.forEach((link) => {
            const active = link.getAttribute("href") === id;
            link.classList.toggle("is-active", active);
            if (active) link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
          });
        });
      },
      // A section counts as "current" when it crosses the middle of the screen
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
  }
}
