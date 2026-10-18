# Tools: building the audio clips

The game only needs the committed MP3s in `audio/`. These scripts rebuild them, or add more.
They need `python3` with `numpy`, `ffmpeg`, and `curl`. Downloads are cached in `tools/.cache/` (git-ignored).

| script | builds |
|---|---|
| `python3 tools/eras/build.py` | Sample Chronologist: `audio/eras/*.mp3`, its CREDITS.txt, `ERA_DECADES[*].clips` in data/content.js |
| `python3 tools/atlas/piano.py` | Ear Atlas piano: `audio/atlas/piano/C2…C6.mp3` (University of Iowa EMS Steinway) |
| `python3 tools/atlas/build.py` | Ear Atlas instruments + places: `audio/atlas/{inst,world}/*.mp3`, CREDITS.txt, `window.ATLAS` |
| `python3 tools/atlas/worldmap.py` | the dot map in `tools/atlas/worldmap.json` (Natural Earth 110m land) |

What gets used is decided in the `picks.json` next to each script, with the exact Commons file, licence and author.
To add a recording, add an entry there and run the build. `tools/atlas/research/` holds the searches used to
find candidates.

Rules that matter:

- Only public domain, CC0, CC BY or CC BY-SA. The builds write credits automatically; keep them.
- Commons files named `LL-Q…` are Lingua Libre recordings of someone saying a word, not instruments.
- Commons rate-limits hard (HTTP 429). `commons.py` sleeps between requests; run one script at a time.
- Bump the `?v=N` cache-buster in index.html after changing data/content.js.

Preset Archeologist samples (`audio/presets/`) were cut by hand; their sources are listed in `audio/presets/CREDITS.txt`.
