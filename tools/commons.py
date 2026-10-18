"""Small helpers for Wikimedia Commons: the API (with polite rate limiting) and file downloads.

Commons rate-limits hard (HTTP 429). Keep one request at a time, sleep between them,
and send a User-Agent with contact details, as the Wikimedia policy asks.
Downloads go to tools/.cache (git-ignored); only the trimmed excerpts are committed.
"""
import json, os, subprocess, time, urllib.error, urllib.parse, urllib.request

UA = 'ControlRoomClassroom/1.0 (https://gunnitynes.github.io/Control-Room; gunnitynes@gmail.com)'
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(HERE, '.cache')


def api(**params):
    params.update(format='json')
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params)
    for attempt in range(6):
        try:
            time.sleep(1.0)
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60))
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(10 * (attempt + 1))
    raise SystemExit('Commons keeps rate-limiting (429). Wait a few minutes and run again.')


def members(cat, typ='file|subcat', cap=2000):
    out, cont = [], {}
    while True:
        d = api(action='query', list='categorymembers', cmtitle=cat, cmlimit=500, cmtype=typ, **cont)
        out += d['query']['categorymembers']
        if 'continue' in d and len(out) < cap:
            cont = {'cmcontinue': d['continue']['cmcontinue']}
        else:
            return out


def download(url, name):
    """Download once into tools/.cache/<name>; curl copes with Commons' upload server better than urllib."""
    os.makedirs(CACHE, exist_ok=True)
    dest = os.path.join(CACHE, name)
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        return dest
    for attempt in range(6):
        r = subprocess.run(['curl', '-sL', '-o', dest, '-w', '%{http_code}', '-A', UA, url], capture_output=True, text=True)
        if r.stdout == '200' and os.path.getsize(dest) > 1000 and not open(dest, 'rb').read(15).lower().startswith(b'<!doctype html'):
            time.sleep(1)
            return dest
        print('  retrying', name, r.stdout, flush=True)
        time.sleep(20 * (attempt + 1))
    raise SystemExit('Could not download ' + url)
