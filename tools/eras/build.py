"""Sample Chronologist: rebuild audio/eras from tools/eras/picks.json.

  python3 tools/eras/build.py

Downloads each chosen Commons recording (cached in tools/.cache), cuts an 8 s excerpt from the
same start as before (or the densest passage for new picks), writes audio/eras/*.mp3,
audio/eras/CREDITS.txt, and the ERA_DECADES[*].clips block in data/content.js.
To add a recording: append an entry to picks.json (decade, artist, title, year, url, page, licence, author).
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from commons import ROOT, download
from audio import excerpt

PICKS = json.load(open(os.path.join(ROOT, 'tools/eras/picks.json')))
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:40]

clips, credits = {}, ['Sample Chronologist — real recordings by decade',
                      'All files from Wikimedia Commons, trimmed to 8-second excerpts and level-matched.',
                      'Public-domain recordings need no credit but are listed anyway. CC BY / CC BY-SA works are credited as their licences require; the excerpts are adapted (trimmed) and shared under the same licence.', '']
for i, p in enumerate(PICKS):
    ext = os.path.splitext(p['url'])[1]
    src = download(p['url'], f"eras-{i:02d}{ext}")
    out = p.get('file') or f"{p['decade']}-{slug(p['artist'] + ' ' + p['title'])}.mp3"
    p['file'] = out
    t0, ln, dur = excerpt(src, os.path.join(ROOT, 'audio/eras', out), length=8.0, start=p.get('start'), fade_in=.15, fade_out=.5)
    p['start'] = t0
    credit = f"{p['artist']} – “{p['title']}” ({p['year']}) · {p['licence']} · Wikimedia Commons"
    clips.setdefault(p['decade'], []).append({'src': 'audio/eras/' + out, 'title': f"{p['artist']} – {p['title']} ({p['year']})", 'credit': credit})
    credits.append(f"{out}\n  {p['artist']} – \"{p['title']}\" ({p['year']})\n  Source: {p['page']}\n  Author on Commons: {p.get('author') or 'unknown'}\n  Licence: {p['licence']}\n")
    print(p['decade'], out, 'from', t0, 's', flush=True)

open(os.path.join(ROOT, 'audio/eras/CREDITS.txt'), 'w').write('\n'.join(credits))
js = '\n'.join(f"window.ERA_DECADES[{d}].clips={json.dumps(v, ensure_ascii=False)};" for d, v in sorted(clips.items()))
path = os.path.join(ROOT, 'data/content.js')
s = re.sub(r'/\*CLIPS\*/.*?/\*END CLIPS\*/', '/*CLIPS*/', open(path).read(), flags=re.S)
open(path, 'w').write(s.replace('/*CLIPS*/', '/*CLIPS*/\n' + js + '\n/*END CLIPS*/', 1))
json.dump(PICKS, open(os.path.join(ROOT, 'tools/eras/picks.json'), 'w'), ensure_ascii=False, indent=1)
print({d: len(v) for d, v in sorted(clips.items())})
