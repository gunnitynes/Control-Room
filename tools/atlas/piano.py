"""The Ear Atlas piano: University of Iowa EMS Steinway, mezzo-forte, one note per key C2–C6.

  python3 tools/atlas/piano.py

Downloads the AIFFs (cached in tools/.cache), trims each to 3.4 s from the attack with a 1 s fade,
folds to mono and peak-normalises to −3 dB → audio/atlas/piano/<Name><octave>.mp3 (C4.mp3, Db4.mp3 …).
Source: https://theremin.music.uiowa.edu/MISpiano.html ("freely available", credited in the game note).
"""
import os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from commons import ROOT, download

NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
BASE = 'https://theremin.music.uiowa.edu/sound%20files/MIS/Piano_Other/piano/'
OUT = os.path.join(ROOT, 'audio/atlas/piano')
os.makedirs(OUT, exist_ok=True)
notes = [f'{n}{o}' for o in (2, 3, 4, 5) for n in NAMES] + ['C6']
for note in notes:
    src = download(BASE + f'Piano.mf.{note}.aiff', f'piano-{note}.aiff')
    tmp = src + '.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af',
                    'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.002,atrim=0:3.4,'
                    'afade=t=out:st=2.4:d=1.0,pan=mono|c0=0.5*c0+0.5*c1', tmp], check=True)
    probe = subprocess.run(['ffmpeg', '-v', 'info', '-i', tmp, '-af', 'volumedetect', '-f', 'null', os.devnull], capture_output=True, text=True).stderr
    peak = float(re.search(r'max_volume: ([-0-9.]+)', probe).group(1))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', f'volume={-3 - peak:.2f}dB', '-ar', '44100', '-b:a', '96k',
                    os.path.join(OUT, note + '.mp3')], check=True)
    os.remove(tmp)
    print(note, flush=True)
