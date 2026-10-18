# Control Room

A classroom playground for music-production lessons. The teacher's laptop (the **host**) runs the big screen;
students join one room per lesson by scanning a QR code, and their **phones** follow the host from game to game.
Sister project of Meter Lab (embedded in `meterlab/`). Bauhaus poster look.

- Live: https://gunnitynes.github.io/Control-Room/ (GitHub Pages, deploys from `main` on every push)
- Plain static site: no build step, no framework, no npm. Open `index.html` through any static server.
- **The owner approves every push.** Commit freely on a branch, but ask before pushing to `main`.

## Files

```
index.html          loads everything; every <script>/<link> carries ?v=N
css/style.css       all styles (tokens on :root, light + night theme)
data/               content anyone may edit: quiz-questions.js, vault-questions.js, content.js
js/core.js          helpers, game registry, host room + menu + setup, roundGame framework, phone shell, boot
js/audio.js         WebAudio engine: buses, drums (DR), voices (VO), rig/seq sequencer, sample loading, Telephone synth
js/assets.js        Constraint Generator files: seeded recipes → MIDI (written byte by byte) or WAV (offline render); also loaded by CADCAST/go
js/games-brain.js   Know your stuff: The Quiz (+ Studio Vault bank), Shortcut Showdown, Translation Grid
js/games-ears.js    Train your ears: Detective, Decay, Sculptor, Envelope, Presets, Meter Lab, Sample Chronologist
js/games-make.js    Make something: Constraint Generator, Genre Cross-Pollinator, Soundabout Roundabout,
                    Metaphor Translation, and Parameter Telephone (shown under Train your ears, slot 10)
js/games-atlas.js   The Ear Atlas (in Know your stuff, after The Translation Grid)
audio/              demo song, eras/, atlas/ (piano, inst, world), presets/; each set has a CREDITS.txt
meterlab/           copy of Meter Lab with an ?embed mode exposing window.MLAPI
tools/              scripts that build the audio clips from Wikimedia Commons (see tools/README.md)
integrations/attendance/  the Google Sheet + Apps Script side of the class-list check-in
```

**Bump the cache-buster** (`?v=N` in `index.html`, all occurrences) whenever JS, CSS or data change.
Phones and the host keep old files otherwise.

## Architecture

- `ROLE` is `player` when the URL has `?room=CODE` (or on a narrow screen without `?host`), otherwise `host`.
- PeerJS connects phones to the host; the host is the only source of truth (`G` on the host, `PL` on phones).
  - host → phone: `{t:'st', view, g, s:pstate}`, `{t:'names'}` (class list), `{t:'log'}` (notebook), `{t:'kick'}`, `{t:'taken'}`
  - phone → host: `{t:'who'}` (before naming), `{t:'hi', id, name}`, `{t:'act', g, d}`, `{t:'ping'}`
  - phones re-render only when the state key `s.k` changes; otherwise `g.pupdate` if the game has one.
- `game(spec)` registers a module; `GROUPS` sets the menu sections; numbering follows `GAMES` order inside groups.
- **Scored games** use `roundGame(spec)` (core.js): prep → open → reveal → podium. The leaderboard only shows when
  the teacher clicks "Show the leaderboard" (the owner asked for that). Hooks: `build, secs, prepMs, prepText,
  public, input, valid, score, locked, publicReveal, pReveal, stage, reveal, onPrep, onOpen, onReveal, leave,
  replay, stop, ringLabel`. Answers arrive as `{t:'ans', i:<round index>, a}`.
- **Free games** (slots, sprints, Roundabout, Metaphor, Telephone) implement `start, render, pstate, player, act,
  next, frame` themselves; `startClock`/`clockFrame` give sprint clocks.
- Setup options: `choices` (segmented), `type:'multi'`, `type:'step'` (+/− with min/max/step/unit),
  `show:v=>bool` to hide an option; `setupExtra(v)` / `setupBind(st, redraw)` add custom setup panels.
- The phone **notebook**: the host calls `logAdd(player, {kind, game, title, text})`.
- Round clock: one main timer per phase (`mainTimer`); the teacher pauses it by clicking the ring or pressing P
  (`g.pause`, phones get `{t:'clock'}`). A game option `auto` (seconds) counts down from the reveal to the next round.
- Constraint Generator: missions = task (per file kind) + rule + evolution, from `CONSTRAINT_BRAIN` in content.js.
  Files are recipes `{kind, seed, bpm, key}` built by `ASSETS.make` on the student's computer (CADCAST/go, paired via
  Control Room); the host sends them with `pcSend(player, msg)`. No answer counts as "busy"; students can sit out.
- Phones: tapping the logo opens Add to Home Screen (manifest.webmanifest, sw.js, icons/). The splash shows the join
  QR as art (`artQR`, error correction H; check scannability with jsQR after changing it).
- Teacher-uploaded clips (Chronologist decades, Ear Atlas songs) live in IndexedDB on the host only
  (`clipDB`, `MYCLIPS`; songs use `dec:-1`). They are never uploaded anywhere.
- Class list + attendance: see `integrations/attendance/README.md`.
- CADCAST pairing (sister repo gunnitynes/CADCAST): a student's computer opens gunnitynes.github.io/CADCAST/go and
  shows a QR → `?pair=<pc id>` here. `pairPage()` (phone) sends `{t:'pair', id, pc}` to the host; `cadcastPair()`
  (host) writes `controlroom.cadcast.allow`, tells the computer `{t:'paired', name, desk:'cadcast-desk-<room>'}`
  over PeerJS. The CADCAST patch bay (same site, same Chrome) reads the room code and allow-list from localStorage.

## Audio and licences

All sound is WebAudio (js/audio.js) plus real recordings in `audio/`. Every recording is public domain or
Creative Commons from Wikimedia Commons (or the University of Iowa piano samples), credited on screen and in a
`CREDITS.txt`. Keep it that way: never add copyrighted commercial music. For decades or songs that are still
under copyright, the teacher adds their own clips in the browser instead.

## Testing

- Preview: `.claude/launch.json` → `controlroom` (python http.server on port 8768, from the repo root).
- Host: `http://localhost:8768/?host&nosplash`. Phones: open more tabs at `?room=<CODE>&as=1`, `&as=2` …
  (`as` gives each tab its own identity). Emulate a phone width (375 and 360 px) for phone checks.
- Drive games from the host console: `startGame(GAMES.find(g=>g.id==='atlas'), {…options})`, `G.game.next()`,
  `G.game.act(player, {t:'ans', i:G.gs.i, a:…})`, `exitGame(true)`.
- `node --check js/*.js` before committing.
- Gotchas: a hidden preview pane freezes CSS animations at their first frame (cards look invisible) and
  throttles timers (auto-reveals lag). Elements wider than the phone push the whole page sideways; keep phone
  layouts at `min-width:0` and test long names (class-list names can be ~25 characters).

## Design language

Bauhaus poster: paper/ink, red · blue · yellow · green, Archivo (condensed, heavy, uppercase) + Space Mono, thick
ink borders with hard offset shadows, circle/square/triangle/diamond for answers A–D. Be bold; the owner liked
brave, playful design. Phones must always fit the screen with nothing cut off.

## Working with the owner

- Gunnar teaches music production (Catalyst Berlin). Trusts your judgement; prefers you decide and get on with it.
- Asks for changes in batches; do all of them, test in the browser, then ask before pushing.
- Prompts and generators should be fun, unique and specific, not cruel. Prefer well-known, real genres and terms.
- Attendance should stay low-friction (picking a name is the whole check-in).
