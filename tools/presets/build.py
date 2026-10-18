"""Preset Archeologist: build the machine clips from tools/presets/picks.json.

  python3 tools/presets/build.py           # only builds clips that don't exist yet
  python3 tools/presets/build.py --force   # rebuild everything

Every machine is a real recording (Wikimedia Commons or Freesound, CC0 / CC BY / CC BY-SA / public domain), never a
browser imitation. Each recording gives up to 3 different excerpts (shorter ones: one), at most 5 clips per machine.
Files: audio/presets/<id>-<n>.mp3; what was cut from where lives in tools/presets/built.json. Writes
audio/presets/CREDITS.txt and window.PRESETS in data/content.js. A source {"type":"kit","kit":"tr808"} plays the real
TR-808 one-shots (audio/presets/808-*.wav) as a groove in the browser.
"""
import json, os, re, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from commons import ROOT, download
from audio import excerpt, starts

FORCE = '--force' in sys.argv
P = json.load(open(os.path.join(ROOT, 'tools/presets/picks.json')))
BP = os.path.join(ROOT, 'tools/presets/built.json')
BUILT = {} if FORCE or not os.path.exists(BP) else json.load(open(BP))
MAXCLIPS = 5
cred = ['Preset Archeologist — sound credits',
        'Every clip is a short, level-matched excerpt (adapted: trimmed) of a real recording of the machine.',
        'CC BY / CC BY-SA works are credited as their licences require and shared under the same licence.', '',
        '808-*.wav   Roland TR-808 one-shots sampled directly from a TR-808 by Michael Fischer (Technopolis), free sample set',
        '            ("ABSOLUTELY FREE!"), via machines.hyperreal.org / the npm package @fluid-music/tr-808.', '']
OUT = []
for o in P:
    clips, n = [], 0
    srcs = o['sources']
    for si, s in enumerate(srcs):
        if s['type'] == 'kit':
            clips.append({'kit': s['kit'], 'credit': 'Real TR-808 one-shots sampled by Michael Fischer (Technopolis), played as a groove'}); continue
        if len(clips) >= MAXCLIPS: break
        k = min(3 if len(srcs) == 1 else 2, MAXCLIPS - len(clips))
        page = ('https://freesound.org/s/%s/' % s['id']) if s['type'] == 'freesound' else 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote('File:' + s['title'].replace(' ', '_'))
        title = re.sub(r'\.(ogg|oga|opus|wav|mp3|flac|aif|aiff)$', '', s['title'], flags=re.I)
        where = 'Freesound' if s['type'] == 'freesound' else 'Wikimedia Commons'
        names = ['audio/presets/%s-%d.mp3' % (o['id'], n + j + 1) for j in range(k)]
        names = [r for r in names if os.path.basename(r) not in o.get('drop', [])]   # excerpts judged unusable
        have = [r for r in names if r in BUILT and BUILT[r]['page'] == page and os.path.exists(os.path.join(ROOT, r))]
        todo = [r for r in names if r not in have]
        if todo:
            ext = os.path.splitext(urllib.parse.urlparse(s['url']).path)[1].lower() or '.mp3'
            try:
                src = download(s['url'], 'preset-%s-%d%s' % (o['id'], si, ext))
                ts = starts(src, 10.0, len(names), have=[BUILT[r]['t0'] for r in have])[0]
            except (SystemExit, Exception) as e:
                print('  SKIP', o['id'], s['title'], e, flush=True); ts = []
            for r, t in zip(todo, ts):
                try:
                    t0, ln, dur = excerpt(src, os.path.join(ROOT, r), length=10.0, start=t)
                except Exception as e:
                    print('  SKIP cut', r, e, flush=True); continue
                BUILT[r] = {'title': title, 'who': s.get('artist', ''), 'lic': s['lic'], 'page': page, 'where': where, 't0': t0, 'ln': ln, 'dur': dur}
                print(o['id'], r, t0, flush=True)
            json.dump(BUILT, open(BP, 'w'), ensure_ascii=False, indent=1)
        for r in names:
            if r not in BUILT or BUILT[r]['page'] != page or not os.path.exists(os.path.join(ROOT, r)): continue
            b = BUILT[r]
            clips.append({'src': r, 'credit': f"{b['title']} · {b['who'] or 'unknown'} · {b['lic']} · {b['where']}"})
            cred.append(f"{r}\n  {b['title']}\n  Author: {b['who'] or 'unknown'}\n  Licence: {b['lic']}\n  Source: {b['page']}\n  Excerpt: {b['ln']} s from {b['t0']} s of {b['dur']} s\n")
        n += len(names)
    if clips:
        OUT.append({k: o[k] for k in ('id', 'name', 'year', 'kind', 'fact')} | {'clips': clips[:MAXCLIPS + 1]})
    else:
        print('  NO CLIPS', o['id'], flush=True)

open(os.path.join(ROOT, 'audio/presets/CREDITS.txt'), 'w').write('\n'.join(cred))
path = os.path.join(ROOT, 'data/content.js')
s = open(path).read()
s = re.sub(r'window\.PRESETS=\[.*?\n\];\n', '', s, flags=re.S)
s = re.sub(r'/\* ---------- Preset Archeologist:.*?\nwindow\.PRESETS=.*?;\n', '', s, flags=re.S)
js = ('/* ---------- Preset Archeologist: real recordings of classic machines (audio/presets, credits in audio/presets/CREDITS.txt) ---------- */\n'
      'window.PRESETS=' + json.dumps(OUT, ensure_ascii=False) + ';\n')
open(path, 'w').write(s.rstrip('\n') + '\n\n' + js)
print('machines', len(OUT), 'clips', sum(len(x['clips']) for x in OUT))
