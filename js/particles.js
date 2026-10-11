/* ==========================================================================
   particles.js: animated network background for the hero

   Fixes compared to the previous version:
   - Reduced motion is actually respected: one still frame, no loop.
   - The animation PAUSES when the hero is scrolled out of view or the
     browser tab is hidden, so it doesn't drain phone batteries.
   - Colors are read once (and again on theme change), not every frame.
   - Resizing is debounced, and particles are only recreated when the WIDTH
     changes, so the mobile address bar showing/hiding doesn't reset them.
   - Sharp on high-resolution screens (device pixel ratio, capped at 2).
   - Particle count scales with screen size: fewer on phones.

   Settings come from "particles" in data/config.json.
   Color comes from the --particle-rgb CSS variable in style.css.
   ========================================================================== */

import { debounce, prefersReducedMotion } from "./utils.js";

const DEFAULTS = {
  maxCount: 90,       // upper limit on large screens
  minCount: 28,       // lower limit on small screens
  density: 13000,     // one particle per this many square pixels
  linkDistance: 140,  // max distance (px) for a connecting line
  speed: 0.35,        // movement speed
  pointerLinks: true, // draw lines to the mouse pointer (desktop only)
};

export function initParticles(canvas, options = {}) {
  if (!canvas) return null;

  const settings = { ...DEFAULTS, ...options };
  const ctx = canvas.getContext("2d");
  const host = canvas.parentElement;
  const reduceMotion = prefersReducedMotion();

  let particles = [];
  let width = 0;
  let height = 0;
  let lastWidth = 0;
  let rafId = null;
  let inView = true;
  let rgb = readParticleColor();
  const pointer = { x: 0, y: 0, active: false };

  /* ---- Setup ---------------------------------------------------------- */

  function readParticleColor() {
    return (
      getComputedStyle(document.documentElement).getPropertyValue("--particle-rgb").trim() ||
      "45, 212, 191"
    );
  }

  function resizeCanvas() {
    const rect = host.getBoundingClientRect();
    width = rect.width;
    height = rect.height;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createParticles() {
    const byArea = Math.round((width * height) / settings.density);
    const count = Math.max(settings.minCount, Math.min(settings.maxCount, byArea));

    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * settings.speed,
      vy: (Math.random() - 0.5) * settings.speed,
      r: Math.random() * 1.4 + 0.8,
    }));
    lastWidth = width;
  }

  /* ---- Each frame ----------------------------------------------------- */

  function update() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Bounce off the edges (and clamp, in case the canvas just shrank)
      if (p.x < 0 || p.x > width) {
        p.vx *= -1;
        p.x = Math.max(0, Math.min(width, p.x));
      }
      if (p.y < 0 || p.y > height) {
        p.vy *= -1;
        p.y = Math.max(0, Math.min(height, p.y));
      }
    }
  }

  /*
   * Speed: instead of one stroke() per line (hundreds per frame), lines are
   * sorted into a few opacity "buckets" and each bucket is drawn with a
   * single stroke(). All dots are filled with a single fill().
   */
  const BUCKETS = 6;

  function strokeBuckets(buckets, maxAlpha) {
    buckets.forEach((path, index) => {
      if (!path) return;
      ctx.strokeStyle = `rgba(${rgb}, ${(((index + 0.5) / BUCKETS) * maxAlpha).toFixed(3)})`;
      ctx.stroke(path);
    });
  }

  function addLine(buckets, strength, x1, y1, x2, y2) {
    const index = Math.min(BUCKETS - 1, Math.floor(strength * BUCKETS));
    const path = buckets[index] || (buckets[index] = new Path2D());
    path.moveTo(x1, y1);
    path.lineTo(x2, y2);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const maxDist = settings.linkDistance;
    const maxDistSq = maxDist * maxDist;
    ctx.lineWidth = 1;

    // Lines between nearby particles (squared distance avoids a sqrt
    // for every pair that is too far apart anyway)
    const lines = new Array(BUCKETS);
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < maxDistSq) {
          addLine(lines, 1 - Math.sqrt(distSq) / maxDist, a.x, a.y, b.x, b.y);
        }
      }
    }
    strokeBuckets(lines, 0.42);

    // Lines from the mouse pointer to nearby particles
    if (pointer.active) {
      const reach = maxDist * 1.3;
      const reachSq = reach * reach;
      const pointerLines = new Array(BUCKETS);
      for (const p of particles) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < reachSq) {
          addLine(pointerLines, 1 - Math.sqrt(distSq) / reach, pointer.x, pointer.y, p.x, p.y);
        }
      }
      strokeBuckets(pointerLines, 0.55);
    }

    // Dots on top of the lines
    const dots = new Path2D();
    for (const p of particles) {
      dots.moveTo(p.x + p.r, p.y);
      dots.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    }
    ctx.fillStyle = `rgba(${rgb}, 0.9)`;
    ctx.fill(dots);
  }

  function frame() {
    update();
    draw();
    rafId = requestAnimationFrame(frame);
  }

  /* ---- Start / stop --------------------------------------------------- */

  function start() {
    if (reduceMotion || rafId !== null || !inView || document.hidden) return;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  /* ---- Events --------------------------------------------------------- */

  // Pause when the hero leaves the screen, resume when it comes back
  const observer = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      inView ? start() : stop();
    },
    { threshold: 0 }
  );
  observer.observe(host);

  // Pause when the browser tab is in the background
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });

  // Resize: keep particles unless the width actually changed
  window.addEventListener(
    "resize",
    debounce(() => {
      resizeCanvas();
      if (Math.abs(width - lastWidth) > 40) createParticles();
      if (rafId === null) draw();
    }, 200)
  );

  // New theme = new particle color
  document.addEventListener("aa:themechange", () => {
    rgb = readParticleColor();
    if (rafId === null) draw();
  });

  // Mouse pointer lines (skipped for touch, and for reduced motion)
  if (settings.pointerLinks && !reduceMotion) {
    host.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    });
    host.addEventListener("pointerleave", () => {
      pointer.active = false;
    });
  }

  /* ---- Go ------------------------------------------------------------- */
  resizeCanvas();
  createParticles();
  draw();   // always draw one frame (this is all reduced-motion users get)
  start();

  return { start, stop };
}
