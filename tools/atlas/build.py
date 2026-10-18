"""The Ear Atlas: build the instrument and world clips from tools/atlas/picks.json.

  python3 tools/atlas/build.py            # only builds clips that don't exist yet
  python3 tools/atlas/build.py --force    # rebuild everything

Each pick names one Commons recording (title, url, lic, artist) plus optional `more` recordings, and `cuts`:
how many different 10 s excerpts to take from each recording (default 2 for instruments, 3 for places; short
recordings give one). Files: audio/atlas/{inst,world}/<id>.mp3, <id>-2.mp3, … What was cut from where is kept in
tools/atlas/built.json, so a later run never needs the old downloads again. Writes audio/atlas/CREDITS.txt and
window.ATLAS in data/content.js (with the dot world map from tools/atlas/worldmap.json).
Watch out: Commons files named "LL-Q…" are Lingua Libre recordings of someone SAYING a word, not the instrument.
"""
import json, os, re, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from commons import ROOT, download
from audio import excerpt, starts

FORCE = '--force' in sys.argv
P = json.load(open(os.path.join(ROOT, 'tools/atlas/picks.json')))
MAP = json.load(open(os.path.join(ROOT, 'tools/atlas/worldmap.json')))
BUILT_P = os.path.join(ROOT, 'tools/atlas/built.json')
BUILT = {} if FORCE else json.load(open(BUILT_P)) if os.path.exists(BUILT_P) else {}
START = {'clarinet': 3.0, 'cello': 0.0, 'trombone': 0.0, 'trumpet': 4.0}   # hand-picked first excerpts
clean = lambda s: re.sub(r'\s+', ' ', s or '').strip()[:90]
# the eight broad families for the "Which family?" question
FAM = lambda f: ('Voice' if re.search(r'voice|vocal|sing', f, re.I) else 'Electronic' if re.search(r'electronic', f, re.I)
                 else 'Bowed strings' if re.search(r'bowed', f, re.I) else 'Plucked & struck strings' if re.search(r'pluck|hammered|struck', f, re.I) and not re.search(r'idiophone', f, re.I)
                 else 'Brass' if re.search(r'^brass', f, re.I) else 'Woodwind & reeds' if re.search(r'wood|reed|wind|pipe', f, re.I) and not re.search(r'keyboard', f, re.I)
                 else 'Keyboard' if re.search(r'keyboard', f, re.I) else 'Percussion')

A = {'map': MAP, 'instruments': [], 'world': []}
cred = ['The Ear Atlas — real recordings',
        'Every clip comes from Wikimedia Commons and is a short, level-matched excerpt (adapted: trimmed).',
        'CC BY / CC BY-SA works are credited as their licences require and shared under the same licence; public-domain and CC0 works are listed too.',
        'Piano samples: University of Iowa Electronic Music Studios (theremin.music.uiowa.edu), Steinway mf notes, freely available.', '']
for kind, key, folder in (('inst', 'instruments', 'inst'), ('world', 'world', 'world')):
    for o in P[kind]:
        srcs = [{k: o[k] for k in ('title', 'url', 'lic', 'artist') if k in o} | {'cuts': o.get('cuts'), 'style': None}] + o.get('more', [])
        clips, n = [], 0
        for si, s in enumerate(srcs):
            k = s.get('cuts') or (3 if len(srcs) == 1 else 2)   # one recording: three excerpts; several: two each
            title = re.sub(r'\.(ogg|oga|opus|wav|mp3|flac)$', '', s['title'], flags=re.I)
            who = clean(s.get('artist'))
            page = 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote('File:' + s['title'].replace(' ', '_'))
            names = [f"audio/atlas/{folder}/{o['id']}{'' if n + j == 0 else '-' + str(n + j + 1)}.mp3" for j in range(k)]
            have = [r for r in names if r in BUILT and os.path.exists(os.path.join(ROOT, r)) and BUILT[r].get('page') == page]
            names = [r for r in names if os.path.basename(r) not in o.get('drop', [])]   # clips judged unusable
            have = [r for r in have if r in names]
            todo = [r for r in names if r not in have]
            if todo:
                try:
                    src = download(s['url'], f"atlas-{kind}-{o['id']}-{si}{os.path.splitext(urllib.parse.urlparse(s['url']).path)[1].lower()}")
                except SystemExit as e:
                    print('  SKIP (download failed)', o['id'], s['title'], flush=True); continue
                first = START.get(o['id']) if n == 0 and not have else None
                try:
                    ts = ([first] + starts(src, 10.0, len(names), have=[first])[0]) if first is not None else starts(src, 10.0, len(names), have=[BUILT[r]['t0'] for r in have])[0]
                except Exception as e:
                    print('  SKIP (could not read)', o['id'], s['title'], e, flush=True); ts = []
                for r, t in zip(todo, ts):
                    try:
                        t0, ln, dur = excerpt(src, os.path.join(ROOT, r), length=10.0, start=t)
                    except Exception as e:
                        print('  SKIP (could not cut)', r, e, flush=True); continue
                    BUILT[r] = {'title': title, 'who': who, 'lic': s['lic'], 'page': page, 't0': t0, 'ln': ln, 'dur': dur}
                    print(kind, r, t0, flush=True)
                json.dump(BUILT, open(BUILT_P, 'w'), ensure_ascii=False, indent=1)
            for r in names:
                if r not in BUILT or not os.path.exists(os.path.join(ROOT, r)) or BUILT[r]['page'] != page:
                    continue
                b = BUILT[r]
                credit = f"{b['title']}{' · ' + b['who'] if b['who'] and b['who'].lower() not in b['title'].lower() else ''} · {b['lic']} · Wikimedia Commons"
                clips.append({'src': r, 'credit': credit, **({'style': s['style']} if s.get('style') else {})})
                cred.append(f"{r}\n  {b['title']}\n  Author on Commons: {b['who'] or 'unknown'}\n  Licence: {b['lic']}\n  Source: {b['page']}\n  Excerpt: {b['ln']} s from {b['t0']} s of {b['dur']} s\n")
            n += len(names)
        if not clips:
            print('  NO CLIPS', o['id'], flush=True); continue
        fields = ('id', 'name', 'family', 'origin', 'fact') if kind == 'inst' else ('id', 'place', 'region', 'lat', 'lon', 'style')
        e = {k: o[k] for k in fields if k in o}
        if kind == 'inst':
            e['fam'] = o.get('fam') or FAM(o['family'])
        A[key].append({**e, 'clips': clips})

open(os.path.join(ROOT, 'audio/atlas/CREDITS.txt'), 'w').write('\n'.join(cred))
path = os.path.join(ROOT, 'data/content.js')
s = re.sub(r'/\* ---------- The Ear Atlas:.*?\nwindow\.ATLAS=.*?;\n', '', open(path).read(), flags=re.S)
js = ('/* ---------- The Ear Atlas: real recordings of instruments and places (audio/atlas, credits in audio/atlas/CREDITS.txt) + the dot world map ---------- */\n'
      'window.ATLAS=' + json.dumps(A, ensure_ascii=False) + ';\n')
open(path, 'w').write(s.rstrip('\n') + '\n\n' + js)
print('instruments', len(A['instruments']), 'places', len(A['world']), 'clips', sum(len(x['clips']) for x in A['instruments'] + A['world']))
