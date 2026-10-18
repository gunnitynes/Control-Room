"""The Ear Atlas dot map: rasterise Natural Earth 110m land (public domain) into a 104 × 46 dot grid.

  python3 tools/atlas/worldmap.py      → tools/atlas/worldmap.json (then run build.py to put it in content.js)

Rows are bit strings packed as hex; the game unpacks them with BigInt. Equirectangular, 80°N to 58°S.
"""
import json, os, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from commons import ROOT, UA

URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'
W, H, LAT0, LAT1 = 104, 46, 80, -58
g = json.load(urllib.request.urlopen(urllib.request.Request(URL, headers={'User-Agent': UA})))
rings = []
for f in g['features']:
    geo = f['geometry']
    polys = [geo['coordinates']] if geo['type'] == 'Polygon' else geo['coordinates']
    rings += [p[0] for p in polys]


def inside(x, y, ring):
    c, j = False, len(ring) - 1
    for i in range(len(ring)):
        (xi, yi), (xj, yj) = ring[i], ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi:
            c = not c
        j = i
    return c


rows = []
for r in range(H):
    lat = LAT0 + (LAT1 - LAT0) * (r + .5) / H
    rows.append(''.join('1' if any(inside(-180 + 360 * (c + .5) / W, lat, p) for p in rings) else '0' for c in range(W)))
print('\n'.join(x.replace('0', ' ').replace('1', '#') for x in rows))
json.dump({'w': W, 'h': H, 'lat0': LAT0, 'lat1': LAT1, 'rows': [hex(int(x, 2))[2:].rjust(W // 4 + 1, '0') for x in rows]},
          open(os.path.join(ROOT, 'tools/atlas/worldmap.json'), 'w'))
