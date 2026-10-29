# Jogos Roblox

Cada pasta aqui é um projeto Rojo: os scripts são escritos neste repositório e o Rojo
sincroniza-os com o Roblox Studio.

- `rokit.toml` — versão do Rojo usada por todos os projetos.
- `teste-rojo/` — projeto mínimo para confirmar que a ligação Rojo ↔ Studio funciona.
- `shared/` — base comum (remotes, rondas, gravação, UI) incluída por todos os jogos.
- `gobble-royale/` — 1.º jogo convertido.

Só um `rojo serve` de cada vez (todos usam a porta 34872): fecha o anterior com Ctrl+C.

Para ligar um projeto: abre um terminal na pasta dele, corre `rojo serve` e, no Studio,
carrega em **Connect** no plugin do Rojo.
