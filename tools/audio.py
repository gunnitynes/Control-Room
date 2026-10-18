"""Excerpting for the game clips: pick a dense passage, level-match it, fade, encode MP3. Needs ffmpeg + numpy."""
import os, subprocess
import numpy as np

SR = 22050


def mono(src):
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(pcm, np.float32)


def densest(x, length):
    """Start (s) of the busiest `length`-second passage between 12 % and 85 % of the recording, avoiding quiet holes."""
    dur = len(x) / SR
    if dur <= length + 4:
        return 0.0
    w = int(SR * .5)
    e = np.sqrt(np.convolve(x * x, np.ones(w) / w, 'valid')[::w // 2] + 1e-12)   # 0.5 s RMS every 0.25 s
    lo, hi, n = int(len(e) * .12), int(len(e) * .85), int(length * 4)
    score = lambda k: np.median(e[k:k + n]) * min(1, np.min(e[k:k + n]) / (np.median(e[k:k + n]) + 1e-9) * 4)
    return max(range(lo, max(lo + 1, hi - n)), key=score) * .25


def excerpt(src, dst, length=10.0, start=None, rms=.1, fade_in=.08, fade_out=.6):
    """Write a `length`-second MP3 excerpt of src to dst. Returns (start, length, duration)."""
    x = mono(src)
    dur = len(x) / SR
    t0 = densest(x, length) if start is None else min(start, max(0.0, dur - length))
    ln = min(length, dur - t0)
    seg = x[int(t0 * SR):int((t0 + ln) * SR)]
    gain = 20 * np.log10(rms / max(float(np.sqrt(np.mean(seg ** 2))), 1e-6))
    peak = float(np.max(np.abs(seg))) * 10 ** (gain / 20)
    if peak > .97:
        gain -= 20 * np.log10(peak / .97)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    af = f'volume={gain:.2f}dB,afade=t=in:d={fade_in},afade=t=out:st={max(0, ln - fade_out):.2f}:d={fade_out}'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t0:.2f}', '-t', f'{ln:.2f}', '-i', src, '-af', af,
                    '-ar', '44100', '-b:a', '96k', dst], check=True)
    return round(t0, 2), round(ln, 2), round(dur, 1)


def starts(src, length=10.0, k=1, gap=6.0, have=()):
    """Up to k well-separated starts (s) for k excerpts of one recording: the densest passage first, then the next
    densest that sits at least `gap` seconds away from every one already chosen (so each excerpt sounds different)."""
    x = mono(src)
    dur = len(x) / SR
    if dur <= length + 4:   # too short for more than one excerpt
        return ([] if have else [0.0]), dur
    w = int(SR * .5)
    e = np.sqrt(np.convolve(x * x, np.ones(w) / w, 'valid')[::w // 2] + 1e-12)
    lo, hi, n = int(len(e) * .06), int(len(e) * .92), int(length * 4)
    cand = list(range(lo, max(lo + 1, hi - n)))
    score = {k_: np.median(e[k_:k_ + n]) * min(1, np.min(e[k_:k_ + n]) / (np.median(e[k_:k_ + n]) + 1e-9) * 4) for k_ in cand}
    out = list(have)   # excerpts that already exist count as taken
    for c in sorted(cand, key=lambda c: -score[c]):
        t = c * .25
        if all(abs(t - o) >= length + gap for o in out):
            out.append(t)
        if len(out) >= k:
            break
    return [t for t in out if t not in have], dur
