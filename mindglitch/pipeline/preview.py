"""Render stills at the middle of each beat + CTA, tile into one contact sheet per video."""
import json, subprocess, sys, os
from clipkit_client import Clipkit
audio_dir, proj_path, out = sys.argv[1:4]; days = [int(d) for d in sys.argv[4:]]
projects = json.load(open(proj_path)); ck = Clipkit(); os.makedirs(out, exist_ok=True)
for d in days:
    key = f"day{d:02d}"; tm = json.load(open(f"{audio_dir}/{key}.json"))
    if os.environ.get("LITE"):
        times = [round(s["beats"][-1]["end"] - 0.2, 2) for s in tm["scenes"][:-1]]
    else:
        times = [round((b["start"] + b["end"]) / 2 + 0.6, 2) for s in tm["scenes"] for b in s["beats"]]
        times[-1] = round(tm["duration"] - 0.2, 2)
    files = []
    for i, t in enumerate(times):
        f = f"{out}/{key}_{i:02d}.png"; ck.still(projects[key], t, f); files.append(f)
    n = len(files); cols = min(n, 6); rows = (n + cols - 1) // cols
    inputs = sum([["-i", f] for f in files], [])
    fl = "".join(f"[{i}:v]scale=270:480[v{i}];" for i in range(n))
    fl += "".join(f"[v{i}]" for i in range(n)) + f"xstack=inputs={n}:layout=" + "|".join(
        f"{(i % cols) * 270}_{(i // cols) * 480}" for i in range(n)) + ":fill=black" if n > 1 else "[v0]null"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *inputs, "-filter_complex", fl, f"{out}/{key}_sheet.png"], check=True)
    print(key, times)
