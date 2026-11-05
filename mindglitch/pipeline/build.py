"""Build Clipkit projects for the 30-day plan from content.py + audio timings.

Usage: build.py <audio_dir> <projects.json> <audio_urls.json> [day ...]
"""
import json, math, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
from content import all_videos

W, H = 1080, 1920
CX = 540
CONTENT_W = 860              # 110..970 keeps clear of the TikTok/Reels right rail
TOP, BOTTOM = 250, 1330      # content band (captions sit below, UI overlays below that)
CAPTION_Y = 1452

FONT = "Montserrat"
FONTS = [{"family": FONT, "weight": "100 900",
          "src": "https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2"}]

THEMES = {
    "bb": dict(name="BRAIN BUG", bg=["#16113F", "#0B0A1F", "#06050E"], orb1="#8B5CF6", orb2="#22D3EE",
               grad=["#B79CFF", "#F43F7E"], accent="#FACC15", alert="#FB7185", soft="#C9C3FF",
               head="#F4F2FF", label="#22D3EE", c2="#7C6FB0", icon="#B79CFF", tag="#8B83C9",
               pill="#FACC15", pill_text="#14103A"),
    "sg": dict(name="STUDY GLITCH", bg=["#0B2D36", "#071318", "#04090C"], orb1="#22D3EE", orb2="#A3E635",
               grad=["#22D3EE", "#A3E635"], accent="#FDE047", alert="#FB7185", soft="#A9DCE8",
               head="#F2FBFF", label="#A3E635", c2="#64748B", icon="#22D3EE", tag="#6FB8C8",
               pill="#A3E635", pill_text="#071318"),
}

WEAK = {"a", "an", "the", "of", "in", "on", "to", "about", "one", "and", "or", "for", "with", "your", "their",
        "my", "is", "are", "was", "at", "by", "from", "as", "than", "that", "this", "so", "but", "only", "just"}

WEAK |= {"other", "eleven", "us", "them", "me", "him", "her", "full", "new", "whole", "same", "real", "big", "simple", "famous", "classic", "under", "you", "actually", "each", "more", "what", "which", "where", "who", "into", "through",
         "like", "it", "how", "be", "were", "had", "has", "have", "can", "will", "would", "every", "some", "most",
         "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "twenty", "sixty", "forty",
         "fifty", "thirty", "not", "don't", "if", "when", "because", "why", "do", "does", "did", "we", "they",
         "he", "she", "i", "its", "it's", "out", "up", "even"}

def caption_chunks(words, max_w=5, max_c=30, target=17):
    """Split a line into caption chunks: break at punctuation, then pick balanced
    break points that never end a chunk on a weak/function word."""
    segs, cur = [], []
    for w in words:
        cur.append(w)
        if re.search(r"[.?!:;,]$", w):
            segs.append(cur); cur = []
    if cur: segs.append(cur)
    out = []
    for seg in segs:
        n = len(seg)
        best = {0: (0.0, [])}
        for i in range(1, n + 1):
            cands = []
            for j in range(max(0, i - max_w), i):
                if j not in best: continue
                chunk = seg[j:i]; text = " ".join(chunk)
                if len(text) > max_c and len(chunk) > 1: continue
                cost = (len(text) - target) ** 2 * 0.15 + 30
                if i < n and chunk[-1].lower().strip(",.") in WEAK: cost += 400
                if i < n and re.match(r"(percent|words|minutes|seconds|hours|days|weeks)", seg[i].lower()): cost += 400
                if len(chunk) == 1 and n > 1: cost += 120
                cands.append((best[j][0] + cost, best[j][1] + [chunk]))
            if cands: best[i] = min(cands, key=lambda c: c[0])
        out += best[n][1] if n in best else [seg]
    return out

SPRING = lambda b: {"type": "spring", "bounce": b}


# ------------------------------------------------------------------ icons
def circ(cx, cy, r):
    return f"M {cx - r} {cy} a {r} {r} 0 1 0 {2 * r} 0 a {r} {r} 0 1 0 {-2 * r} 0"

ICONS = {  # 100x100 viewBox, (d, mode) mode: s=stroke, f=fill(soft)
    "eye": [("M 6 50 Q 50 8 94 50 Q 50 92 6 50 Z", "s"), (circ(50, 50, 15), "s"), (circ(50, 50, 6), "f")],
    "person": [(circ(50, 26, 15), "s"), ("M 20 92 Q 20 50 50 50 Q 80 50 80 92", "s")],
    "people": [(circ(50, 30, 12), "s"), ("M 28 86 Q 28 52 50 52 Q 72 52 72 86", "s"),
               (circ(18, 42, 9), "s"), ("M 2 86 Q 2 60 18 60 Q 28 60 32 66", "s"),
               (circ(82, 42, 9), "s"), ("M 98 86 Q 98 60 82 60 Q 72 60 68 66", "s")],
    "spotlight": [("M 40 6 H 60 V 18 H 40 Z", "s"), ("M 42 18 L 16 82 M 58 18 L 84 82", "s"),
                  ("M 42 18 L 58 18 L 84 82 L 16 82 Z", "f"), ("M 12 88 Q 50 98 88 88", "s")],
    "shirt": [("M 32 14 Q 50 26 68 14 L 94 30 L 84 50 L 74 45 L 74 90 L 26 90 L 26 45 L 16 50 L 6 30 Z", "s"),
              ("M 40 58 Q 50 66 60 58", "s")],
    "brain": [("M 50 20 C 40 6 18 10 19 30 C 6 36 6 58 19 64 C 19 84 42 90 50 78 C 58 90 81 84 81 64 C 94 58 94 36 81 30 C 82 10 60 6 50 20 Z", "s"),
              ("M 50 20 V 78", "s"), ("M 30 38 Q 38 34 40 44 M 30 58 Q 38 54 40 64 M 70 38 Q 62 34 60 44 M 70 58 Q 62 54 60 64", "s")],
    "moon": [("M 62 10 A 40 40 0 1 0 90 62 A 32 32 0 1 1 62 10 Z", "s"), ("M 74 22 h 8 M 78 18 v 8", "s")],
    "door": [("M 26 92 V 8 H 74 V 92", "s"), ("M 8 92 H 92", "s"), (circ(64, 52, 3), "f")],
    "ball": [(circ(50, 50, 40), "s"), ("M 10 50 H 90 M 50 10 V 90", "s"), ("M 22 22 Q 44 50 22 78 M 78 22 Q 56 50 78 78", "s")],
    "swap": [("M 14 34 H 80 L 66 20", "s"), ("M 86 66 H 20 L 34 80", "s")],
    "thermometer": [("M 42 14 A 8 8 0 0 1 58 14 V 60 A 16 16 0 1 1 42 60 Z", "s"), (circ(50, 72, 8), "f"),
                    ("M 66 24 H 76 M 66 38 H 76 M 66 52 H 76", "s")],
    "wheel": [(circ(50, 54, 38), "s"), ("M 50 16 V 92 M 12 54 H 88 M 23 27 L 77 81 M 77 27 L 23 81", "s"),
              ("M 42 4 H 58 L 50 18 Z", "f")],
    "box": [("M 14 30 L 50 12 L 86 30 L 86 72 L 50 90 L 14 72 Z", "s"), ("M 14 30 L 50 48 L 86 30 M 50 48 V 90", "s")],
    "face": [(circ(50, 50, 40), "s"), ("M 36 40 v 4 M 64 40 v 4", "s"), ("M 30 66 Q 40 58 50 66 Q 60 74 70 66", "s"),
             ("M 82 18 Q 88 26 82 30", "s")],
    "car": [("M 10 66 L 18 44 Q 22 34 34 34 H 66 Q 78 34 82 44 L 90 66 V 76 H 10 Z", "s"), ("M 20 52 H 80", "s"),
            (circ(28, 78, 8), "s"), (circ(72, 78, 8), "s")],
    "ear": [("M 30 42 A 22 22 0 1 1 72 50 C 68 62 58 64 58 78 A 12 12 0 0 1 36 82", "s"),
            ("M 42 44 A 9 9 0 1 1 58 50", "s"), ("M 82 30 Q 92 50 82 70", "s")],
    "notes": [("M 22 6 H 64 L 80 22 V 94 H 22 Z", "s"), ("M 64 6 V 22 H 80", "s"),
              ("M 32 40 H 70 M 32 54 H 70 M 32 68 H 56", "s")],
    "highlighter": [("M 28 66 L 62 14 L 82 28 L 48 80 Z", "s"), ("M 28 66 L 22 88 L 48 80", "s"), ("M 14 94 H 86", "s")],
    "palace": [("M 8 38 L 50 10 L 92 38 Z", "s"), ("M 18 40 V 82 M 38 40 V 82 M 62 40 V 82 M 82 40 V 82", "s"),
               ("M 6 88 H 94", "s")],
    "calendar": [("M 12 20 H 88 V 90 H 12 Z", "s"), ("M 12 38 H 88 M 30 10 V 28 M 70 10 V 28", "s"),
                 ("M 28 56 l 6 6 l 12 -12 M 56 70 h 16", "s")],
    "cards": [("M 14 30 H 66 V 92 H 14 Z", "s"), ("M 30 16 H 82 V 78", "s"), ("M 40 52 L 30 62 L 40 72 L 50 62 Z", "f")],
    "question": [(circ(50, 50, 42), "s"), ("M 36 38 A 14 14 0 1 1 58 49 C 52 53 50 56 50 64", "s"), (circ(50, 76, 3.5), "f")],
    "teach": [("M 8 12 H 92 V 62 H 8 Z", "s"), ("M 30 84 L 42 62 M 70 84 L 58 62", "s"), ("M 22 28 H 60 M 22 44 H 46", "s")],
    "laptop": [("M 20 18 H 80 V 62 H 20 Z", "s"), ("M 6 78 H 94 L 84 64 H 16 Z", "s")],
    "blocks": [("M 12 12 H 44 V 44 H 12 Z", "s"), ("M 56 12 H 88 V 44 H 56 Z", "s"),
               ("M 12 56 H 44 V 88 H 12 Z", "s"), ("M 56 56 H 88 V 88 H 56 Z", "s")],
    "music": [("M 38 76 V 20 L 84 10 V 64", "s"), (circ(28, 76, 11), "s"), (circ(74, 66, 11), "s")],
    "pen": [("M 68 10 L 90 32 L 38 84 L 12 90 L 18 64 Z", "s"), ("M 58 20 L 80 42", "s")],
    "curve": [("M 10 8 V 90 H 94", "s"), ("M 12 14 C 22 64 40 78 92 84", "s")],
}


# ------------------------------------------------------------------ text metrics
def char_w(ch):
    if ch == " ": return 0.30
    if ch in "il.,:;'!|": return 0.30
    if ch in "mwMW": return 0.95
    if ch.isupper() or ch.isdigit() or ch in "%$#?": return 0.76
    return 0.62

def text_w(s, size, spacing=0):
    return sum(char_w(c) for c in s) * size * 1.08 + spacing * len(s)

def wrap(text, size, width=CONTENT_W, spacing=0):
    lines, cur = [], ""
    for w in text.split(" "):
        cand = (cur + " " + w).strip()
        if text_w(cand, size, spacing) <= width or not cur:
            cur = cand
        else:
            lines.append(cur); cur = w
    lines.append(cur)
    return lines

def balanced_width(text, size, spacing=0, width=CONTENT_W):
    """Smallest box width that keeps the same line count -> even lines, no widows."""
    n = len(wrap(text, size, width, spacing))
    if n == 1:
        return width
    lo, hi = max(text_w(w, size, spacing) for w in text.split(" ")), width
    while hi - lo > 4:
        mid = (lo + hi) / 2
        if len(wrap(text, size, mid, spacing)) <= n: hi = mid
        else: lo = mid
    return min(width, hi * 1.07 + 16)

def fit(text, size, spacing=0, width=CONTENT_W):
    """Shrink until no single word overflows and max 3 lines."""
    while size > 30:
        widest = max(text_w(w, size, spacing) for w in text.split(" "))
        if widest <= width and len(wrap(text, size, width, spacing)) <= 3:
            break
        size = int(size * 0.94)
    return size


# ------------------------------------------------------------------ builders
class Builder:
    def __init__(self, v, timing, theme, audio_url):
        self.v, self.tm, self.th, self.audio = v, timing, theme, audio_url
        self.layer = 0

    def L(self):
        self.layer += 1
        return self.layer

    # --- text styles
    def style(self, kind):
        th = self.th
        return {
            "head":   dict(font_weight=800, fill_color=th["head"]),
            "soft":   dict(font_weight=600, fill_color=th["soft"]),
            "body":   dict(font_weight=600, fill_color=th["head"], opacity=0.92),
            "grad":   dict(font_weight=900, gradient={"type": "linear", "angle": 90, "stops": [
                          {"offset": 0, "color": th["grad"][0]}, {"offset": 1, "color": th["grad"][1]}]}),
            "accent": dict(font_weight=900, fill_color=th["accent"]),
            "alert":  dict(font_weight=900, fill_color=th["alert"]),
            "label":  dict(font_weight=800, fill_color=th["label"], letter_spacing=5),
            "quote":  dict(font_weight=800, fill_color=th["accent"], font_style="italic"),
        }[kind]

    def text_el(self, it, y, t0):
        kind, anim = it["kind"], it["anim"]
        st = self.style(kind)
        spacing = st.get("letter_spacing", 0)
        size = fit(it["text"], it["size"], spacing)
        lines = wrap(it["text"], size, CONTENT_W, spacing)
        lh = 1.12
        h = len(lines) * size * lh
        el = {"type": "text", "layer": self.L(), "time": round(t0, 3), "duration": "end",
              "x": CX, "x_anchor": "50%", "width": round(balanced_width(it["text"], size, spacing)) + 24,
              "text_align": "center",
              "font_family": FONT, "font_size": size, "line_height": lh, "text": it["text"],
              "text_shadow": {"color": "#000000", "offset_x": 0, "offset_y": 6, "blur": 24, "opacity": 0.45}}
        el.update(st)
        base_op = el.pop("opacity", 1)
        if anim == "pop":
            el.update(y=round(y + h / 2), y_anchor="50%",
                      scale=[{"time": 0, "value": 0.35}, {"time": 0.42, "value": 1, "easing": SPRING(0.55)}],
                      opacity=[{"time": 0, "value": 0}, {"time": 0.12, "value": base_op}])
            if "gradient" in el:  # renderer only wraps gradient text laid out per unit
                el["keyframe_animations"] = [{"property": "opacity", "stagger": {"each": 0.03}, "keyframes": [
                    {"time": 0, "value": 0}, {"time": 0.12, "value": 1}]}]
        elif anim == "fade":
            el.update(y=round(y), opacity=[{"time": 0, "value": 0}, {"time": 0.4, "value": base_op}])
            if "gradient" in el:
                el["keyframe_animations"] = [{"property": "opacity", "stagger": {"each": 0.03}, "keyframes": [
                    {"time": 0, "value": 0}, {"time": 0.12, "value": 1}]}]
        else:
            letters = anim == "letters"
            each = 0.035 if letters else 0.06
            st_obj = {"each": each, "split": "letter"} if letters else {"each": each}
            el.update(y=round(y), opacity=base_op, keyframe_animations=[
                {"property": "y", "stagger": st_obj, "keyframes": [
                    {"time": 0, "value": 60 if letters else 40},
                    {"time": 0.5, "value": 0, "easing": SPRING(0.5 if letters else 0.35)}]},
                {"property": "opacity", "stagger": st_obj, "keyframes": [
                    {"time": 0, "value": 0}, {"time": 0.22, "value": 1}]}])
        return [el], h

    def icon_el(self, it, y, t0):
        size = it["size"]; color = self.th["icon"]
        paths = []
        for d, mode in ICONS[it["icon"]]:
            if mode == "s":
                paths.append({"d": d, "stroke": color, "stroke_width": 5.5, "stroke_linecap": "round",
                              "stroke_linejoin": "round",
                              "stroke_progress": [{"time": 0, "value": 0},
                                                  {"time": 0.9, "value": 1, "easing": "ease-out-cubic"}]})
            else:
                paths.append({"d": d, "fill": color, "opacity": 0.35})
        el = {"type": "shape", "layer": self.L(), "time": round(t0, 3), "duration": "end",
              "x": CX, "y": round(y + size / 2), "x_anchor": "50%", "y_anchor": "50%",
              "width": size, "height": size, "view_box": [0, 0, 100, 100], "paths": paths,
              "effects": [{"type": "glow", "radius": 16, "intensity": 0.9, "color": color}],
              "scale": [{"time": 0, "value": 0.7}, {"time": 0.5, "value": 1, "easing": SPRING(0.45)}],
              "rotation": {"expr": "2.5*sin(t*1.6)"},
              "opacity": [{"time": 0, "value": 0}, {"time": 0.15, "value": 1}]}
        return [el], size

    def bar_el(self, it, y, t0):
        th = self.th
        color = th.get(it["color"], it["color"])
        mx, val = it["max"], it["value"]
        full = CONTENT_W
        fill_w = max(56, full * val / mx)
        els = [
            {"type": "text", "layer": self.L(), "time": round(t0, 3), "duration": "end", "x": 110, "y": round(y + 14),
             "width": 600, "font_family": FONT, "font_weight": 800, "font_size": 36, "letter_spacing": 3,
             "fill_color": th["soft"], "text": it["label"], "opacity": [{"time": 0, "value": 0}, {"time": 0.25, "value": 1}]},
            {"type": "text", "layer": self.L(), "time": round(t0, 3), "duration": "end", "x": 110, "y": round(y - 12),
             "width": full, "text_align": "right", "font_family": FONT, "font_weight": 900, "font_size": 74,
             "fill_color": color,
             "text": {"expr": f"round(ease(t, 0.15, 1.25, 0, {val}))", "format": {"suffix": it["unit"]}},
             "opacity": [{"time": 0, "value": 0}, {"time": 0.2, "value": 1}]},
            {"type": "shape", "layer": self.L(), "time": round(t0, 3), "duration": "end", "x": 110, "y": round(y + 86),
             "width": full, "height": 54, "border_radius": 27, "fill_color": "#FFFFFF", "opacity": 0.09},
            {"type": "shape", "layer": self.L(), "time": round(t0, 3), "duration": "end", "x": 110, "y": round(y + 86),
             "height": 54, "border_radius": 27, "fill_color": color,
             "width": {"expr": f"max(54, ease(t, 0.15, 1.25, 0, {fill_w:.0f}))"},
             "shadow": {"color": color, "offset_x": 0, "offset_y": 0, "blur": 22}},
        ]
        return els, 150

    def num_el(self, it, y, t0):
        th = self.th
        size = 220
        els = [
            {"type": "text", "layer": self.L(), "time": round(t0, 3), "duration": "end",
             "x": CX, "x_anchor": "50%", "y": round(y), "width": CONTENT_W + 40, "text_align": "center",
             "font_family": FONT, "font_weight": 900, "font_size": size, "line_height": 1.0,
             "gradient": {"type": "linear", "angle": 90, "stops": [
                 {"offset": 0, "color": th["grad"][0]}, {"offset": 1, "color": th["grad"][1]}]},
             "text": {"expr": f"round(ease(t, 0.1, 1.3, 0, {it['value']}))",
                      "format": {"prefix": it["prefix"], "suffix": it["suffix"], "separator": True}},
             "opacity": [{"time": 0, "value": 0}, {"time": 0.15, "value": 1}]},
            {"type": "text", "layer": self.L(), "time": round(t0 + 0.4, 3), "duration": "end",
             "x": CX, "x_anchor": "50%", "y": round(y + size * 1.02), "width": CONTENT_W + 40, "text_align": "center",
             "font_family": FONT, "font_weight": 800, "font_size": 38, "letter_spacing": 4,
             "fill_color": th["soft"], "text": it["label"],
             "opacity": [{"time": 0, "value": 0}, {"time": 0.3, "value": 1}]},
        ]
        return els, size * 1.02 + 56

    def list_rows(self, it):
        rows = []
        for item in it["items"]:
            size = 48
            n = len(wrap(item, size, 700))
            rows.append((item, size, n, max(96, n * size * 1.15 + 26)))
        return rows

    def list_el(self, it, y, t0):
        th = self.th
        els, ty = [], y
        for i, (item, size, n, rh) in enumerate(self.list_rows(it)):
            tt = round(t0 + i * 0.35, 3); cy = ty + rh / 2
            els += [
                {"type": "shape", "shape": "ellipse", "layer": self.L(), "time": tt, "duration": "end",
                 "x": 150, "y": round(cy - 39), "width": 78, "height": 78,
                 "gradient": {"type": "linear", "angle": 135, "stops": [
                     {"offset": 0, "color": th["grad"][0]}, {"offset": 1, "color": th["grad"][1]}]},
                 "scale": [{"time": 0, "value": 0}, {"time": 0.4, "value": 1, "easing": SPRING(0.55)}]},
                {"type": "text", "layer": self.L(), "time": tt, "duration": "end", "x": 150, "y": round(cy - 24),
                 "width": 78, "text_align": "center", "font_family": FONT, "font_weight": 900, "font_size": 40,
                 "line_height": 1.0, "fill_color": "#0B0A1F", "text": str(i + 1),
                 "opacity": [{"time": 0, "value": 0}, {"time": 0.2, "value": 1}]},
                {"type": "text", "layer": self.L(), "time": tt, "duration": "end", "x": 256,
                 "y": round(cy - n * size * 1.15 / 2), "width": round(min(714, balanced_width(item, size, 0, 700))),
                 "font_family": FONT, "font_weight": 800,
                 "font_size": size, "line_height": 1.15, "fill_color": th["head"], "text": item,
                 "keyframe_animations": [
                     {"property": "x", "keyframes": [{"time": 0, "value": 296}, {"time": 0.45, "value": 256, "easing": SPRING(0.3)}]}],
                 "opacity": [{"time": 0, "value": 0}, {"time": 0.25, "value": 1}]},
            ]
            ty += rh + 16
        return els, ty - y - 16

    def item(self, it, y, t0):
        return {"text": self.text_el, "icon": self.icon_el, "bar": self.bar_el,
                "num": self.num_el, "list": self.list_el}[it["t"]](it, y, t0)

    def measure(self, it):
        if it["t"] == "text":
            st = self.style(it["kind"]); sp = st.get("letter_spacing", 0)
            size = fit(it["text"], it["size"], sp)
            return len(wrap(it["text"], size, CONTENT_W, sp)) * size * 1.12
        return {"icon": lambda: it["size"], "bar": lambda: 150, "num": lambda: 220 * 1.02 + 56,
                "list": lambda: sum(r[3] + 16 for r in self.list_rows(it)) - 16}[it["t"]]()

    # --- scenes
    def scene(self, scene, tscene, t_start, t_end, idx):
        items = [(bi, it) for bi, b in enumerate(scene["beats"]) for it in b["items"]]
        gaps = []
        for k, (bi, it) in enumerate(items):
            nxt = items[k + 1][1] if k + 1 < len(items) else None
            g = 0 if nxt is None else (18 if it["t"] == "text" and it["kind"] == "label" else
                                        44 if it["t"] in ("bar",) and nxt["t"] == "bar" else 30)
            gaps.append(g)
        heights = [self.measure(it) for _, it in items]
        total = sum(heights) + sum(gaps)
        if total > BOTTOM - TOP:
            print(f"  ! day{self.v['day']:02d} scene {idx}: content {total:.0f}px > {BOTTOM - TOP}px", file=sys.stderr)
        y = TOP + max(0, (BOTTOM - TOP - total) / 2) - 20
        children = []
        for k, (bi, it) in enumerate(items):
            beat_t = tscene["beats"][bi]["start"] - t_start
            t0 = max(0.0, beat_t - 0.08) + (0.12 * sum(1 for j in range(k) if items[j][0] == bi))
            els, h = self.item(it, y, t0)
            children += els
            y += heights[k] + gaps[k]
        dur = t_end - t_start
        return {"type": "group", "layer": self.L(), "time": round(t_start, 3), "duration": round(dur, 3),
                "opacity": [{"time": 0, "value": 0 if idx else 1}, {"time": 0.22, "value": 1},
                            {"time": max(0.3, dur - 0.32), "value": 1}, {"time": dur, "value": 0}],
                "y": [{"time": 0, "value": 0}, {"time": max(0.3, dur - 0.32), "value": 0},
                      {"time": dur, "value": -40, "easing": "ease-in-cubic"}],
                "elements": children}

    def cta(self, t_start, dur):
        th, c = self.th, self.v["cta"]
        grad_m = {"type": "linear", "angle": 135, "stops": [{"offset": 0, "color": "#7C3AED"}, {"offset": 1, "color": "#1E1B4B"}]}
        logo = {"type": "group", "layer": 1, "time": 0.05, "x": CX, "y": 700, "x_anchor": "50%", "y_anchor": "50%",
                "width": 280, "height": 280,
                "scale": [{"time": 0, "value": 0}, {"time": 0.5, "value": 1, "easing": SPRING(0.55)}],
                "elements": [
                    {"type": "shape", "shape": "ellipse", "layer": 1, "x": 0, "y": 0, "width": 280, "height": 280,
                     "gradient": grad_m, "shadow": {"color": th["icon"], "offset_x": 0, "offset_y": 0, "blur": 44}},
                    {"type": "text", "layer": 2, "x": {"expr": "-9 + (fract(t*1.3) < 0.07 ? 12 : 0)"}, "y": 62,
                     "width": 280, "text_align": "center", "font_family": FONT, "font_weight": 900, "font_size": 150,
                     "line_height": 1.0, "fill_color": "#22D3EE", "opacity": 0.9, "text": "M"},
                    {"type": "text", "layer": 3, "x": {"expr": "9 - (fract(t*1.3) < 0.07 ? 12 : 0)"}, "y": 62,
                     "width": 280, "text_align": "center", "font_family": FONT, "font_weight": 900, "font_size": 150,
                     "line_height": 1.0, "fill_color": "#F43F7E", "opacity": 0.9, "text": "M"},
                    {"type": "text", "layer": 4, "x": 0, "y": 62, "width": 280, "text_align": "center",
                     "font_family": FONT, "font_weight": 900, "font_size": 150, "line_height": 1.0,
                     "fill_color": "#FFFFFF", "text": "M"}]}
        pill_w = min(900, max(560, text_w(c["pill"], 34, 2) + 120))
        els = [logo,
               {"type": "text", "layer": 2, "time": 0.3, "x": CX, "x_anchor": "50%", "y": 880, "width": 900,
                "text_align": "center", "font_family": FONT, "font_weight": 900, "font_size": 76, "fill_color": th["head"],
                "text": "MindGlitch", "opacity": [{"time": 0, "value": 0}, {"time": 0.3, "value": 1}]},
               {"type": "group", "layer": 3, "time": 0.55, "x": CX, "y": 1060, "x_anchor": "50%", "y_anchor": "50%",
                "width": pill_w, "height": 104,
                "scale": [{"time": 0, "value": 0.6}, {"time": 0.45, "value": 1, "easing": SPRING(0.45)}],
                "opacity": [{"time": 0, "value": 0}, {"time": 0.15, "value": 1}],
                "elements": [
                    {"type": "shape", "layer": 1, "x": 0, "y": 0, "width": pill_w, "height": 104, "border_radius": 52,
                     "fill_color": th["pill"], "shadow": {"color": th["pill"], "offset_x": 0, "offset_y": 0, "blur": 30}},
                    {"type": "text", "layer": 2, "x": 0, "y": 33, "width": pill_w, "text_align": "center",
                     "font_family": FONT, "font_weight": 900, "font_size": 34, "letter_spacing": 2,
                     "fill_color": th["pill_text"], "text": c["pill"]}]}]
        if c["sub"]:
            els.append({"type": "text", "layer": 4, "time": 0.9, "x": CX, "x_anchor": "50%", "y": 1150, "width": 900,
                        "text_align": "center", "font_family": FONT, "font_weight": 800, "font_size": 34,
                        "letter_spacing": 4, "fill_color": th["label"], "text": c["sub"],
                        "opacity": [{"time": 0, "value": 0}, {"time": 0.3, "value": 1}]})
        return {"type": "group", "layer": self.L(), "time": round(t_start, 3), "duration": round(dur, 3),
                "opacity": [{"time": 0, "value": 0}, {"time": 0.25, "value": 1}], "elements": els}

    def captions(self):
        out = []
        beats = [b for s in self.tm["scenes"] for b in s["beats"]]
        for b in beats:
            words = b["text"].split()
            chunks = caption_chunks(words)
            span = b["end"] - b["start"]
            weights = [sum(len(w) + 1 for w in c) for c in chunks]
            tot = sum(weights); t = b["start"]
            for c, wgt in zip(chunks, weights):
                d = span * wgt / tot
                out.append({"type": "text", "layer": 500 + len(out), "time": round(t, 3),
                            "duration": round(d - 0.01, 3), "x": CX, "x_anchor": "50%", "y": CAPTION_Y,
                            "y_anchor": "50%", "width": 900, "text_align": "center", "font_family": FONT,
                            "font_weight": 800, "font_size": 46, "fill_color": "#FFFFFF",
                            "background_color": "rgba(6,5,14,0.62)", "background_padding": [22, 12],
                            "background_border_radius": 16, "text": " ".join(c),
                            "scale": [{"time": 0, "value": 0.92}, {"time": 0.16, "value": 1, "easing": SPRING(0.3)}]})
                t += d
        return out

    def build(self):
        v, tm, th = self.v, self.tm, self.th
        dur = tm["duration"]
        scenes = tm["scenes"]
        cta_start = scenes[-1]["beats"][0]["start"] - 0.35
        starts = [0.0] + [s["beats"][0]["start"] - 0.28 for s in scenes[1:-1]]
        ends = [starts[i + 1] + 0.32 for i in range(len(starts) - 1)] + [cta_start + 0.3]
        els = [
            {"type": "shape", "layer": self.L(), "time": 0, "duration": "end", "width": "100%", "height": "100%",
             "gradient": {"type": "linear", "angle": 160, "stops": [
                 {"offset": 0, "color": th["bg"][0]}, {"offset": 0.55, "color": th["bg"][1]}, {"offset": 1, "color": th["bg"][2]}]}},
            {"type": "shape", "shape": "ellipse", "layer": self.L(), "time": 0, "duration": "end", "width": 780, "height": 780,
             "x": {"expr": "-280 + 90*sin(t*0.35)"}, "y": {"expr": "-140 + 70*cos(t*0.3)"},
             "fill_color": th["orb1"], "opacity": 0.30, "blur_radius": 170},
            {"type": "shape", "shape": "ellipse", "layer": self.L(), "time": 0, "duration": "end", "width": 720, "height": 720,
             "x": {"expr": "620 + 80*cos(t*0.32)"}, "y": {"expr": "1260 + 90*sin(t*0.27)"},
             "fill_color": th["orb2"], "opacity": 0.15, "blur_radius": 170},
            {"type": "text", "layer": self.L(), "time": 0, "duration": round(cta_start + 0.3, 3), "x": CX, "x_anchor": "50%",
             "y": 150, "width": 960, "text_align": "center", "font_family": FONT, "font_weight": 700, "font_size": 28,
             "letter_spacing": 6, "fill_color": th["tag"],
             "text": f"MINDGLITCH  //  {th['name']} #{v['num']:03d}",
             "opacity": [{"time": 0, "value": 0}, {"time": 0.5, "value": 0.9}]},
        ]
        for i, (sc, tsc) in enumerate(zip(v["scenes"], scenes[:-1])):
            els.append(self.scene(sc, tsc, starts[i], ends[i], i))
        els.append(self.cta(cta_start, dur - cta_start))
        els += self.captions()
        els.append({"type": "audio", "layer": self.L(), "time": 0, "duration": round(dur, 3),
                    "source": self.audio, "volume": 100})
        return {"clipkit_version": "1.0", "width": W, "height": H, "duration": round(dur, 3), "frame_rate": 30,
                "output_format": "mp4", "background_color": th["bg"][1], "fonts": FONTS, "elements": els}


def build_source(v, timing, audio_url):
    return Builder(v, timing, THEMES[v["series"]], audio_url).build()


if __name__ == "__main__":
    from clipkit_client import Clipkit
    audio_dir, proj_path, urls_path = sys.argv[1:4]
    days = {int(d) for d in sys.argv[4:]}
    projects = json.load(open(proj_path)) if os.path.exists(proj_path) else {}
    urls = json.load(open(urls_path)) if os.path.exists(urls_path) else {}
    ck = Clipkit()
    for v in all_videos():
        d = v["day"]
        if days and d not in days:
            continue
        key = f"day{d:02d}"
        timing = json.load(open(f"{audio_dir}/{key}.json"))
        if key not in projects:
            res = ck.call_json("create_project", {"width": W, "height": H, "duration": 10})
            projects[key] = res["project_id"] if isinstance(res, dict) else re.search(r"[0-9a-f-]{36}", str(res)).group(0)
            json.dump(projects, open(proj_path, "w"), indent=1)
        if key not in urls:
            import base64, subprocess
            mono = f"{audio_dir}/{key}_mono.mp3"
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f"{audio_dir}/{key}.mp3", "-ac", "1",
                            "-b:a", "128k", mono], check=True)
            b64 = base64.b64encode(open(mono, "rb").read()).decode()
            r = ck.call_json("ingest_asset", {"project_id": projects[key], "url": "data:audio/mpeg;base64," + b64,
                                              "filename": f"mindglitch-{key}-voiceover.mp3"})
            urls[key] = re.search(r"https://\S+", str(r)).group(0)
            json.dump(urls, open(urls_path, "w"), indent=1)
        src = build_source(v, timing, urls[key])
        args = {"source": src}
        if f"day{d:02d}" in projects:
            args["project_id"] = projects[f"day{d:02d}"]
        res = ck.call_json("set_project", args)
        m = re.search(r"project_id\W+([0-9a-f-]{36})", str(res))
        if not m:
            print(f"{key} set_project said: {str(res)[:1500]}"); continue
        projects[key] = m.group(1)
        json.dump(projects, open(proj_path, "w"), indent=1)
        val = ck.call_json("validate_project", {"project_id": projects[key]})
        warn = val.get("warnings") if isinstance(val, dict) else val
        print(f"day{d:02d} {projects[key]} valid={val.get('valid') if isinstance(val, dict) else '?'} warnings={warn}")
