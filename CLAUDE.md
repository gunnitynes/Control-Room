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
data/               content anyone may edit: quiz-questions.js (window.BANKS), content.js
js/core.js          helpers, game registry, host room + menu + setup, roundGame framework, phone shell, boot
js/audio.js         WebAudio engine: buses, drums (DR), voices (VO), rig/seq sequencer, sample loading, Telephone synth
js/assets.js        Constraint Generator files: seeded recipes → MIDI (written byte by byte) or WAV (offline render); also loaded by CADCAST/go
js/games-brain.js   Know your stuff: The Quiz, Shortcut Showdown, Translation Grid. The Quiz has three banks in
                    window.BANKS, no subject in two: The Workbench (how to do it), The Machine Room (how the gear works),
                    The Studio Vault (the stories), each 7 categories; option c_<bank id> picks a bank's categories
                    Picture questions: data/quiz-pics.js (QUIZ_PICS, 74 Commons photos in images/quiz/, built by
                    tools/quizpics) join The Machine Room's categories; picQ() asks name / type / maker with fresh wrong answers
                    Names/logos are blurred and extra devices cropped at build time (tools/quizpics/blur.py BLUR / CROP).
                    The owner's mic list (tools/quizpics/mics.py) gives each mic its type and a fact for the reveal; mics with no
                    free photo are listed in QUIZ_PIC_SLOTS (not shown anywhere yet: the owner is finding photos for them). Never commit photos copied from sites like recordinghacks.com: the repo is public.
js/games-ears.js    Train your ears: Frequency Detective (modes find the filter / fix the flaw: FREQ_FIND + FREQ_FIX specs,
                    each round carries r.mode), Decay, Envelope, Presets, Meter Lab, Sample Chronologist
                    (Envelope Sculptor: envPts/envApply in audio.js are the ONE shape drawn and played — straight lines,
                    gain = level^1.7, no vibrato or reverb; options share one time axis with a tick per second)
                    (Preset Archeologist: 46 machines, real recordings only, question kinds machine / kind / decade,
                    least-heard first via localStorage presets.seen; build with tools/presets/build.py)
                    (Meter Lab embeds meterlab/index.html?embed: questions in three styles, Hear it / See it / Hear + see;
                    See it shows the question's own figure with P.hide, MLAPI.see()/mute(); the reveal shows the figure with labels)
                    The Translation Grid: window.TRANSLATE (content.js), 75 cards {t topic, c idea, v picture key, a analogy}; the
                    pictures are drawn by VIS(key) in games-brain.js (helpers eq/tf/env/scope/imp/polar/btn); option tg = topics
                    (TG_TOPICS); cards this browser has shown least are dealt first (localStorage tg.seen)
js/games-make.js    Make something: Constraint Generator, Genre Cross-Pollinator, Soundabout Roundabout,
                    Metaphor Translation, and Parameter Telephone (shown under Train your ears, slot 10)
js/games-atlas.js   The Ear Atlas (Know your stuff, slot 02 right after The Quiz): two setup categories, Recordings (AT_RECS, first) and Ear training (AT_EARS;
                    Notes & Intervals = 'note', dealt half note / half interval); recordings in window.ATLAS (built by tools/atlas/build.py);
                    plays the clips this browser has heard least first (localStorage atlas.seen)
js/games-mix.js     The Mix Room (Train your ears): a song in stems loops on the big speakers, every phone is a fader
                    (one each; extra students share a part; with fewer students a random set of parts is dealt and the rest
                    stay at the original level and aren't scored); the reveal scores the balance against the original and A/Bs
                    it. Every mix each held part gets a hidden trim (`s.trim`, −5…+16 dB, spread so parts disagree), phones and the big screen show
                    no dB numbers or 0 mark while mixing; the reveal shows the effective level and a green target mark (`mxTarget`). "Load your multitracks folder" (subfolder per song) replaces the collection in clipDB (dec -4); never in the repo.
js/remix-engine.js  Live Remix engine: rxAnalyse (STFT spectral-flux onsets → autocorrelation tempo → beat phase → downbeat
                    from the bass → chroma key → energy per bar), rxPlayer (the song scheduled beat by beat so any beat can
                    be repeated/reversed/re-pitched on the grid, an FX rack, generated 808/hats/claps/sub in the key), RX_FX
js/games-remix.js   Live Remix (Make something): 4 moves per phone (a used move is replaced), take turns round the room
                    (play:turns, s.turn, nextTurn) or everyone at once with cooldowns; the deck on the big screen; songs are the
                    teacher's own (clipDB dec -5) or the Chronologist music; analyses cached in localStorage rx.an
js/games-drop.js    Supply Drop (Make something): the teacher's materials folder (clipDB dec -6, subfolders = labels) dealt at
                    random to every CADCAST computer (pcSendFile kind 'drop'); modes unique / random / same; one swap per drop
js/games-conduct.js The Conductor (Make something): a laptop orchestra. DAWs keep tempo/bar with Ableton Link (Link can't
                    run in a browser); the CADCAST Mixer, open in the same browser, does the rest over BroadcastChannel
                    'cr-mixer': a sync check (clickFit on everyone's metronome → per-stream DelayNode so downbeats land
                    together), bar-quantised gates per computer, and a recording of the mix per piece
js/games-album.js   The Class Album (Make something, the last module): everyone makes one part of the same song. Every
                    CADCAST computer gets only a small brief ({t:'album',m}: role, tempo, key, bars, no files: the owner wants
                    nothing distributed, only received); students EXPORT their N bars
                    from the DAW and drop the WAV on CADCAST/go (pcSendFile kind 'part'; the teacher can also drag a file onto a
                    card). alFit fits it to N bars (a tail wraps to the start, half-length loops repeat, short = padded + warning)
                    and answers {t:'album-got'}. Arrange: a row per part, a column per section (AL_SECS, AL_FILL defaults by role),
                    phones switch their own row + level + suggest titles; playback schedules sections as segments half a second
                    ahead (a looped section is scheduled again). The album: one offline render per stem, the mix is their sum at
                    one gain (stems add up to the mix), store-only zip (alZip), downloaded on the big screen (nothing sent back).
js/midi-engine.js   The teacher's MIDI library (clipDB dec -7, never in the repo; index in localStorage midi.idx): mdParse (SMF),
                    mdParts (per track+channel, so type-0 files split), mdRoles (drums = ch10 → name → a logistic model on playing
                    style, 95.5 % right per song; bass/melody/chords/extra by name, GM program, register, polyphony), mdKey
                    (Krumhansl), mdFeel (double/half-time files → 70–150 BPM), mdWindow/mdClip (busiest N bars, in beats),
                    mdBand (looping WebAudio band, swaps parts on the loop), mdWrite (multi-track .mid), mdLibPanel/mdLibBind.
                    Tested on the owner's 5,378-file bank (~/CATALIST/MIDI COLLECTION): all read, ~5 ms each.
js/games-franken.js The Frankenhit (Make): phones spin a part each (drums/bass/chords/melody/extra) → that part of a random song,
                    transposed to the room key (set by the first pitched part) at the room tempo; keep/reroll; guess the sources;
                    export MIDI / send to computers.
js/games-blind.js   Blind Orchestra (Make, CADCAST): a secret song's parts dealt as MIDI (kind 'drop', meta.head) + the Class Album
                    hand-in box ({t:'album', m.head}); parts fitted by alFit; the orchestra plays (missing parts from MIDI), phones
                    guess, reveal A/Bs with the original.
js/games-teleport.js Genre Teleporter (Ears, scored): melody kept, harmony read per 2 beats (tpHarmony), drums/bass/comp rebuilt
                    by TP_GENRES machines (10 genres, half-time feel for trap/dnb); reveal plays the original.
js/vote.js          The room vote: openVote(spec) — a ballot on every phone, live tally, tie spotlight; voteGames() picks the next module
Teacher/index.html  The Teacher handbook (self-contained page, same look) at /Control-Room/Teacher/. NOT linked from the app
                    (the owner sends the link). School setup assumed: CADCAST/go bookmarked on student computers, BlackHole installed,
                    a Multi-Output Device named CADCAST. Keep it in step with the sheet card (openSheetSetup) and the module list.
js/pick.js          The Picker (header Pick, after Vote): G.view==='pick', state PK. One student / a group (spotlight hops a set
                    number of times and lands on a pre-chosen name; fair mode PK.done = nobody twice until everyone has had a turn)
                    or teams (2–8, dealt evenly, named colour + shape via pkTeam). Phones: pickState → pPick ("You're up!" / your team).
js/timer.js         The room timer (header Timer, every view): TMR on the host, {t:'timer',left,T,paused,done} to phones (also on join);
                    phones show a countdown pill (pTmrPaint/pTmrFrame) and on done vibrate + a Time's up screen; the host flashes TIME!
js/guide.js         The Guide to the Control Room (poster page, ?guide or overlay)
                    "Get in" shows both ways (A: big-screen QR, B: CADCAST computer QR); new modules need a GUIDE entry in content.js
images/quiz/        Machine Room photos (webp) + CREDITS.txt
audio/              demo song, eras/, atlas/ (piano, inst, world), presets/; each set has a CREDITS.txt
meterlab/           copy of Meter Lab with an ?embed mode exposing window.MLAPI
tools/              scripts that build the audio clips from Wikimedia Commons (see tools/README.md)
integrations/attendance/  the Google Sheet + Apps Script side of the class-list check-in
```

**Bump the cache-buster** (`?v=N` in `index.html`, all occurrences) whenever JS, CSS or data change.
Phones and the host keep old files otherwise.

## Architecture

- **Home = Attendance** (`G.view==='home'`, `rHome`): the first screen after the splash. Big join QR (cached node `G.homeQR`) and the room code (no count or URL under it), teacher name ("Not you?") with Copy attendance right under it, the shared class-list box (`attBoxHTML`/`attBoxBind`, also in the menu), names, New room, Copy attendance, and **Activities** → the module menu (`G.view==='menu'`). The Teacher panel is on the right on both screens (home `.hside`, menu `.roomp`, moved with CSS `order`; stacked on top on narrow screens); the Teacher box is `.teachbox.tight` on both screens. The logo goes home (no Attendance button). The header shows Vote/Pick when `atRest()`, then Timer · CADCAST, then **Supply drop** (`#bDrop`, straight to its setup, menu only) and the **⋯ utilities** menu last (`#util`, `G.utilOpen`: Sound effects, Theme, Manual; closes on any outside click). Manual (`#bManual`: `window.open('Teacher/','cr-manual')` so the room keeps running; the handbook's fixed ← Control Room button closes that tab, or opens `../?host` when there is no opener). `atRest()` = home or menu. Most teachers only use this screen.
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
- **No repeats**: `seenOrder(deck, list, keyOf)` / `seenMark(deck, items, keyOf)` (core.js) deal what this browser has shown least
  first (localStorage `seen.<deck>`). Used by The Quiz, Shortcut Showdown, Translation Grid, Frequency Detective (fix), Envelope Sculptor
  and every song excerpt (`dealSong`); Ear Atlas, Preset Archeologist and the Chronologist have their own. Decay, Frequency find and Meter Lab
  generate fresh values each round. New question modules should use seenOrder.
- **Shortcut Showdown**: SHORTCUTS in content.js, 140 Mac defaults; an entry may carry a 4th array of alternative keys (Pro Tools ⌥1–4
  for F1–F4), shown as "or …"; any F-key question shows the fn tip (`scAlt`, `scFn`). Only add shortcuts you are sure of.
- Setup options: `choices` (segmented), `type:'multi'`, `type:'step'` (+/− with min/max/step/unit),
  `show:v=>bool` to hide an option (a saved value that is no longer a choice falls back to `def`, see `optVals`); `setupExtra(v)` / `setupBind(st, redraw)` add custom setup panels.
- The phone **notebook**: the host calls `logAdd(player, {kind, game, title, text})`. `openNotebook` (core.js) draws it as a
  full-screen scrapbook: a hero (name sized to its longest word, sticker stats), a colour band per game, and one look per
  kind via `nbEntry` (brief = ticket, pick = KEPT stamp, card = taped index card, rules = photo + numbered rules,
  star = starburst, finish = medal parsing "2nd of 14" / "87% accurate" / "Your lineage:"). Keep new log text in those shapes.
- **Play another round**: every end screen (`rPodium`, and the done phase of Constraint Generator and Roundabout) shows
  `againBtn()` + `bindAgain(st)`; it (or the R key) calls `playAgain()` = the same game with `G.lastOpts`, fresh deck, scores from zero.
- Round clock: one main timer per phase (`mainTimer`); the teacher pauses it by clicking the ring or pressing P
  (`g.pause`, phones get `{t:'clock'}`). **Autoplay**: every `roundGame` gets `AUTO_OPT` (key `auto`, default 10 s) added automatically; after a reveal it counts down
  to the next round. The Autoplay switch under Next (or the A key) flips it mid-game (`autoFlip`, saved per game). Parameter
  Telephone has it too: after a chain plays through, it counts down to the next chain (`armAuto`).
- Constraint Generator: missions = task (per file kind) + rule + evolution, from `CONSTRAINT_BRAIN` in content.js.
  Tempo is only ever said in words (`feels`: slow … very fast; later rounds a `shifts` change like "Slow it down a little", chosen by
  `cgShift` to fit the current tempo) and no key is ever named; option `groove` is labelled "Constraints for" (The whole team / Each student).
  Files are recipes `{kind, seed, bpm, key}` built by `ASSETS.make` on the student's computer (CADCAST/go, paired via
  Control Room); the host sends them with `pcSend(player, msg)`. No answer counts as "busy"; students can sit out.
  Option `mode:'gen'` (Generator) skips rounds and the clock: Shared = one card for the room (New task / New rule /
  New constraint), Own = one card per phone, rerolled from the phone (`{t:'roll'}`); files still go to paired computers.
- Phones: the app can still be added to the home screen by hand (manifest.webmanifest, sw.js, icons/); the logo no longer opens a prompt
  (the owner removed it). The idle screen keeps the Guide button at the bottom. The splash shows the join
  QR as art (`artQR`, error correction H; check scannability with jsQR after changing it).
- **Sample Chronologist, your own music**: "Load a music folder" (webkitdirectory) saves every song into clipDB (`id 'ch:'+path`,
  decade from a `1970s` folder or the year in the name). Each song plays one of up to 6 seven-second windows (8 %–88 %),
  least-played first (`chWindow`, localStorage `chrono.win`); least-played songs are dealt first. Commercial music stays
  in the teacher's browser only, never in the repo.
- Teacher-uploaded clips and photos (Chronologist decades, Ear Atlas songs, Metaphor Translation photos) live in IndexedDB on
  the host only (`clipDB`, `MYCLIPS`; songs use `dec:-1`, photos `dec:-2`). They are never uploaded anywhere. Copyrighted
  photos belong there, not in the repo.
- Class list + attendance: see `integrations/attendance/README.md`. No sheet is built in: each teacher connects their own
  Apps Script web app on the main menu (`attUrl()`, stored per browser as `att.url`).
- **Lobby per teacher**: `controlroom-lobby-<teacher name>` (asked once on the host, `teacher` in localStorage; computers use
  `CADCAST/go/?t=<name>` or type it once; the room panel shows that link and warns on a name clash).
- **Login = CADCAST first** (sister repo gunnitynes/CADCAST). Each student computer shows
  gunnitynes.github.io/CADCAST/go (a QR card on the desk links there). It asks the **lobby** peer
  `controlroom-lobby-<teacher>` (see above; the host registers it on open, answers `{t:'room?'}` with the code)
  and draws a QR → `?pair=<pc id>&room=<code>` here. The phone scans it, taps its name (the normal join), and once
  joined sends `{t:'pair', id, pc}`; `cadcastPair()` (host) writes `controlroom.cadcast.allow` and tells the computer
  `{t:'paired', name, desk}`; the phone gets `{t:'paired'}` and shows "Your computer is now NAME". One scan signs the
  student into both. Joining via the room QR still works on its own. The patch bay reads room + allow-list from
  localStorage (same site, same Chrome). The header's **CADCAST** button (`openMixer`, called Mixer before) opens it as ../CADCAST/patch/ in a
  named tab; it must be this same browser. The patch bay lists paired-but-silent students as "Paired · no sound yet".
- **Copy attendance** (room panel, `copyAttendance`): everyone who joined this room (p.in = join time, saved with the room), sorted, tab-separated with a dated heading; for teachers without a sheet. New room warns to copy first.
- **Teacher link** (Teacher box ▸ ⧉ Copy teacher link, `teacherLink()`): `?host#teacher=NAME&sheet=/exec URL`; `applyTeacherLink()` at host boot stores both and wipes the hash. Private (holds the sheet link). No login. Class list ▸ ⧉ Copy your sheet link and the sheet card copy the /exec link alone. Copy attendance sits right under the Teacher box.
- **Screensaver**: the Catalyst logo in the header (`#bSaver`, images/catalyst-logo.png, drawn as a CSS mask) opens `openSaver()`: a full-screen page with the logo, black by default (click flips to white, saved as `saver.light`); every key is swallowed, Esc (or leaving full screen) calls `closeSaver()`. The room keeps running underneath.
- **Raise your hand** (phones only): `#pHand` in the phone header sends `{t:'hand', up}`; the host keeps `p.hand` (time raised),
  shows `#hands` in the header middle, left of the student count (one name, or "Multiple"; click for the ordered list, lower one or all) and a yellow name chip (menu `.mchip` and home `.hname`).
- **Check-in announcement** (home only): a new player in the `hi` handler → `announceIn(p)` → a queued fixed overlay `.annc` over the header middle
  (between the shapes and the hands/count), so re-renders never restart it; shorter holds when the queue is long; the count pops.
  `handsUpdate()` updates in place and never re-renders a running game. Hands drop on disconnect; lowering is echoed back to the phone.
- **Soundabout Roundabout relay**: after the sketch and each stop a `rec` phase: the phone's Record/Stop sends `{t:'rec'}`; the
  host tells the computer `{t:'rec-start'|'rec-stop'}`; CADCAST/go records its capture stream (MediaRecorder, opus) and
  uploads it with `{t:'file'}` chunks (core.js `pcSendFile` / `pcData` / `B64`, both directions, game hooks `onPcFile`,
  `onPcMsg`, `onPcProg`). "Pass it on" sends each take (and in `pass:'project'` the dropped project zip) to the next
  computer in `s.ring`, where it becomes a WAV. Takes stay in host memory for the listening party (`journeys()`).
- **Soundabout Roundabout ▸ Blind layers** (option `mode:'blind'`, the owner's Week 4 "Record with intuition" PDF): `RBB` in
  games-make.js, state `G.gs.bl`; the roundabout spec hands every hook to RBB when `bl` is set, and `how` is a getter per mode.
  Groups of `size` (pkTeam names), a starting point per group (BLIND.tempo/tonal/palette, or `start:'own'`), then layers: performer
  `ids[(L-1)%n]`, operator `ids[L%n]`, a cue card (BLIND.cues: Start / Memory / Space / Variation). The reveal goes group by group: the
  teacher starts the clock when the group presses play, phones tap one of six moments (BLIND.listen, `{t:'mark',k}`), `blMoments`
  clusters marks within 5 s and ranks by students → the group's top 3 go to their phones + notebooks for Develop, then Share.
  Content in data/content.js → BLIND. No CADCAST needed (each group works on one computer).
- **Room vote** (js/vote.js): the Vote button opens `openVoteChooser()`: The next module (`voteGames`) or Your own question
  (`openCustomVote`: a question + any number of answers, Enter adds the next, the last one saved as `vote.custom`, kind 'text'). `G.view==='vote'`, state in `V`. Phones get `view:'vote'` with `s=voteState(p)` and send
  `{t:'vote', v}` (not `act`). Votes are by player id and only count while the player is in the room. Close → 3-2-1 →
  winner card (ties: a spotlight picks one). Reuse it with `openVote({title, sub, kind:'text', opts:[{v,l,s,c}], win:{go, fn}})`.
- **Guide** (js/guide.js, copy in `GUIDE` in content.js): `?guide` is a standalone page; `openGuide()` overlays it
  (phone idle screen, notebook header, host room panel). Cards come from `GAMES`; variation chips from game options.

## Audio and licences

All sound is WebAudio (js/audio.js) plus real recordings in `audio/`. Every recording is public domain or
Creative Commons from Wikimedia Commons (or the University of Iowa piano samples), credited on screen and in a
`CREDITS.txt`. Keep it that way: never add copyrighted commercial music. For decades or songs that are still
under copyright, the teacher adds their own clips in the browser instead.

## Connections through school networks (TURN relay)

School Wi-Fi often blocks device-to-device traffic. Every PeerJS peer and RTCPeerConnection (core.js `peerCfg()`/`iceReady()`,
CADCAST go/patch `peerCfg()`/`rtcCfg()`) gets ICE servers from the owner's Cloudflare Worker
`https://controlroom-turn.gunnitynes.workers.dev` (code: integrations/turn/worker.js; secrets TURN_KEY_ID / TURN_KEY_API_TOKEN live in
Cloudflare, never here; it answers only gunnitynes.github.io and localhost). Credentials are cached 20 h in localStorage. For now EVERY
connection is relay-only (the owner's school still blocked phones with direct-first); `?direct` in any URL tries direct first. Relay includes
turns:…:443 (TLS), which passes almost any firewall. CADCAST audio drops to 128 kb/s when relayed. If the Worker can't be reached
(3 tries, 8 s each), connections fall back to trying anything.
Cloudflare TURN free tier: 1,000 GB/month.

## Security notes (checked 2026-10-22)

- Never commit a real Apps Script /exec link, TURN token or other secret: the repo is public. (The owner's sheet link was in
  integrations/attendance/README.md until 2026-10-22 and is still in git history: the owner should redeploy the script to get a new link.)
- Everything a student types is shown with `esc()` or `textContent`; keep it that way in new code.
- Files from computers (core `pcData`) and to computers (CADCAST/go `gotChunk`) are capped: 11,000-byte chunks (`PC_CH`), ≤ 32000 chunks, few at once.
  **Chunks must stay under 16 KB once JSON-encoded: PeerJS 1.5 silently drops bigger messages on a 'json' connection** (an error event, no
  exception). 48 KB chunks broke every file transfer until 2026-10-25. CADCAST's patch bay finds this tab by `window.name='controlroom-host'`
  and asks BroadcastChannel 'cr-host' whether a Control Room is open before ever opening another.
- CADCAST/go accepts teacher messages only from `controlroom-v1-<room>` (the room it paired in, or the teacher's current room from the lobby).
- Outside scripts are pinned and SRI-checked (`SRI` in core.js, `integrity` in CADCAST); a new version needs a new hash from cdnjs.
- The TURN Worker answers only gunnitynes.github.io / localhost Origins.

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

## Wording

Say **students**, not phones, when you mean the people ("Waiting for the first student", "the students vote"). Say phone only for the
device itself ("on your phone", "the phones count down too", "Uses phone speakers").
