# Instalar o PCEmu no iPhone

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
