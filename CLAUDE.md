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
                    (Meter Lab embeds meterlab/index.html?embed: questions in three styles, Hear it / See it / Hear + see;
                    See it shows the question's own figure with P.hide, MLAPI.see()/mute(); the reveal shows the figure with labels)
js/games-make.js    Make something: Constraint Generator, Genre Cross-Pollinator, Soundabout Roundabout,
                    Metaphor Translation, and Parameter Telephone (shown under Train your ears, slot 10)
js/games-atlas.js   The Ear Atlas (Know your stuff, slot 02 right after The Quiz): 12 question types; recordings in window.ATLAS (built by tools/atlas/build.py);
                    plays the clips this browser has heard least first (localStorage atlas.seen)
js/vote.js          The room vote: openVote(spec) — a ballot on every phone, live tally, tie spotlight; voteGames() picks the next module
js/guide.js         The Guide to the Control Room (poster page, ?guide or overlay)
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
  (`g.pause`, phones get `{t:'clock'}`). **Autoplay**: every `roundGame` gets `AUTO_OPT` (key `auto`, default 10 s) added automatically; after a reveal it counts down
  to the next round. The Autoplay switch under Next (or the A key) flips it mid-game (`autoFlip`, saved per game). Parameter
  Telephone has it too: after a chain plays through, it counts down to the next chain (`armAuto`).
- Constraint Generator: missions = task (per file kind) + rule + evolution, from `CONSTRAINT_BRAIN` in content.js.
  Files are recipes `{kind, seed, bpm, key}` built by `ASSETS.make` on the student's computer (CADCAST/go, paired via
  Control Room); the host sends them with `pcSend(player, msg)`. No answer counts as "busy"; students can sit out.
- Phones: tapping the logo opens Add to Home Screen (manifest.webmanifest, sw.js, icons/). The splash shows the join
  QR as art (`artQR`, error correction H; check scannability with jsQR after changing it).
- Teacher-uploaded clips (Chronologist decades, Ear Atlas songs) live in IndexedDB on the host only
  (`clipDB`, `MYCLIPS`; songs use `dec:-1`). They are never uploaded anywhere.
- Class list + attendance: see `integrations/attendance/README.md`. No sheet is built in: each teacher connects their own
  Apps Script web app on the main menu (`attUrl()`, stored per browser as `att.url`).
- **Login = CADCAST first** (sister repo gunnitynes/CADCAST). Each student computer shows
  gunnitynes.github.io/CADCAST/go (a QR card on the desk links there). It asks the **lobby** peer
  `controlroom-lobby-<CLASS_KEY>` (content.js; the host registers it on open, answers `{t:'room?'}` with the code)
  and draws a QR → `?pair=<pc id>&room=<code>` here. The phone scans it, taps its name (the normal join), and once
  joined sends `{t:'pair', id, pc}`; `cadcastPair()` (host) writes `controlroom.cadcast.allow` and tells the computer
  `{t:'paired', name, desk}`; the phone gets `{t:'paired'}` and shows "Your computer is now NAME". One scan signs the
  student into both. Joining via the room QR still works on its own. The patch bay reads room + allow-list from
  localStorage (same site, same Chrome). The header's **Mixer** button (`openMixer`) opens it as ../CADCAST/patch/ in a
  named tab; it must be this same browser. The patch bay lists paired-but-silent students as "Paired · no sound yet".
- **Room vote** (js/vote.js): `G.view==='vote'`, state in `V`. Phones get `view:'vote'` with `s=voteState(p)` and send
  `{t:'vote', v}` (not `act`). Votes are by player id and only count while the player is in the room. Close → 3-2-1 →
  winner card (ties: a spotlight picks one). Reuse it with `openVote({title, sub, kind:'text', opts:[{v,l,s,c}], win:{go, fn}})`.
- **Guide** (js/guide.js, copy in `GUIDE` in content.js): `?guide` is a standalone page; `openGuide()` overlays it
  (phone idle screen, notebook header, host room panel). Cards come from `GAMES`; variation chips from game options.

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
