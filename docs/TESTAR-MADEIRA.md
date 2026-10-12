# Testar o Madeira no iPhone 13 mini

O Madeira (https://github.com/willfaust/Madeira) já corre jogos de PC no iPhone. Antes de
fazermos uma versão própria, vale a pena ver como se porta no teu aparelho.

## 1. Instalar
1. No iPhone, abre https://github.com/willfaust/Madeira/releases e descarrega o `.ipa` da
   versão mais recente.
2. Instala-o com o **SideStore** (ou AltStore/Sideloadly), com o teu Apple ID.
3. **Memory+**: o Madeira precisa da autorização `increased-memory-limit`. Com Apple ID
   gratuito pode não vir ativa; o próprio Madeira sugere a ferramenta **GetMoreRam** para a
   juntar ao App ID. Sem ela o iOS dá pouca memória à app e os jogos fecham.

## 2. Ativar o JIT (iOS 27, sem computador)
1. Instala o **LocalDevVPN** (App Store) e liga-o. Usa Wi-Fi (não funciona com dados móveis).
2. No Madeira: configuração inicial → **In-app** → **Start pairing** (aceita "Rede local").
3. Definições do iPhone → Privacidade e segurança → Modo de programador → **Pair with Madeira**
   → escreve o código que o Madeira mostra.
4. Volta ao Madeira → **Check setup** → **Enable JIT**.
5. Em **Settings** do Madeira, **JIT** e **Memory+** devem estar com ✓ verde ("Ready to play").

## 3. O que testar (por esta ordem)
1. Um jogo leve e sem DRM (por ex. um indie da GOG, de 2D ou DirectX 9).
2. Um jogo DirectX 11 de 2010–2015, da GOG.
3. Só depois algo pesado. GTA V provavelmente não cabe nos 4 GB do 13 mini.

## 4. O que me deves dizer
- Se o JIT e o Memory+ ficaram verdes (e, se não, a mensagem de erro).
- Para cada jogo: nome, se abriu, FPS aproximados, se fechou sozinho e quando.
- Capturas de ecrã dos erros.
