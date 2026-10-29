# Base comum

Módulos partilhados por todos os jogos. Cada projeto Rojo inclui-os com caminhos relativos:

```json
"ReplicatedStorage": { "Comum": { "$path": "../shared/src/Comum" } },
"ServerScriptService": { "ComumServidor": { "$path": "../shared/src/Servidor" } }
```

## `Comum` (ReplicatedStorage, servidor e cliente)

- `Remotes` — cria (servidor) ou espera (cliente) RemoteEvents, UnreliableRemoteEvents e RemoteFunctions
  numa pasta `ReplicatedStorage.Remotes`. `Remotes.evento(nome)`, `Remotes.rapido(nome)`, `Remotes.funcao(nome)`.
- `Fase` — lê a fase da ronda (`"AEspera"`, `"Intervalo"`, `"Ronda"`, `"Resultados"`) e o tempo que falta.
  O servidor escreve-a com o `GestorRondas`; o cliente só lê.
- `UI` — atalhos para criar interfaces em código (`UI.criar`, `UI.ecra`, `UI.botao`, `UI.texto`, `UI.painel`)
  com o mesmo tema em todos os jogos. Funciona em PC, telemóvel e consola.
- `Util` — `formatarTempo`, `escolher`, `baralhar`, `arredondar`.

## `Servidor` (ServerScriptService, só servidor)

- `GestorRondas` — ciclo AEspera → Intervalo → Ronda → Resultados, com callbacks por jogo.
- `DadosJogador` — gravação com DataStore: carrega ao entrar, grava de 2 em 2 minutos, ao sair e ao fechar
  o servidor. No Studio sem acesso às APIs passa a modo memória (avisa no Output, não falha).
- `Estatisticas` — `leaderstats` (a tabela de pontuação do Roblox).

## Regras para todos os jogos

- Servidor autoritário: o cliente só envia inputs; pontos, acertos e dinheiro decidem-se no servidor.
- Tabelas de dados (armas, cartas, clubes, poderes) ficam em ModuleScripts `Config` de cada jogo.
- Som: o WebAudio sintetizado dos originais não existe no Roblox; cada jogo tem uma tabela de IDs de áudio
  (vazia até escolhermos sons da biblioteca).
