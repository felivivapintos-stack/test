# Publicar jogos no itch.io e no CrazyGames

Para publicar um jogo novo ou uma atualização, metes a build HTML5 numa pasta, fazes push, e o GitHub Actions trata do resto.

| Plataforma | O que é automático |
|---|---|
| **itch.io** | Tudo: a build é enviada com o [butler](https://itch.io/docs/butler/), a ferramenta oficial do itch.io. |
| **CrazyGames** | A validação e o `.zip` pronto a carregar. O CrazyGames **não tem API pública de envio**: a submissão faz-se no [portal de developers](https://developer.crazygames.com/) e passa por revisão humana. |

## Configurar (só uma vez)

1. **Cria a página do jogo no itch.io** em <https://itch.io/game/new> e escolhe o tipo *HTML*. O butler envia builds, mas não cria páginas.
2. **Gera uma chave de API** em <https://itch.io/user/settings/api-keys>.
3. No GitHub, vai a **Settings → Secrets and variables → Actions → New repository secret**. Cria um segredo chamado `BUTLER_API_KEY` e cola lá a chave.
4. Em [`jogos.json`](jogos.json), troca `O-TEU-UTILIZADOR-ITCH` e `nome-do-jogo-no-itch` pelos valores do teu URL (`https://utilizador.itch.io/nome-do-jogo`).
5. Depois do **primeiro** envio, abre a página do jogo no itch.io e marca o ficheiro `html5` como *"This file will be played in the browser"*. Os envios seguintes usam sempre esse ficheiro.

## Publicar um jogo

1. Põe a build HTML5 (a pasta que tem o `index.html`) dentro de `publicar/`, por exemplo `publicar/meu-jogo/`.
2. Acrescenta o jogo a `jogos.json`:

   ```json
   {
     "id": "meu-jogo",
     "nome": "O Meu Jogo",
     "pasta": "meu-jogo",
     "versao": "1.0.0",
     "itch": { "utilizador": "eu", "jogo": "meu-jogo", "canal": "html5" },
     "crazygames": true
   }
   ```

3. Faz commit e push. O workflow **Publicar jogos** corre sozinho:
   - envia o jogo para o itch.io;
   - cria `meu-jogo-crazygames.zip` e guarda-o no artefacto **pacotes-crazygames** da execução, no separador *Actions*.
4. Para o CrazyGames, descarrega esse `.zip` e carrega-o em <https://developer.crazygames.com/>. Para atualizar um jogo que já lá está, carregas o novo `.zip` no mesmo jogo.

Também podes correr o workflow à mão: *Actions → Publicar jogos → Run workflow*. Aí podes indicar só alguns jogos.

## Correr no teu computador

```bash
export BUTLER_API_KEY=a-tua-chave
python3 publicar/publicar.py               # todos os jogos
python3 publicar/publicar.py meu-jogo      # só um
python3 publicar/publicar.py --so-verificar  # valida e cria os .zip, sem enviar nada
```

Só precisas de Python 3. Se o butler não estiver instalado, o script descarrega-o sozinho.

## O que o script verifica

- A pasta existe e tem `index.html` na raiz, que é obrigatório nas duas plataformas.
- O tamanho total e o número de ficheiros. Se passarem os limites indicativos do CrazyGames, aparece um aviso. Os limites atuais estão em <https://docs.crazygames.com/requirements/>.

`publicar/exemplo/` é um jogo mínimo para testar o circuito. Podes apagá-lo, e tirá-lo do `jogos.json`, quando tiveres os teus.
