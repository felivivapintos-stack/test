"""Generate per-line voiceover with Kokoro (local, free), assemble one track per video.

Usage: tts.py <out_dir> [day ...]
Writes <out_dir>/dayNN.mp3 and <out_dir>/dayNN.json (beat timings).
"""
import json, os, re, subprocess, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

sys.path.insert(0, os.path.dirname(__file__))
from content import all_videos

MODELS = os.environ.get("KOKORO_DIR", "kmodels")
VOICE = {"bb": "af_bella", "sg": "af_heart"}
SPEED = 1.08
LEAD, BEAT_GAP, SCENE_GAP, CTA_GAP, TAIL = 0.30, 0.22, 0.42, 0.50, 1.10

# Spoken-form fixes (captions keep the original text).
SAY = [
    (r"\bZajonc\b", "Zyonts"),
    (r"\bEbbinghaus\b", "Ebbing house"),
    (r"Baader-Meinhof", "Bahder Mine-hoff"),
    (r"three A\.M\.", "three A M"),
    (r"F, B, I, C, I, A, U, S, A", "F. B. I. C. I. A. U. S. A."),
    (r"FBI, CIA, USA", "F B I, C I A, U S A"),
    (r"\bIKEA\b", "eye-KEE-ah"),
    (r"\bCCTV\b", "C C T V"),
    (r"B-minus", "B minus"),
    (r"B-plus", "B plus"),
    (r"MindGlitch", "Mind Glitch"),
]

def spoken(t):
    for a, b in SAY:
        t = re.sub(a, b, t)
    return t

def trim(x, sr, thr=0.003):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(0.09 * sr)); b = min(len(x), idx[-1] + int(0.10 * sr))
    return x[a:b]

def main():
    out = sys.argv[1]; days = {int(d) for d in sys.argv[2:]}
    os.makedirs(out, exist_ok=True)
    k = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
    for v in all_videos():
        if days and v["day"] not in days:
            continue
        sr = 24000
        pieces, t = [np.zeros(int(LEAD * sr), np.float32)], LEAD
        timing = {"day": v["day"], "series": v["series"], "scenes": []}
        lines = [[b["vo"] for b in s["beats"]] for s in v["scenes"]] + [[v["cta"]["vo"]]]
        for si, scene in enumerate(lines):
            if si:
                gap = CTA_GAP if si == len(lines) - 1 else SCENE_GAP
                pieces.append(np.zeros(int(gap * sr), np.float32)); t += gap
            st = {"beats": []}
            for bi, line in enumerate(scene):
                if bi:
                    pieces.append(np.zeros(int(BEAT_GAP * sr), np.float32)); t += BEAT_GAP
                audio, sr2 = k.create(spoken(line), voice=VOICE[v["series"]], speed=SPEED, lang="en-us")
                assert sr2 == sr
                audio = trim(audio.astype(np.float32), sr)
                d = len(audio) / sr
                st["beats"].append({"start": round(t, 3), "end": round(t + d, 3), "text": line})
                pieces.append(audio); t += d
            timing["scenes"].append(st)
        pieces.append(np.zeros(int(TAIL * sr), np.float32)); t += TAIL
        timing["duration"] = round(t, 3)
        wav = f"{out}/day{v['day']:02d}.wav"
        sf.write(wav, np.concatenate(pieces), sr)
        mp3 = f"{out}/day{v['day']:02d}.mp3"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav,
                        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100", "-b:a", "192k", mp3], check=True)
        json.dump(timing, open(f"{out}/day{v['day']:02d}.json", "w"), indent=1)
        print(f"day{v['day']:02d} {t:.1f}s")

if __name__ == "__main__":
    main()
