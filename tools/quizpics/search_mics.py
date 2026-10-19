"""Search Commons harder for the listed mics: the gear's own category first, then full-text searches.
Adds to cand.json under each mic id (keeps up to 12 candidates)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from commons import api
from mics import MICS
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'cand.json')
cand = json.load(open(OUT))
OK = ('cc-by', 'cc-by-sa', 'cc0', 'public domain', 'pd', 'cc by', 'cc by-sa', 'attribution')
def info(titles):
    out = []
    for i in range(0, len(titles), 40):
        d = api(action='query', titles='|'.join(titles[i:i+40]), prop='imageinfo', iiprop='url|extmetadata|size', iiurlwidth=420)
        for p in (d.get('query') or {}).get('pages', {}).values():
            ii = (p.get('imageinfo') or [{}])[0]; md = ii.get('extmetadata', {}); lic = md.get('LicenseShortName', {}).get('value', '')
            if not any(lic.lower().startswith(o) for o in OK) or ii.get('width', 0) < 450: continue
            out.append({'title': p['title'], 'thumb': ii.get('thumburl'), 'url': ii.get('url'), 'page': ii.get('descriptionurl'), 'lic': lic,
                        'artist': md.get('Artist', {}).get('value', ''), 'w': ii.get('width'), 'h': ii.get('height')})
    return out
for mid, name, *_rest, queries in MICS:
    titles = []
    for q in queries:
        try:
            m = api(action='query', list='categorymembers', cmtitle='Category:' + q, cmtype='file', cmlimit=30)
            titles += [x['title'] for x in m['query']['categorymembers'] if x['title'].lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
        except Exception: pass
        d = api(action='query', list='search', srsearch=q + ' filetype:bitmap', srnamespace=6, srlimit=10)
        titles += [x['title'] for x in d['query']['search']]
    seen = []; [seen.append(t) for t in titles if t not in seen]
    L = info(seen[:40])
    keep = [c for c in (cand.get(mid) or [])]
    for c in L:
        if all(c['title'] != k['title'] for k in keep): keep.append(c)
    cand[mid] = keep[:12]
    print(mid, len(cand[mid]), flush=True); json.dump(cand, open(OUT, 'w'), indent=1)
