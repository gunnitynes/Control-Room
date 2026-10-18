

/* ─────────────────────────────────────────────────────────────────────────
   CONTROL ROOM BRIDGE
   The classroom playground (gunnitynes.github.io/Control-Room) shows each
   class's names on the phones; picking your name checks you in here, in the
   same MasterLog as the QR page. Everything above this line is unchanged.
   ───────────────────────────────────────────────────────────────────────── */
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

/** Every tab except the log is a class list. */
function crClasses_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()
    .map(function (s) { return s.getName(); })
    .filter(function (n) { return n.toLowerCase() !== 'masterlog'; });
}

function crNames_(className) {
  return getStudents(className).map(function (n) { return String(n).trim(); }).filter(String);
}

/** Logs a check-in once per student, class and day; a second pick the same day is a no-op. */
function crCheckIn_(className, name) {
  name = name.trim();
  if (crNames_(className).indexOf(name) < 0) throw new Error(name + ' is not on the list for ' + className + '.');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('MasterLog');
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
    recordAttendance(className, name);
    return 'recorded';
  } finally {
    lock.releaseLock();
  }
}
