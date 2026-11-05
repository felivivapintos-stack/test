"""Write 30_DAY_PLAN.md: calendar, editor links, scripts, captions, sources."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from content import all_videos
from descriptions import D

here = os.path.dirname(os.path.abspath(__file__))
projects = json.load(open(os.path.join(here, "projects.json")))
timings_dir = sys.argv[1] if len(sys.argv) > 1 else None
out = os.path.join(here, "..", "30_DAY_PLAN.md")

def link(day):
    return f"https://www.clipkit.dev/public-editor?id={projects[f'day{day:02d}']}"

phase = {1: "Valor", 2: "Valor", 3: "Valor", 4: "Valor", 5: "Teaser", 6: "Revelação", 7: "ABERTURA",
         13: "Último dia amanhã", 14: "FIM DO PREÇO DE FUNDADOR", 30: "Recapitulação"}

L = []
L.append("# MindGlitch: plano de 30 dias\n")
L.append("Duas séries numa só conta: **Brain Bugs** (dias ímpares, roxo, crescimento) e **Study Glitches** "
         "(dias pares, azul-esverdeado, vendas do curso). Todos os vídeos são verticais (1080×1920) e têm voz-off e legendas sincronizadas.\n")
L.append("**Como publicar cada vídeo:** abre o link do Clipkit → *Export* (sessão grátis) → MP4. "
         "Publica no TikTok com a descrição TT; no Reels, umas horas depois, com a descrição IG (nunca o ficheiro com marca de água do TikTok). "
         "Junta uma música em tendência *na própria app*, a 10–15% do volume, por baixo da voz. Fixa o comentário indicado.\n")
L.append("**Voz:** Kokoro (gratuita, neural, local). *Bella* nos Brain Bugs, *Heart* nos Study Glitches. Os MP3 também estão em `mindglitch/audio/`.\n")
L.append("## Calendário\n")
L.append("| Dia | Série | Vídeo | Duração | Fase de vendas | Clipkit |")
L.append("|---|---|---|---|---|---|")
vids = all_videos()
for v in vids:
    dur = ""
    if timings_dir:
        dur = f'{json.load(open(f"{timings_dir}/day{v["day"]:02d}.json"))["duration"]:.0f}s'
    s = "Brain Bug" if v["series"] == "bb" else "Study Glitch"
    L.append(f'| {v["day"]} | {s} #{v["num"]:03d} | {v["title"]} | {dur} | {phase.get(v["day"], "Curso aberto" if v["day"] > 7 else "")} | [abrir]({link(v["day"])}) |')
L.append("")
for v in vids:
    d = D[v["day"]]
    s = "Brain Bug" if v["series"] == "bb" else "Study Glitch"
    L.append(f'---\n\n## Dia {v["day"]}: {s} #{v["num"]:03d}: {v["title"]}\n')
    L.append(f'**Clipkit:** {link(v["day"])}  ')
    L.append(f'**Texto da capa:** `{d["cover"]}`  ')
    if v["series"] == "sg":
        L.append(f'**Módulo do curso:** {v["module"]}  ')
    L.append(f'**Fontes:** {"; ".join(v["sources"])}\n')
    L.append("**Guião (voz-off):**\n")
    for sc in v["scenes"]:
        for b in sc["beats"]:
            L.append(f"> {b['vo']}  ")
    L.append(f"> {v['cta']['vo']}\n")
    L.append("**TikTok:**\n```\n" + d["tt"] + "\n```\n")
    L.append("**Instagram Reels:**\n```\n" + d["ig"] + "\n```\n")
    L.append(f'**Comentário fixado:** {d["pin"]}\n')
open(out, "w").write("\n".join(L))
print("wrote", os.path.normpath(out))
