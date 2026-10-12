# Wine no iOS: desenho técnico

## O problema central: memória executável com TXM
No iPhone 13 mini com iOS 27 (e em todos os iPhones recentes) há **TXM**. Uma app só pode
executar código em memória que o depurador (StikDebug) "preparou":

- A app chama `JIT26PrepareRegion(addr, len)` (`brk #0xf00d`, `x16 = 1`).
- O script `universal.js` do StikDebug escreve **um byte (`0x69`) no início de cada página de
  16 KB** dessa região, através do depurador. É isso que a torna executável.
  → Consequência: preparar **primeiro**, escrever o código **depois** (por um alias RW).
- Enquanto a app não chamar `JIT26Detach`, o script continua ligado e pode preparar mais
  regiões. O custo é que **todos os sinais** (SIGSEGV, SIGUSR1…) passam pelo depurador, o que
  é lento. O Wine usa sinais com frequência, por isso o objetivo é reservar tudo no arranque e
  desligar o depurador.
- Os endereços têm de estar abaixo de 64 GB (o StikDebug codifica 9 dígitos hexadecimais).

## A boa notícia: com ARM64EC quase nada precisa de ser executável
O código x86/x64 dos jogos **nunca** é executado diretamente. O FEX lê-o e gera código ARM64
na sua própria cache. A memória que precisa de execução nativa é só:

| O quê | Tamanho aprox. | Quando |
|---|---|---|
| DLLs PE ARM64/ARM64EC do Wine (ntdll, kernel32, user32, d3d11…) + FEX | ~150–250 MB | carregadas no arranque/sob pedido |
| Cache de código do FEX (JIT) | 128–512 MB | escrita continuamente |
| Código unix do Wine (`*.so` Mach-O) | — | assinado com a app, não conta |

## Plano: "piscina executável"
1. No arranque, com o depurador ligado, a app reserva uma piscina (p. ex. 768 MB) com
   `JIT26PrepareRegion` e cria um alias RW para ela. Depois chama `JIT26Detach`.
2. Patch ao `dlls/ntdll/unix/virtual.c` (só iOS): pedidos de memória executável
   (`PAGE_EXECUTE*`, secções executáveis de imagens PE ARM64) são servidos a partir da
   piscina. O Wine escreve através do alias RW e o código corre no endereço RX.
3. Imagens PE ARM64/ARM64EC são relocalizáveis, por isso o Wine pode escolher endereços dentro
   da piscina.
4. O FEX (dentro do Wine) aloca a cache de código com `NtAllocateVirtualMemory(PAGE_EXECUTE_READWRITE)`.
   Isso passa pelo mesmo caminho. É preciso ver como alterna escrita/execução (testes no Mac).

Sem TXM (iOS < 26 ou aparelhos antigos), basta o depurador ligar-se uma vez (`CS_DEBUGGED`)
e o Wine pode usar `mprotect` com `PROT_EXEC` normalmente.

## Outros obstáculos do iOS e o que fazer
| Obstáculo | Solução prevista |
|---|---|
| Sem `fork`/`exec`: o Wine arranca o `wineserver` como processo | compilar o wineserver como biblioteca e corrê-lo numa thread da app |
| `wineserver` usa a porta Mach da tarefa do cliente (`server/mach.c`) | mesmo processo → `mach_task_self()` |
| `CreateProcess` (lançadores, jogos com vários processos) | não suportado na 1.ª versão; só um processo |
| Loader `wine` é um executável | a própria app faz o papel do loader: `dlopen` do `ntdll.so` |
| Bibliotecas unix (`.so`) têm de estar assinadas | empacotá-las em `Frameworks/` para o SideStore as assinar |
| Memória limitada (4 GB no 13 mini) | ARM64EC evita WoW64 de 32 bits; piscina e caches dimensionadas pelo aparelho |

## Banco de testes sem iPhone
O macOS ARM tem páginas de 16 KB e o mesmo kernel base (XNU). O job `wine-macos` do CI
compila o Wine oficial com `--enable-archs=arm64ec,aarch64` e corre:
- `hello-arm64.exe` → Wine nativo funciona;
- `hello-x64.exe` via `libarm64ecfex.dll` → FEX dentro do Wine funciona.
Só depois disto passa a fazer sentido mexer no código específico do iOS.
