/**
 * Optional backend: Google Apps Script web app that stores bookings in a Google Sheet.
 *
 * Setup:
 *   1. Create a Google Sheet with a tab called "Bookings" and the header row:
 *      id | date | start | barberId | serviceId | name | phone | createdAt
 *   2. Extensions → Apps Script → paste this file.
 *   3. Deploy → New deployment → Web app (execute as you, access: anyone).
 *   4. In app.js, send the booking with fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(booking) })
 *      instead of saving it to localStorage.
 *
 * This is the same approach I used for a real barbershop site: a free backend
 * the shop owner can read and edit directly in Google Sheets.
 */

const SHEET_NAME = "Bookings";

function sheet_() {
  return SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
}

function json_(data, status) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: status || "ok", data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** GET ?date=YYYY-MM-DD → all bookings of that day (without phone numbers). */
function doGet(e) {
  const date = e.parameter.date;
  const rows = sheet_().getDataRange().getValues().slice(1);
  const bookings = rows
    .filter(r => !date || Utilities.formatDate(new Date(r[1]), "Europe/Berlin", "yyyy-MM-dd") === date)
    .map(r => ({ id: r[0], date: r[1], start: r[2], barberId: r[3], serviceId: r[4] }));
  return json_(bookings);
}

/** POST booking JSON → appended as a new row, unless the slot is already taken. */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // two customers clicking at the same time must not get the same slot
  try {
    const b = JSON.parse(e.postData.contents);
    const rows = sheet_().getDataRange().getValues().slice(1);
    const clash = rows.some(r => r[1] === b.date && r[2] === b.start && r[3] === b.barberId);
    if (clash) return json_("Slot already taken", "error");

    sheet_().appendRow([b.id, b.date, b.start, b.barberId, b.serviceId, b.name, b.phone, new Date()]);
    return json_(b);
  } finally {
    lock.releaseLock();
  }
}
