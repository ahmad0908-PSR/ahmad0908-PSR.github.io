/* ==========================================================================
   gallery.js: full-screen screenshot viewer (the <dialog id="lightbox">
   in product.html)

   - Click a screenshot to open it large.
   - Previous / next with the buttons, the keyboard arrows, or a swipe.
     Directions follow the reading direction: in Dari and Pashto, "next"
     is to the LEFT, just like turning pages in a Persian-script book.
   - Escape or a click on the dark backdrop closes it, and focus returns
     to the screenshot that was opened.
   ========================================================================== */

import { tf, getDirection } from "./i18n.js";

const SWIPE_DISTANCE = 50; // px a finger must travel to count as a swipe

let images = [];   // [{ src, caption }]
let current = 0;
let opener = null; // the element to return focus to
let el = null;     // cached dialog elements, set up once

/**
 * Connect the screenshot buttons inside `root` to the viewer.
 * Buttons must carry data-shot="<index>".
 */
export function setupGallery(root, list) {
  images = list;
  if (!images.length) return;
  ensureViewer();

  root.querySelectorAll("[data-shot]").forEach((button) => {
    button.addEventListener("click", () => {
      opener = button;
      open(Number(button.dataset.shot));
    });
  });
}

/* --------------------------------------------------------------------------
   Viewer
-------------------------------------------------------------------------- */

function ensureViewer() {
  if (el) return;
  const dialog = document.getElementById("lightbox");
  if (!dialog) return;

  el = {
    dialog,
    img: document.getElementById("lightbox-img"),
    caption: document.getElementById("lightbox-caption"),
    counter: document.getElementById("lightbox-counter"),
    controls: document.getElementById("lightbox-controls"),
  };

  // Buttons
  dialog.addEventListener("click", (event) => {
    const action = event.target.closest("[data-lightbox]")?.dataset.lightbox;
    if (action === "close") close();
    else if (action === "next") step(1);
    else if (action === "prev") step(-1);
    // A click on the dialog itself (not its content) is a click on the backdrop
    else if (event.target === dialog) close();
  });

  // Keyboard arrows, mirrored for right-to-left languages
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const forward = getDirection() === "rtl" ? "ArrowLeft" : "ArrowRight";
    step(event.key === forward ? 1 : -1);
  });

  // Swipe (touch or pen)
  let startX = null;
  dialog.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") startX = event.clientX;
  });
  dialog.addEventListener("pointerup", (event) => {
    if (startX === null) return;
    const distance = event.clientX - startX;
    startX = null;
    if (Math.abs(distance) < SWIPE_DISTANCE) return;
    // LTR: swipe left = next. RTL: swipe right = next.
    const swipedLeft = distance < 0;
    const next = getDirection() === "rtl" ? !swipedLeft : swipedLeft;
    step(next ? 1 : -1);
  });

  // Return focus to the screenshot that opened the viewer
  dialog.addEventListener("close", () => opener?.focus());
}

function open(index) {
  if (!el) return;
  show(index);
  if (!el.dialog.open) el.dialog.showModal();
}

function close() {
  el?.dialog.close();
}

function step(delta) {
  show(current + delta);
}

function show(index) {
  const total = images.length;
  current = (index + total) % total; // wraps around at both ends
  const { src, caption } = images[current];

  el.img.src = src;
  el.img.alt = caption || tf("gallery.counter", { n: current + 1, total });
  el.caption.textContent = caption || "";
  el.caption.hidden = !caption;
  el.counter.textContent = tf("gallery.counter", { n: current + 1, total });
  el.controls.hidden = total < 2;

  // Preload the neighbours so next / previous feel instant
  [current + 1, current - 1].forEach((i) => {
    const neighbour = images[(i + total) % total];
    if (neighbour) new Image().src = neighbour.src;
  });
}
