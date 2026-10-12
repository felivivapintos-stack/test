# Plano de construção

## Expectativas realistas
- Isto é um projeto de **meses a anos**, mesmo com ajuda de IA. Os projetos de referência
  assentam em mais de uma década de trabalho do Wine, FEX-Emu e DXVK/DXMT.
- GTA V a 60–80 fps não é um objetivo da fase 1. O objetivo inicial é **um .exe a abrir**.
- Para iOS é **obrigatório** ter um Mac com Xcode, um iPhone recente (A17 Pro/M-series ou
  superior, ≥8 GB RAM) e, idealmente, conta Apple Developer (99 €/ano).

## Decisão de arquitetura
Não escrever um tradutor de CPU nem uma camada DirectX de raiz. **Integrar** projetos existentes:

| Camada | iOS / tvOS | Android |
|---|---|---|
| API Windows | Wine (modo ARM64EC / WoW64) | Wine (via Winlator) |
| CPU x86 → ARM64 | FEX-Emu (JIT) | Box64 ou FEX-Emu |
| D3D9/10/11 | DXMT (→ Metal) ou DXVK + MoltenVK | DXVK (→ Vulkan) |
| D3D12 | VKD3D-Proton + MoltenVK (experimental) | VKD3D-Proton |
| App / UI | Swift + SwiftUI | Kotlin (fork Winlator) |
| Controlos | GameController.framework + overlay tátil | Android InputDevice + overlay |

Núcleo partilhado: a pilha Wine+FEX+DX é a mesma; só muda o "host" (Darwin/Metal vs Linux/Vulkan).

## Fases

### Fase 0 — Preparação (1–2 semanas)
- [ ] Confirmar estado do JIT no iOS 27 (que ferramentas de sideload/JIT funcionam).
- [ ] Estudar o código: FEX-Emu (`External/`, `Source/Tools/`), DXMT, Wine `dlls/ntdll/unix`.
- [ ] Ver se o Madeira/Vapor publicam código ou se há forks úteis (respeitar licenças).
- [ ] Montar Mac + Xcode + toolchain cruzada (LLVM-MinGW para as DLLs PE ARM64EC).

### Fase 1 — Android primeiro (vitória rápida, 3–6 semanas)
Valida a pilha comum num ambiente onde o JIT é livre.
- [ ] Fork do Winlator; build reprodutível em CI.
- [ ] Interface própria + gestão de "contentores" por jogo.
- [ ] Testar jogos GOG leves (ex.: Hollow Knight, Portal 2) → depois GTA V modo história.
- [ ] Métricas: fps, tempo de frame, temperatura.

### Fase 2 — Prova de conceito iOS (2–4 meses) ← a parte difícil
1. [ ] App iOS mínima que aloca memória executável com JIT ativo (teste "hello JIT").
2. [ ] Compilar FEX-Emu para iOS (Darwin): substituir syscalls Linux por equivalentes, páginas de 16 KB.
3. [ ] Correr um binário x86-64 trivial dentro da app (sem Wine).
4. [ ] Wine num só processo: wineserver em thread, sem fork/exec, ntdll unix portado para Darwin/iOS.
5. [ ] `notepad.exe`/um `.exe` de consola a correr → **marco da PoC**.

### Fase 3 — Gráficos (2–3 meses)
- [ ] Integrar DXMT; ligar o swapchain a um `CAMetalLayer` da app.
- [ ] Demo D3D11 simples → jogo DX11 leve → jogo médio.
- [ ] Cache de shaders (compilação de shaders é a principal causa de "stutter").

### Fase 4 — Produto (contínuo)
- [ ] Controlos: comando MFi/Xbox/PS + layout tátil configurável por jogo.
- [ ] Áudio, importação de jogos (Ficheiros/rede), perfis por jogo.
- [ ] Otimização: resolução dinâmica/MetalFX upscaling, limite de fps, gestão térmica.
- [ ] GTA V e jogos pesados.

### Fase 5 — Apple TV (opcional)
- [ ] Avaliar se há forma de ter JIT no tvOS; senão, oferecer modo streaming (Moonlight).

## Riscos principais
1. **Apple fecha o método de JIT** → app fica inutilizável. Mitigação: acompanhar a comunidade de sideload.
2. Porte do Wine para um único processo no iOS é muito trabalho de baixo nível.
3. Memória: jogos grandes podem exceder o limite do iOS.
4. Licenças (LGPL) obrigam a publicar alterações ao Wine/DXMT.

## O que posso fazer já contigo
- Configurar o repositório (estrutura, CI no GitHub Actions com runners macOS e Linux).
- Começar a **Fase 1** (fork/integração Winlator para Android) — dá para compilar em CI.
- Escrever a app iOS base em Swift e o teste "hello JIT" (Fase 2.1) — tu compilas no teu Mac.
- Analisar e portar partes do FEX-Emu para Darwin.
