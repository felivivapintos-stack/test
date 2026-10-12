# Instalar e testar no iPhone (sem Mac)

A app é compilada na nuvem pelo GitHub Actions (que tem Macs). Tu só precisas do iPhone.
No iOS 27 o ficheiro de emparelhamento pode ser gerado no próprio iPhone (SideStore + Side
Installer, ver https://techybuff.com/enable-jit-iphone-without-computer-ios-27/). Se isso falhar,
usa um PC Windows ou Linux **uma única vez**.

Dispositivo de teste: iPhone 13 mini (A15, 4 GB RAM), iOS 27 → tem TXM, por isso a app usa o
protocolo `universal.js`. No iOS 27 só as apps com este protocolo mantêm o JIT.

## Configuração única
1. **Modo de programador** no iPhone: Definições → Privacidade e segurança → Modo de programador.
2. **SideStore** (instala apps fora da App Store com o teu Apple ID): segue https://sidestore.io —
   o instalador (iloader) corre em Windows/Linux e cria também o **ficheiro de emparelhamento**.
3. **LocalDevVPN** (App Store) e **StikDebug** (https://github.com/StikDebug/StikDebug, instalado
   pelo SideStore). Importa o ficheiro de emparelhamento no StikDebug.
4. No StikDebug, em dispositivos com iOS 26+: ativa **Silent Audio** e **Always Run Scripts**.

## Cada versão nova da app
1. No GitHub: separador **Actions** → "iOS build" → última execução → transfere `PCEmu-ipa`.
2. No iPhone, abre o zip na app Ficheiros e importa `PCEmu.ipa` no SideStore.
3. Abre o PCEmu → **Ativar JIT com o StikDebug** (com o LocalDevVPN ligado).
4. Sucesso = o registo mostra `2 + 40 = 42` e "JIT ativo ✅".

Com Apple ID gratuito as apps expiram ao fim de 7 dias (o SideStore renova-as).
