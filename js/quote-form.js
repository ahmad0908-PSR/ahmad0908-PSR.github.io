/* ==========================================================================
   quote-form.js: the "Request a quote" form in the homepage contact section

   What it does:
   - Fills the "What are you interested in?" list from products.json.
   - Pre-selects the item a visitor clicked "Request a quote" on (from any
     page), or from ?item=<id> in the URL, so you can share a link like
     index.html?item=pharmacy-pos#contact
   - Validates with clear messages in the visitor's language, and accepts
     phone numbers typed with Persian digits (۰۷۰۰...).
   - Saves an unsent draft in the browser, so nothing is lost if the
     connection drops or the page is closed by accident.
   - Sends the request to your Google Apps Script (see
     google-apps-script/Code.gs), which adds it to your Google Sheet and
     emails you.
   - If no Apps Script address is set yet in config.json, it opens the
     visitor's email app with the request ready to send instead.

   Spam protection: a hidden "website" field that only bots fill in, and a
   minimum time on the page before sending. Both make the form pretend it
   succeeded, so bots learn nothing.
   ========================================================================== */

import { t, tf, localize, getLanguage } from "./i18n.js";
import { escapeHTML } from "./utils.js";
import { state } from "./state.js";

const QUOTE_KEY = "aa-quote-item";    // set by "Request a quote" links (sections.js)
const DRAFT_KEY = "aa-quote-draft";   // unsent draft in this browser
const DRAFT_MAX_AGE_DAYS = 14;
const MIN_FILL_MS = 3000;             // faster than this = almost certainly a bot
const MIN_MESSAGE_LENGTH = 15;
const REQUEST_TIMEOUT_MS = 20000;
const OTHER_ITEM = "other";

const el = {};
let startedAt = Date.now();
let attempted = false;      // after the first submit, errors update as you type
let sending = false;
let shownErrors = {};       // field -> i18n key, so errors re-translate
let statusKey = null;       // i18n key of the message under the button
let successName = null;     // name shown in the thank-you message

export function initQuoteForm() {
  el.form = document.getElementById("quote-form");
  if (!el.form) return;

  el.success = document.getElementById("quote-success");
  el.successTitle = document.getElementById("quote-success-title");
  el.successText = document.getElementById("quote-success-text");
  el.again = document.getElementById("quote-again");
  el.item = document.getElementById("q-item");
  el.submit = document.getElementById("q-submit");
  el.submitLabel = document.getElementById("q-submit-label");
  el.status = document.getElementById("q-status");

  populateItems();
  restoreDraft();
  applyPreselection();

  el.form.addEventListener("submit", handleSubmit);
  el.form.addEventListener("input", onInput);
  el.form.addEventListener("change", onInput);
  el.again.addEventListener("click", resetForm);

  // "Request a quote" clicked on this same page (e.g. a service row):
  // select that item right away
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-quote]");
    if (link) selectItem(link.dataset.quote);
  });

  document.addEventListener("aa:languagechange", retranslate);
}

/* --------------------------------------------------------------------------
   "What are you interested in?" list
-------------------------------------------------------------------------- */

function populateItems() {
  const selected = el.item.value;
  const byType = (type) =>
    state.products
      .filter((item) => item.type === type)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .map((item) => `<option value="${escapeHTML(item.id)}">${escapeHTML(itemName(item))}</option>`)
      .join("");

  el.item.innerHTML = `
    <option value="${OTHER_ITEM}">${escapeHTML(t("quote.itemOther"))}</option>
    <optgroup label="${escapeHTML(t("quote.itemProducts"))}">${byType("product")}</optgroup>
    <optgroup label="${escapeHTML(t("quote.itemServices"))}">${byType("service")}</optgroup>`;

  if (selected) el.item.value = selected;
}

function itemName(item, lang) {
  const content = lang ? item.content?.[lang] || item.content?.en : localize(item.content);
  return content?.name || item.id;
}

/** Select an item and match the "This is for" choice to its audience. */
function selectItem(id) {
  const item = state.products.find((entry) => entry.id === id);
  if (!item) return;
  el.item.value = id;

  const audience = item.audience || [];
  if (audience.length === 1) {
    const radio = el.form.querySelector(`input[name="audience"][value="${audience[0]}"]`);
    if (radio) radio.checked = true;
  }
  saveDraft();
}

/** From ?item= in the URL, or the item clicked on another page. */
function applyPreselection() {
  let id = new URLSearchParams(window.location.search).get("item");
  try {
    id = id || sessionStorage.getItem(QUOTE_KEY);
    sessionStorage.removeItem(QUOTE_KEY); // use it once
  } catch {
    /* ignore */
  }
  if (id) selectItem(id);
}

/* --------------------------------------------------------------------------
   Reading and checking the fields
-------------------------------------------------------------------------- */

/** Turn Persian (۰-۹) and Arabic (٠-٩) digits into 0-9. */
function normalizeDigits(value) {
  return value
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

function readValues() {
  const data = new FormData(el.form);
  const get = (name) => String(data.get(name) || "").trim();
  return {
    name: get("name"),
    organization: get("organization"),
    audience: get("audience") || "business",
    email: normalizeDigits(get("email")),
    phone: normalizeDigits(get("phone")).replace(/[\s\-().]/g, ""),
    // The field is named "interest", not "item": form.elements.item is a
    // built-in method, so a field called "item" can't be reached by name.
    item: get("interest") || OTHER_ITEM,
    message: get("message"),
    website: get("website"), // spam trap
  };
}

/** Returns { fieldName: i18nKey } for every problem found. */
function validate(values) {
  const errors = {};

  if (values.name.length < 2) errors.name = "quote.errors.name";

  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) {
    errors.email = "quote.errors.email";
  }
  if (values.phone && !/^\+?\d{7,15}$/.test(values.phone)) {
    errors.phone = "quote.errors.phone";
  }
  if (!values.email && !values.phone) {
    errors.email = "quote.errors.contactOne";
    errors.phone = "quote.errors.contactOne";
  }

  if (values.message.length < MIN_MESSAGE_LENGTH) errors.message = "quote.errors.message";

  return errors;
}

/* --------------------------------------------------------------------------
   Showing errors and status
-------------------------------------------------------------------------- */

const FIELDS = ["name", "email", "phone", "message"];

function showErrors(errors) {
  shownErrors = errors;

  // "Give an email or a phone" concerns both fields: say it once, in the
  // hint under the pair, instead of repeating it under each field
  const missingContact = errors.email === "quote.errors.contactOne";
  const hint = document.getElementById("q-contact-hint");
  hint.textContent = t(missingContact ? "quote.errors.contactOne" : "quote.contactHint");
  hint.classList.toggle("field__hint--error", missingContact);

  FIELDS.forEach((field) => {
    const input = el.form.elements[field];
    const message = document.getElementById(`q-${field}-error`);
    const key = errors[field];
    const showMessage = key && !(missingContact && (field === "email" || field === "phone"));
    input.setAttribute("aria-invalid", key ? "true" : "false");
    message.hidden = !showMessage;
    message.textContent = showMessage ? errorText(key) : "";
  });
}

function errorText(key) {
  return key === "quote.errors.message" ? tf(key, { n: MIN_MESSAGE_LENGTH }) : t(key);
}

function showStatus(key, type = "error") {
  statusKey = key;
  el.status.hidden = !key;
  el.status.textContent = key ? t(key) : "";
  el.status.className = `form-status form-status--${type}`;
}

function setSending(on) {
  sending = on;
  el.submit.disabled = on;
  el.submit.classList.toggle("is-loading", on);
  el.submit.setAttribute("aria-busy", String(on));
  el.submitLabel.textContent = t(on ? "quote.sending" : "quote.submit");
}

function onInput(event) {
  if (event.target.name === "website") return;
  saveDraftSoon();
  // After the first attempt, errors disappear as soon as they're fixed
  if (attempted) showErrors(validate(readValues()));
}

/* --------------------------------------------------------------------------
   Sending
-------------------------------------------------------------------------- */

async function handleSubmit(event) {
  event.preventDefault();
  if (sending) return;
  attempted = true;

  const values = readValues();
  const errors = validate(values);
  showErrors(errors);

  if (Object.keys(errors).length) {
    showStatus("quote.errors.summary");
    el.form.elements[FIELDS.find((field) => errors[field])].focus();
    return;
  }
  showStatus(null);

  // Spam: pretend it worked, send nothing
  if (values.website || Date.now() - startedAt < MIN_FILL_MS) {
    showSuccess(values.name);
    return;
  }

  const endpoint = String(state.config?.contact?.formEndpoint || "").trim();
  if (!endpoint.startsWith("https://")) {
    openEmailFallback(values);
    return;
  }

  setSending(true);
  try {
    await postRequest(endpoint, buildPayload(values));
    clearDraft();
    showSuccess(values.name);
  } catch (error) {
    console.error("[quote] Sending failed:", error);
    showStatus("quote.status.network");
  } finally {
    setSending(false);
  }
}

/** What gets stored in your Google Sheet. */
function buildPayload(values) {
  const item = state.products.find((entry) => entry.id === values.item);
  return {
    name: values.name,
    organization: values.organization,
    audience: values.audience,
    email: values.email,
    phone: values.phone,
    item: values.item,
    // Always the English name, so your sheet is easy to read and filter
    itemName: item ? itemName(item, "en") : "Not sure / other",
    message: values.message,
    language: getLanguage(),
    page: window.location.href.split("#")[0],
  };
}

/**
 * Google Apps Script accepts this as a "simple" request (text/plain), so
 * the browser doesn't need a special permission check first, and the
 * script's JSON reply can be read to confirm the request was saved.
 */
async function postRequest(endpoint, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const reply = await response.json().catch(() => null);
    if (!response.ok || reply?.result !== "success") {
      throw new Error(reply?.error || `HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

/** No Apps Script yet: open the visitor's email app with everything filled in. */
function openEmailFallback(values) {
  const email = state.config?.contact?.email;
  if (!email) {
    showStatus("quote.status.network");
    return;
  }
  const item = state.products.find((entry) => entry.id === values.item);
  const subject = tf("quote.mailSubject", { item: item ? itemName(item) : t("quote.mailGeneral") });
  // Empty optional fields are left out; the blank line separates the
  // contact details from the message
  const body = [
    `${t("quote.name")}: ${values.name}`,
    values.organization ? `${t("quote.org")}: ${values.organization}` : null,
    values.email ? `${t("quote.email")}: ${values.email}` : null,
    values.phone ? `${t("quote.phone")}: ${values.phone}` : null,
    "",
    values.message,
  ]
    .filter((line) => line !== null)
    .join("\n");

  window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  showStatus("quote.status.mailto", "info");
}

/* --------------------------------------------------------------------------
   Success and reset
-------------------------------------------------------------------------- */

function showSuccess(name) {
  successName = name.split(/\s+/)[0]; // first name feels friendlier
  renderSuccess();
  el.form.hidden = true;
  el.success.hidden = false;
  el.success.focus();
}

function renderSuccess() {
  if (!successName) return;
  el.successTitle.textContent = tf("quote.success.title", { name: successName });
  el.successText.textContent = t("quote.success.text");
}

function resetForm() {
  el.form.reset();
  populateItems();
  attempted = false;
  successName = null;
  startedAt = Date.now();
  showErrors({});
  showStatus(null);
  el.success.hidden = true;
  el.form.hidden = false;
  el.form.elements.name.focus();
}

/* --------------------------------------------------------------------------
   Draft saving (this browser only)
-------------------------------------------------------------------------- */

const DRAFT_FIELDS = ["name", "organization", "audience", "email", "phone", "interest", "message"];

function saveDraft() {
  if (el.form.hidden) return; // already sent: nothing to keep
  try {
    const data = new FormData(el.form);
    const draft = { savedAt: Date.now() };
    DRAFT_FIELDS.forEach((field) => (draft[field] = String(data.get(field) || "")));
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage full or blocked: drafts are a convenience, not essential */
  }
}
/* Saves shortly after typing stops. The timer can be cancelled: clicking
   "Send" fires a change event on the field you were typing in, and without
   cancelling, that would re-save the draft right after it was cleared. */
let draftTimer = null;
function saveDraftSoon() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 400);
}

function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (!draft) return;
    if (Date.now() - (draft.savedAt || 0) > DRAFT_MAX_AGE_DAYS * 86400000) {
      clearDraft();
      return;
    }
    DRAFT_FIELDS.forEach((field) => {
      if (!draft[field]) return;
      if (field === "audience") {
        const radio = el.form.querySelector(`input[name="audience"][value="${draft[field]}"]`);
        if (radio) radio.checked = true;
      } else if (el.form.elements[field]) {
        el.form.elements[field].value = draft[field];
      }
    });
  } catch {
    /* ignore a broken draft */
  }
}

function clearDraft() {
  clearTimeout(draftTimer);
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/* --------------------------------------------------------------------------
   Language change: everything visible is shown again in the new language
-------------------------------------------------------------------------- */

function retranslate() {
  populateItems();
  showErrors(shownErrors);
  if (statusKey) showStatus(statusKey, el.status.classList.contains("form-status--info") ? "info" : "error");
  if (!sending) el.submitLabel.textContent = t("quote.submit");
  renderSuccess();
}
