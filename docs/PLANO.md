# Plano de construção

## Expectativas realistas
- Isto é um projeto de **meses a anos**, mesmo com ajuda de IA. Os projetos de referência
  assentam em mais de uma década de trabalho do Wine, FEX-Emu e DXVK/DXMT.
- GTA V a 60–80 fps não é um objetivo da fase 1. O objetivo inicial é **um .exe a abrir**.
- **Alvo: só iOS/iPadOS.** Android e Apple TV ficam fora do plano por agora.
- **Sem Mac:** a app é compilada no GitHub Actions (runners macOS), instalada com o SideStore e o
  JIT é ativado com o StikDebug. Só é preciso um PC Windows/Linux uma vez (emparelhamento).
  Ver [INSTALAR-IOS.md](INSTALAR-IOS.md).
- iPhone recente ajuda muito (≥8 GB RAM para jogos grandes).

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

### Fase 2 — Prova de conceito iOS (2–4 meses) ← a parte difícil
1. [x] App iOS mínima (`ios/`) que obtém JIT via StikDebug — incluindo o protocolo
   `JIT26PrepareRegion`/`JIT26Detach` para dispositivos com TXM (iOS 26+) — e executa código
   ARM64 gerado em runtime. Compilada no CI. **Falta testar no teu iPhone.**
   Nota: com TXM, toda a memória executável tem de ser reservada antes do detach → a cache de
   código do FEX tem de usar a região pré-alocada (64 MB por agora).
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
- Fase 2.2: portar o FEX-Emu para iOS e pô-lo a usar a região JIT pré-alocada.
