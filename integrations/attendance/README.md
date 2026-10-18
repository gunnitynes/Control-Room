# Attendance: Control Room ↔ the class Google Sheet

When a student picks their name on their phone, Control Room checks them in on the teacher's attendance sheet.
Nothing here is served by the website; this is the Apps Script side, kept here so it lives with the code.

## The sheet

"Class Attendance System - old" (owner: gunnitynes@gmail.com)
https://docs.google.com/spreadsheets/d/1c9nhLPZRxEDzYZdJ5m2VirJCXm-w4TsR8YQDkzhJAhY/edit

- **Masterlog**: Timestamp | Class | Student Name | MARKED AT MOODLE
- **One tab per class** (CAP-26A, CAP-26C, CAP-25A, CAP-25B …): student names in column A from row 2

Apps Script project **ATTENDANCE** (Extensions ▸ Apps Script), bound to that sheet. Its original `Code.gs`
(`doGet` + `Index.html` QR page, `getStudents(className)`, `recordAttendance(className, name)`) is unchanged;
`ControlRoomBridge.gs` (this folder) was appended to the end of `Code.gs`.

## The API Control Room uses

POST text/plain JSON to the web app (no CORS preflight; Apps Script's redirect answers with `Access-Control-Allow-Origin: *`):

| request | answer |
|---|---|
| `{"fn":"classes"}` | `{ok, classes}`: every tab except Masterlog |
| `{"fn":"roster","className":"CAP-25A"}` | `{ok, names}` |
| `{"fn":"checkIn","className":"CAP-25A","name":"…"}` | `{ok, result: "recorded" \| "already"}`: once per class, name and day |

Web app URL (in `data/content.js` → `window.ATTENDANCE.url`; set it to `''` to turn the class list off):
`https://script.google.com/macros/s/AKfycbyf7HfaXossjes5l4Fz569eXIYkwx5NmLrOsX444GUlIUHNfqI5RWcsDar_WLf1Jhof/exec`

Test from any terminal:

```bash
curl -sL -H 'Content-Type: text/plain' -d '{"fn":"classes"}' "<web app URL>"
```

## Changing the script

Saving is not deploying. After editing in the Apps Script editor: **Deploy ▸ Manage deployments ▸ (pencil) ▸
Version: New version ▸ Deploy**. Never "New deployment"; that makes a new URL. Keep "Execute as: Me" and
"Who has access: Anyone". Deployed as Version 3 on 2026-10-18.

## How Control Room uses it (js/core.js, search for "class list + attendance")

- The host loads the class list at boot (`attLoad`); the teacher picks a class on the main menu (`attSetClass`).
- Phones connect before naming themselves (`{t:'who'}` → host answers `{t:'names'}`), then tap a name.
- The host calls `checkIn` in the background (`attCheckIn`, 3 retries) and remembers today's check-ins in
  localStorage (`attDone`), so reloading never double-logs. An online name can't be taken twice; a new device
  takes over an offline seat and keeps its points.
