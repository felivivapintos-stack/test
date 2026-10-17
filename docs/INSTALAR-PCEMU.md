# Instalar o PCEmu no iPhone

## Uma vez só: SideStore a partir de um PC Windows (não é preciso Mac)
1. No PC (Windows 64 bits): instala o **iTunes da Apple** (versão do site da Apple, não a da
   Microsoft Store) e o **iloader** (https://github.com/nab138/iloader/releases ou
   `winget install nabdev.iloader`).
2. No iPhone: instala o **LocalDevVPN** (App Store) e liga o **Modo de programador**
   (Definições → Privacidade e segurança).
3. Liga o iPhone ao PC por cabo → "Confiar".
4. Abre o iloader → entra com o teu Apple ID → escolhe o iPhone → **Install SideStore**.
   Usa a opção do iloader para criar/colocar o **ficheiro de emparelhamento** no SideStore.
5. No iPhone: Definições → Geral → VPN e gestão de dispositivos → confia no teu Apple ID.
6. Abre o SideStore com o LocalDevVPN ligado e entra com o mesmo Apple ID.

A partir daqui o PC já não é preciso: o SideStore renova as apps no próprio iPhone
(com o LocalDevVPN ligado), a cada 7 dias com Apple ID gratuito.

## Instalar o PCEmu

1. No iPhone, abre a página **Releases** do repositório → "PCEmu (última versão)" →
   descarrega `PCEmu.ipa`.
2. Instala-o com o **SideStore** (o teu Apple ID). Com conta gratuita, renova a cada 7 dias.
3. **Memory+**: se a app disser que falta, usa a ferramenta *GetMoreRam* para juntar
   `increased-memory-limit` ao App ID.
4. **JIT (iOS 27, sem PC)**: Wi-Fi + LocalDevVPN ligado → na app, **In-app** → **Start pairing**
   → Definições do iPhone → Privacidade e segurança → Modo de programador → **Pair with …**
   → código → volta à app → **Check setup** → **Enable JIT**.
5. Em Definições da app, **JIT** e **Memory+** devem ficar verdes.

## Jogos
- **Steam**: inicia sessão na app com a tua conta Steam e instala os jogos que tens.
- **Outros jogos teus** (GOG, etc.): copia a pasta do jogo pela app Ficheiros para
  `PCEmu › wine › drive_c` e toca em **+** para escolher o `.exe`.

O iPhone 13 mini (4 GB) serve para jogos leves e antigos; jogos pesados precisam de 8 GB+.
