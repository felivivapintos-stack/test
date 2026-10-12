# Investigação: o que existe e como funciona

_Data: outubro de 2026._

## 1. Os projetos que deram origem à ideia

| Projeto | Plataforma | O que se sabe | Fonte |
|---|---|---|---|
| **Vapor** | iPhone, iPad, Apple TV | GTA V (PC, DX11, 1080p) num iPhone 18 Pro Max: **média de ~66 fps a conduzir na cidade e ~80 fps noutras cenas**. Só capturas de ecrã, sem vídeo de gameplay nem verificação independente. Programador anónimo, código fechado, ainda não distribuído. Usa JIT. | gtaboom, neoteo |
| **Madeira** (Will Faust) | iPhone/iPad (A15+) | Port do **Wine (ARM64EC)** para iOS + **FEX-Emu** (x86-64 → ARM64) + **DXMT** (Direct3D 11 → Metal). RDR2 ~30 fps a ~720p no iPhone 18 Pro; GTA V, Fallout 4, Far Cry 3, Dead Space a correr. Sideload por IPA, precisa de JIT ativado. Usa ~7,6 GB de RAM no RDR2 (com "swap" para armazenamento). | notebookcheck |
| **Winlator / GameHub / Mobox** | Android | Wine + Box64/FEX + DXVK/VKD3D + drivers Turnip (Adreno). Já maduro, código aberto (Winlator). | — |

**Conclusão honesta:** os números de 80 fps vêm do próprio autor e não estão verificados. O que está
demonstrado publicamente (Madeira) é que a abordagem **funciona**, mas com desempenho bem mais modesto
em jogos pesados. Isto não é "um emulador" feito do zero: é a **integração** de vários projetos open
source grandes, com muito trabalho de engenharia específico de iOS.

## 2. A pilha técnica (o que tem de existir)

```
 Jogo .exe (x86-64, Windows, DirectX)
        │
 ┌──────▼────────┐  Wine: implementa a API do Windows (kernel32, user32, ntdll…)
 │  Wine (ARM64EC)│  em cima de POSIX/Darwin.
 └──────┬────────┘
        │ código x86-64 do jogo
 ┌──────▼────────┐  Tradutor binário com JIT: converte x86-64 → ARM64 em runtime.
 │ FEX-Emu / Box64│  Sem JIT → interpretador → 10–50x mais lento → injogável.
 └──────┬────────┘
        │ chamadas Direct3D 11 / 12
 ┌──────▼────────────────────────┐
 │ DXMT (D3D11→Metal)  [iOS/tvOS] │
 │ DXVK/VKD3D→Vulkan   [Android]  │
 └──────┬────────────────────────┘
        │
   GPU Apple (Metal) / Adreno-Mali (Vulkan)
```

Componentes adicionais: áudio (Wine → CoreAudio/AAudio), entrada (comando MFi/Xbox/PS + controlos
táteis sobre o ecrã mapeados para XInput), sistema de ficheiros (sandbox da app), gestão de memória.

## 3. Os obstáculos reais por plataforma

### iOS / iPadOS
- **JIT é proibido** para apps normais. Só funciona em apps **instaladas por sideload** e com JIT
  ativado via depuração (ferramentas do tipo StikDebug/SideStore/AltStore) ou em contas de
  programador. **Nunca vai para a App Store.** Cada versão do iOS pode partir o método de ativar JIT
  — é o maior risco do projeto. _(Verificar o estado atual no iOS 27 antes de começar.)_
- **Páginas de 16 KB** no iOS vs 4 KB que o código x86/Windows assume → o Wine/FEX precisam de
  ajustes (FEX já lida com isto no Asahi Linux, o que ajuda).
- **Memória:** o iOS mata apps que usem demasiada RAM. Precisa do entitlement
  `com.apple.developer.kernel.increased-memory-limit` e de dispositivos com 8–12 GB.
- **Sem `fork()`/`exec()`** e processos separados → o Wine (que usa wineserver como processo à
  parte) tem de correr tudo num só processo. Esta é a parte mais difícil do port.
- Compilar exige **macOS + Xcode** (não é possível neste ambiente Linux).

### Android
- O caminho mais fácil: JIT é permitido, Vulkan disponível, e o **Winlator** (open source) já faz
  quase tudo. Um fork bem feito dá resultados em semanas, não anos.
- Desempenho depende muito do SoC (Snapdragon 8 Gen 3/Elite com Turnip é o melhor caso).

### Apple TV (tvOS)
- O mais difícil: sem sideload prático com JIT (não há maneira de "anexar depurador" comum),
  ~3–4 GB de RAM no Apple TV 4K, armazenamento da app limitado. Considerar só depois do iOS
  funcionar, ou como **cliente de streaming** (Moonlight/Steam Link) de um PC.

## 4. Questões legais
- Não se pode distribuir jogos nem DLLs da Microsoft; o utilizador traz os seus próprios ficheiros.
- Wine é LGPL, FEX-Emu é MIT, Box64 é MIT, DXVK é zlib, DXMT é LGPL? (confirmar) — permitem uso,
  mas modificações ao Wine/DXMT têm de ser publicadas.
- Jogos com anti-cheat ao nível do kernel (GTA Online/BattlEye, etc.) **não funcionam** — só modo
  história/offline. DRM do Steam exige o cliente Steam a correr (Madeira resolveu com um cliente
  mínimo); jogos GOG sem DRM são o alvo inicial ideal.

## Fontes
- https://www.neoteo.com/en/vapor-reports-gta-v-averages-of-66-and-80-fps-on-iphone-18-pro-max
- https://www.gtaboom.com/gta-5-is-now-running-on-the-iphone-through-a-new-tool-called-vapor-1638
- https://www.notebookcheck.net/Developer-shows-off-Red-Dead-Redemption-2-GTA-V-Fallout-4-and-other-AAA-PC-games-running-natively-on-iPhone-18-Pro.1405762.0.html
- https://propakistani.pk/2026/09/28/iphone-18-pro-max-runs-gta-v-better-than-you-might-expect/amp/

## Atualização: o Madeira é open source
O Madeira está publicado em https://github.com/willfaust/Madeira (GPL-3.0-or-later), com IPAs
nas releases. Já tem: Wine 11.4 em ARM64EC num só processo (wineserver numa thread), FEX,
DXMT (D3D9/10/11), D3D12 próprio, WoW64 (jogos de 32 bits), Steam, controlos, JIT via
StikDebug/StikJIT e correção do problema do registo x18 (que o iOS pode pôr a zero).
Requisitos: iOS 26+, JIT e "Memory+". A compilação só é possível num Mac e precisa de
entradas que não estão no repositório (LLVM compilado para iOS, runtime VC++ da Microsoft…).

Também se confirmou no banco de testes do CI que o Wine oficial no macOS ARM é morto ao
executar código PE (não usa `MAP_JIT`), ou seja, falta exatamente o trabalho que o Madeira já fez.
