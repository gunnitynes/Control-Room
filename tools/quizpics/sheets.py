"""Step 2: contact sheets of the candidates (tools/.cache/qp/sheet-N.jpg) so a person can pick the right photo for each item.
Each row: the item, then its candidates numbered 0-5. Picks go into picks.json as {id: index}."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from commons import download, CACHE
from gear import GEAR
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
cand = json.load(open(os.path.join(HERE, 'cand.json')))
only = set(sys.argv[1].split(',')) if len(sys.argv) > 1 else None
rows = [(g[0], g[1]) for g in GEAR if g[0] in cand and (not only or g[0] in only)]
W, H, LW = 210, 160, 190
font = ImageFont.load_default(size=16)
os.makedirs(os.path.join(CACHE, 'qp'), exist_ok=True)
for s in range(0, len(rows), 10):
    part = rows[s:s + 10]
    sheet = Image.new('RGB', (LW + 6 * W, len(part) * H), 'white'); d = ImageDraw.Draw(sheet)
    for r, (gid, name) in enumerate(part):
        d.text((6, r * H + 8), gid + '\n' + name, fill='black', font=font)
        for k, c in enumerate(cand[gid][:6]):
            try:
                f = download(c['thumb'].split('?')[0], 'qp/' + gid + '-' + str(k) + '.jpg')
                im = Image.open(f).convert('RGB'); im.thumbnail((W - 8, H - 26))
                sheet.paste(im, (LW + k * W + 4, r * H + 22))
            except Exception as e:
                print('skip', gid, k, e)
            d.text((LW + k * W + 6, r * H + 2), str(k), fill='red', font=font)
        d.line((0, r * H + H - 1, sheet.width, r * H + H - 1), fill='#999')
    out = os.path.join(CACHE, 'qp', 'sheet-%d.jpg' % (s // 10))
    sheet.save(out, quality=82); print(out, flush=True)
