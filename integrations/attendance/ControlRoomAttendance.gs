/* ─────────────────────────────────────────────────────────────────────────
   CONTROL ROOM ATTENDANCE: paste this whole file into your sheet's
   Extensions ▸ Apps Script (replace what is there), then
   Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me ▸ Who has access: Anyone.
   Copy the web app link (it ends in /exec) into Control Room ▸ Class list.

   The sheet: one tab per class, student names in column A from row 2
   (row 1 is a heading). A tab called MasterLog is made for you and gets one
   row per check-in: Timestamp | Class | Student Name | MARKED AT MOODLE.
   ───────────────────────────────────────────────────────────────────────── */
var LOG = 'MasterLog';

function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents);
    if (req.fn === 'classes') out = { ok: true, classes: crClasses_() };
    else if (req.fn === 'roster') out = { ok: true, names: crNames_(String(req.className || '')) };
    else if (req.fn === 'checkIn') out = { ok: true, result: crCheckIn_(String(req.className || ''), String(req.name || '')) };
    else out = { ok: false, error: 'Unknown request.' };
  } catch (err) {
    out = { ok: false, error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Open the web app link in a browser to check it works: it lists your classes. */
function doGet() {
  var out;
  try { out = { ok: true, app: 'Control Room attendance', classes: crClasses_() }; }
  catch (err) { out = { ok: false, error: err.message }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Every tab except the log is a class list. */
function crClasses_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()
    .map(function (s) { return s.getName(); })
    .filter(function (n) { return n.toLowerCase() !== LOG.toLowerCase(); });
}

/** Names in column A from row 2. */
function crNames_(className) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(className);
  if (!sh) throw new Error('There is no tab called ' + className + '.');
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 1).getValues()
    .map(function (r) { return String(r[0]).trim(); }).filter(String);
}

function crLog_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = ss.getSheetByName(LOG);
  if (!log) {
    log = ss.insertSheet(LOG);
    log.appendRow(['Timestamp', 'Class', 'Student Name', 'MARKED AT MOODLE']);
    log.setFrozenRows(1);
  }
  return log;
}

/** Logs a check-in once per student, class and day; a second pick the same day is a no-op. */
function crCheckIn_(className, name) {
  name = name.trim();
  if (crNames_(className).indexOf(name) < 0) throw new Error(name + ' is not on the list for ' + className + '.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var log = crLog_();
    var tz = Session.getScriptTimeZone();
    var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    var last = log.getLastRow();
    if (last > 1) {
      var from = Math.max(2, last - 499);
      var rows = log.getRange(from, 1, last - from + 1, 3).getValues();
      for (var i = rows.length - 1; i >= 0; i--) {
        var r = rows[i];
        if (!(r[0] instanceof Date)) continue;
        if (Utilities.formatDate(r[0], tz, 'yyyy-MM-dd') !== today) continue;
        if (String(r[1]).trim() === className && String(r[2]).trim() === name) return 'already';
      }
    }
    log.appendRow([new Date(), className, name, '']);
    return 'recorded';
  } finally {
    lock.releaseLock();
  }
}

/** Optional: run once from the editor (▶ Run ▸ setup) to make the MasterLog and turn an empty first tab into an example class. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  crLog_();
  var first = ss.getSheets().filter(function (s) { return s.getName() !== LOG; })[0];
  if (first && first.getLastRow() === 0) {
    first.setName('My class');
    first.getRange(1, 1, 3, 1).setValues([['Student name'], ['Ada Lovelace'], ['Alan Turing']]);
  }
}
