"""Step 3: download the picked photos, shrink them to webp in images/quiz/, and write data/quiz-pics.js + images/quiz/CREDITS.txt.
picks.json: {id: candidate index from the contact sheet}. Items without a pick are left out."""
import html, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from commons import download, ROOT
from gear import GEAR
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
cand = json.load(open(os.path.join(HERE, 'cand.json')))
picks = json.load(open(os.path.join(HERE, 'picks.json')))
OUTD = os.path.join(ROOT, 'images', 'quiz'); os.makedirs(OUTD, exist_ok=True)
# what each piece is: microphone type, what a box does, and who made it
TYPE = {'sm57':'Dynamic','sm58':'Dynamic','sm7b':'Dynamic','u87':'Condenser','u47':'Tube condenser','km184':'Condenser','c414':'Condenser','d112':'Dynamic',
  'md421':'Dynamic','re20':'Dynamic','rca44':'Ribbon','rca77':'Ribbon','m160':'Ribbon','shure55':'Dynamic','c12':'Tube condenser','e609':'Dynamic',
  'la2a':'Compressor','u1176':'Compressor','pultec':'EQ','fairchild':'Compressor','neve1073':'Mic preamp + EQ','dbx160':'Compressor','lex480':'Reverb',
  'lex224':'Reverb','emt140':'Reverb','h3000':'Pitch shifter / multi-effect','re201':'Tape echo','echoplex':'Tape echo','api500':'Channel rack',
  'distressor':'Compressor','aphex':'Exciter','binson':'Tape echo','leslie':'Rotating speaker'}
MAKER = {'Shure':'Shure','Neumann':'Neumann','AKG':'AKG','Sennheiser':'Sennheiser','Electro-Voice':'Electro-Voice','RCA':'RCA','Beyerdynamic':'Beyerdynamic',
  'Roland':'Roland','Yamaha':'Yamaha','Korg':'Korg','ARP':'ARP','Sequential':'Sequential','Oberheim':'Oberheim','EMS':'EMS','Akai':'Akai','E-mu':'E-mu',
  'Ensoniq':'Ensoniq','Linn':'Linn','LinnDrum':'Linn','Minimoog':'Moog','Moog':'Moog','Teenage':'Teenage Engineering','Hammond':'Hammond','Fender':'Fender',
  'Hohner':'Hohner','Wurlitzer':'Wurlitzer','Fairlight':'Fairlight','Synclavier':'New England Digital','Buchla':'Buchla'}
def clean(h):
    t = html.unescape(re.sub(r'<[^>]+>', '', h or '')).strip()
    return re.sub(r'\s+', ' ', t)[:80] or 'unknown'
out, credits = [], []
for gid, name, q, cat, kind in GEAR:
    if gid not in picks: continue
    c = cand[gid][picks[gid]]
    big = (re.sub(r'/\d+px-', '/960px-', c['thumb']) if c['w'] > 960 else c['url']).split('?')[0]
    f = download(big, 'qp/full-' + gid + os.path.splitext(big)[1].split('?')[0])
    im = Image.open(f).convert('RGB'); im.thumbnail((960, 720))
    dest = os.path.join(OUTD, gid + '.webp'); im.save(dest, 'WEBP', quality=78)
    artist = clean(c['artist'])
    item = {'id': gid, 'name': name, 'cat': cat, 'kind': kind, 'src': 'images/quiz/' + gid + '.webp',
            'credit': f"Photo: {artist} · {c['lic']} · Wikimedia Commons"}
    if gid in TYPE: item['type'] = TYPE[gid]
    mk = MAKER.get(name.split(' ')[0]) or MAKER.get(name.split('-')[0])
    if mk and kind in ('mic', 'synth', 'drum', 'sampler', 'keys'): item['maker'] = mk
    out.append(item); credits.append(f"{gid}.webp: {c['title']} by {artist}, {c['lic']}, {c['page']}")
    print(gid, os.path.getsize(dest) // 1024, 'KB', flush=True)
js = ('/* The Machine Room picture questions. Built by tools/quizpics/build.py from Wikimedia Commons photos\n'
      '   (credits in images/quiz/CREDITS.txt and on every reveal). The Quiz turns each into name / type / maker questions. */\n'
      'window.QUIZ_PICS=' + json.dumps(out, ensure_ascii=False, indent=0) + ';\n')
open(os.path.join(ROOT, 'data', 'quiz-pics.js'), 'w').write(js)
open(os.path.join(OUTD, 'CREDITS.txt'), 'w').write('Photos from Wikimedia Commons, used under their licences:\n\n' + '\n'.join(credits) + '\n')
print(len(out), 'pictures')
