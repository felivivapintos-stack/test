# MindGlitch video pipeline

Gera os vídeos do Clipkit a partir dos guiões, com voz-off e legendas sincronizadas.

| Ficheiro | O que faz |
|---|---|
| `content.py` | Os 30 guiões: cenas → beats (uma frase de voz + o que aparece no ecrã) e a lógica dos CTAs por dia |
| `descriptions.py` | Descrições para TikTok e Reels, comentário fixado e texto da capa de cada dia |
| `tts.py` | Gera a voz com **Kokoro** (gratuito, local), frase a frase, e normaliza para -14 LUFS |
| `build.py` | Transforma guião + tempos do áudio em projetos Clipkit (layout, ícones, gráficos, legendas) |
| `clipkit_client.py` | Cliente mínimo para o endpoint MCP do Clipkit (`https://www.clipkit.dev/mcp`) |
| `preview.py` | Gera frames de cada vídeo numa folha de contacto, para rever |
| `make_plan.py` | Escreve `../30_DAY_PLAN.md` |
| `projects.json` / `audio_urls.json` | IDs dos projetos e URLs do áudio alojado (correr de novo atualiza os mesmos links) |

## Fazer um vídeo novo

```bash
# 1. adicionar o guião em content.py (+ descrição em descriptions.py)
# 2. voz (precisa de kokoro-onnx + modelos em $KOKORO_DIR)
KOKORO_DIR=./kmodels python tts.py ./audio 31
# 3. vídeo no Clipkit (cria ou atualiza o projeto, aloja o áudio)
python build.py ./audio projects.json audio_urls.json 31
# 4. rever
python preview.py ./audio projects.json ./prev 31
```

Modelos do Kokoro: `kokoro-v1.0.onnx` e `voices-v1.0.bin` em
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
