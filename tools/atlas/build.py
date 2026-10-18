"""The Ear Atlas: rebuild the instrument and world clips from tools/atlas/picks.json.

  python3 tools/atlas/build.py

Downloads each chosen Commons recording (cached in tools/.cache), cuts a 10 s level-matched excerpt,
writes audio/atlas/{inst,world}/<id>.mp3, audio/atlas/CREDITS.txt, and window.ATLAS in data/content.js
(including the dot world map from tools/atlas/worldmap.json).
To add an instrument or a place: append to picks.json → "inst" (id, name, family, origin, fact, title, url, lic, artist)
or "world" (id, place, region, lat, lon, style, …). Watch out: Commons files named "LL-Q…" are Lingua Libre
recordings of someone SAYING a word, not the instrument; and search hits often only mention the instrument.
"""
import json, os, re, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from commons import ROOT, download
from audio import excerpt

P = json.load(open(os.path.join(ROOT, 'tools/atlas/picks.json')))
MAP = json.load(open(os.path.join(ROOT, 'tools/atlas/worldmap.json')))
# hand-picked starts where the densest passage isn't the clearest example of the instrument
START = {'clarinet': 3.0, 'cello': 0.0, 'trombone': 0.0, 'trumpet': 4.0}
clean = lambda s: re.sub(r'\s+', ' ', s or '').strip()[:90]

A = {'map': MAP, 'instruments': [], 'world': []}
cred = ['The Ear Atlas — real recordings',
        'Every clip comes from Wikimedia Commons and is a short, level-matched excerpt (adapted: trimmed).',
        'CC BY / CC BY-SA works are credited as their licences require and shared under the same licence; public-domain and CC0 works are listed too.',
        'Piano samples: University of Iowa Electronic Music Studios (theremin.music.uiowa.edu), Steinway mf notes, freely available.', '']
for kind, key, folder in (('inst', 'instruments', 'inst'), ('world', 'world', 'world')):
    for o in P[kind]:
        ext = os.path.splitext(o['url'])[1].lower()
        src = download(o['url'], f"atlas-{kind}-{o['id']}{ext}")
        rel = f"audio/atlas/{folder}/{o['id']}.mp3"
        t0, ln, dur = excerpt(src, os.path.join(ROOT, rel), length=10.0, start=START.get(o['id']))
        title = re.sub(r'\.(ogg|oga|opus|wav|mp3|flac)$', '', o['title'], flags=re.I)
        who = clean(o.get('artist'))
        credit = f"{title}{' · ' + who if who and who.lower() not in title.lower() else ''} · {o['lic']} · Wikimedia Commons"
        fields = ('id', 'name', 'family', 'origin', 'fact') if kind == 'inst' else ('id', 'place', 'region', 'lat', 'lon', 'style')
        A[key].append({**{k: o[k] for k in fields}, 'clips': [{'src': rel, 'credit': credit}]})
        page = 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote('File:' + o['title'].replace(' ', '_'))
        cred.append(f"{rel}\n  {title}\n  Author on Commons: {who or 'unknown'}\n  Licence: {o['lic']}\n  Source: {page}\n  Excerpt: {ln} s from {t0} s of {dur} s\n")
        print(kind, o['id'], t0, flush=True)

open(os.path.join(ROOT, 'audio/atlas/CREDITS.txt'), 'w').write('\n'.join(cred))
path = os.path.join(ROOT, 'data/content.js')
s = re.sub(r'/\* ---------- The Ear Atlas:.*?\nwindow\.ATLAS=.*?;\n', '', open(path).read(), flags=re.S)
js = ('/* ---------- The Ear Atlas: real recordings of instruments and places (audio/atlas, credits in audio/atlas/CREDITS.txt) + the dot world map ---------- */\n'
      'window.ATLAS=' + json.dumps(A, ensure_ascii=False) + ';\n')
open(path, 'w').write(s.rstrip('\n') + '\n\n' + js)
print('instruments', len(A['instruments']), 'places', len(A['world']))
