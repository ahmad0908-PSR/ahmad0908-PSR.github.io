/**
 * ===========================================================================
 * AHMAD AKBARY WEBSITE: QUOTE REQUEST RECEIVER (Google Apps Script)
 *
 * Receives requests from the website's quote form and:
 *   1. adds each one as a new row in the "Requests" sheet
 *   2. emails you a notification (reply to it to answer the client directly)
 *
 * SETUP (full steps in the README, section "Quote form"):
 *   1. Create a Google Sheet, open Extensions -> Apps Script.
 *   2. Replace everything in Code.gs with this file and save.
 *   3. Choose "setup" in the function list at the top and press Run once.
 *      This creates the sheet with headers and asks for permission to
 *      write to the sheet and send email.
 *   4. Deploy -> New deployment -> Web app
 *        Execute as: Me      Who has access: Anyone
 *   5. Copy the Web app URL (ends in /exec) into data/config.json as
 *      "formEndpoint".
 *
 * IMPORTANT: after ANY change to this script, publish it again with
 * Deploy -> Manage deployments -> Edit (pencil) -> Version: New version.
 * Saving alone does not update the live form.
 * ===========================================================================
 */

/* ---------------------------------------------------------------------------
   Settings
--------------------------------------------------------------------------- */

/** Name of the sheet (tab) that stores requests. */
const SHEET_NAME = "Requests";

/** Where notifications go. Leave empty to use the Google account that owns this script. */
const NOTIFY_EMAIL = "";

/** Set to false to stop email notifications (requests are still saved). */
const SEND_NOTIFICATIONS = true;

/** Column headers, in order. "Status" is for you: New / Replied / Won / Lost. */
const HEADERS = [
  "Received", "Name", "Organization", "For", "Email", "Phone",
  "Interested in", "Item ID", "Message", "Language", "Page", "Status",
];

/** Maximum length kept for each field (longer text is cut). */
const LIMITS = {
  name: 100, organization: 150, audience: 20, email: 150, phone: 25,
  item: 80, itemName: 150, message: 3000, language: 5, page: 300,
};

/** Readable labels for the codes the website sends. */
const AUDIENCE_LABELS = { business: "Business", ngo: "NGO / program", other: "Other" };
const LANGUAGE_LABELS = { en: "English", fa: "Dari", ps: "Pashto" };

/* ---------------------------------------------------------------------------
   Web app entry points
--------------------------------------------------------------------------- */

/** Called by the website's quote form. */
function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    // Spam trap filled in: pretend success, save nothing
    if (data.website) return reply({ result: "success" });

    const request = clean(data);
    if (!request.name || !request.message || (!request.email && !request.phone)) {
      return reply({ result: "error", error: "missing-fields" });
    }

    saveRow(request);
    notify(request); // never blocks saving: errors are caught inside

    return reply({ result: "success" });
  } catch (error) {
    console.error(error);
    return reply({ result: "error", error: "server" });
  }
}

/** Open the Web app URL in a browser to check the script is running. */
function doGet() {
  return reply({ result: "ok", message: "Quote endpoint is running." });
}

/* ---------------------------------------------------------------------------
   Saving
--------------------------------------------------------------------------- */

function saveRow(request) {
  // The lock makes two requests arriving at the same moment wait their turn
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet().appendRow([
      new Date(),
      safe(request.name),
      safe(request.organization),
      AUDIENCE_LABELS[request.audience] || safe(request.audience),
      safe(request.email),
      safe(request.phone),
      safe(request.itemName),
      safe(request.item),
      safe(request.message),
      LANGUAGE_LABELS[request.language] || safe(request.language),
      safe(request.page),
      "New",
    ]);
  } finally {
    lock.releaseLock();
  }
}

/** The "Requests" sheet, created with bold, frozen headers if missing. */
function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(HEADERS.indexOf("Message") + 1, 420);
  }
  return sheet;
}

/* ---------------------------------------------------------------------------
   Email notification
--------------------------------------------------------------------------- */

function notify(request) {
  if (!SEND_NOTIFICATIONS) return;
  try {
    const to = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
    if (!to) return;

    const subject = `New quote request: ${request.itemName || "General"} (${request.name})`;
    const body = [
      `Name:          ${request.name}`,
      `Organization:  ${request.organization || "-"}`,
      `For:           ${AUDIENCE_LABELS[request.audience] || request.audience || "-"}`,
      `Email:         ${request.email || "-"}`,
      `Phone:         ${request.phone || "-"}`,
      `Interested in: ${request.itemName || "-"}`,
      `Language:      ${LANGUAGE_LABELS[request.language] || request.language || "-"}`,
      `Page:          ${request.page || "-"}`,
      "",
      "Message:",
      request.message,
      "",
      "Saved in your sheet: " + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    ].join("\n");

    const options = { name: "Website quote form" };
    if (request.email) options.replyTo = request.email; // "Reply" answers the client

    MailApp.sendEmail(to, subject, body, options);
  } catch (error) {
    console.error("Notification failed (the request was still saved):", error);
  }
}

/* ---------------------------------------------------------------------------
   Helpers
--------------------------------------------------------------------------- */

/** Keep only expected fields, as trimmed text within their length limits. */
function clean(data) {
  const result = {};
  Object.keys(LIMITS).forEach((key) => {
    result[key] = String(data[key] == null ? "" : data[key]).trim().slice(0, LIMITS[key]);
  });
  return result;
}

/**
 * Stop text from being run as a spreadsheet formula ("formula injection").
 * A value starting with = + - or @ gets a leading apostrophe, which Sheets
 * hides. This also keeps the + at the start of phone numbers.
 */
function safe(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function reply(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------------------------------------------------------
   Run once from the editor (step 3 of SETUP)
--------------------------------------------------------------------------- */

/**
 * Creates the "Requests" sheet and sends you a test email, so Google asks
 * for both permissions now instead of when the first real client writes.
 */
function setup() {
  getSheet();
  notify({
    name: "Setup test",
    organization: "",
    audience: "other",
    email: "",
    phone: "",
    item: "",
    itemName: "Setup test",
    message: "If you received this email, notifications are working. No row was added to the sheet.",
    language: "en",
    page: "",
  });
  console.log("Setup complete: sheet ready and test email sent.");
}
