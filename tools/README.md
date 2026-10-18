# Tools: building the audio clips

The game only needs the committed MP3s in `audio/`. These scripts rebuild them, or add more.
They need `python3` with `numpy`, `ffmpeg`, and `curl`. Downloads are cached in `tools/.cache/` (git-ignored).

| script | builds |
|---|---|
| `python3 tools/eras/build.py` | Sample Chronologist: `audio/eras/*.mp3`, its CREDITS.txt, `ERA_DECADES[*].clips` in data/content.js |
| `python3 tools/atlas/piano.py` | Ear Atlas piano: `audio/atlas/piano/C2…C6.mp3` (University of Iowa EMS Steinway) |
| `python3 tools/atlas/build.py` | Ear Atlas instruments + places: `audio/atlas/{inst,world}/*.mp3`, CREDITS.txt, `window.ATLAS`. Only builds clips that don't exist yet (`--force` rebuilds); each pick can list `more` recordings, and each recording gives 2–3 different 10 s excerpts. `tools/atlas/built.json` remembers what was cut from where, so old downloads are never needed again. |
| `python3 tools/atlas/worldmap.py` | the dot map in `tools/atlas/worldmap.json` (Natural Earth 110m land) |

What gets used is decided in the `picks.json` next to each script, with the exact Commons file, licence and author.
To add a recording, add an entry there and run the build. `tools/atlas/research/` holds the searches used to
find candidates.

Rules that matter:

- Only public domain, CC0, CC BY or CC BY-SA. The builds write credits automatically; keep them.
- Commons files named `LL-Q…` are Lingua Libre recordings of someone saying a word, not instruments.
- Commons rate-limits hard (HTTP 429). `commons.py` sleeps between requests; run one script at a time.
- Bump the `?v=N` cache-buster in index.html after changing data/content.js.

| `python3 tools/presets/build.py` | Preset Archeologist: `audio/presets/<machine>-<n>.mp3` from `tools/presets/picks.json` (Wikimedia Commons + Freesound CC0/CC BY recordings of each machine), CREDITS.txt, `window.PRESETS`. Same incremental scheme as the Atlas (`built.json`, `drop`). |

Freesound search pages can be read without an account; a sound's preview is `cdn.freesound.org/previews/…-hq.mp3`. Only use sounds whose title names the machine, and CC0 / CC BY only.
