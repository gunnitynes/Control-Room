"""Step 1: search Commons for each piece of gear and save the top candidates (with licence and thumbnail) to cand.json."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from commons import api
from gear import GEAR
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'cand.json')
cand = json.load(open(OUT)) if os.path.exists(OUT) else {}
OK = ('cc-by', 'cc-by-sa', 'cc0', 'public domain', 'pd', 'cc by', 'cc by-sa', 'attribution')
for gid, name, q, cat, kind in GEAR:
    if gid in cand: continue
    d = api(action='query', generator='search', gsrsearch=q + ' filetype:bitmap', gsrnamespace=6, gsrlimit=8,
            prop='imageinfo', iiprop='url|extmetadata|size', iiurlwidth=420)
    pages = sorted((d.get('query') or {}).get('pages', {}).values(), key=lambda p: p.get('index', 99))
    L = []
    for p in pages:
        ii = (p.get('imageinfo') or [{}])[0]; md = ii.get('extmetadata', {})
        lic = md.get('LicenseShortName', {}).get('value', '')
        if not any(lic.lower().startswith(o) for o in OK): continue
        if ii.get('width', 0) < 500: continue
        L.append({'title': p['title'], 'thumb': ii.get('thumburl'), 'url': ii.get('url'), 'page': ii.get('descriptionurl'),
                  'lic': lic, 'artist': md.get('Artist', {}).get('value', ''), 'w': ii.get('width'), 'h': ii.get('height')})
        if len(L) == 6: break
    cand[gid] = L
    print(gid, len(L), flush=True)
    json.dump(cand, open(OUT, 'w'), indent=1)
