# Neon Horde

Roguelite *survivor* em HTML5 (canvas, zero dependências) feito para o CrazyGames.
Sobrevive 10 minutos contra um enxame infinito, sobe de nível, junta armas e derruba 4 titãs.

- `game.html`: o jogo inteiro (fonte).
- `bg.jpg`: fundo de nebulosa (2048², seamless), gerado por `tools/make_bg.py` (numpy + Pillow).
- `build.sh`: gera `dist/` (`index.html` com o SDK v3 do CrazyGames + `bg.jpg`). Faz zip da pasta para o upload.

```sh
python3 tools/make_bg.py bg.jpg   # só se quiseres outro fundo (muda SEED)
./build.sh                        # → dist/
```

## O que está lá dentro

| Sistema | Detalhe |
|---|---|
| Armas | Pulse Blaster, Orbit Blades, Arc Coil, Nova Pulse, Seeker Swarm (5 níveis cada) |
| Passivas | 11 (dano, cadência, multi-tiro, pierce, velocidade, HP, regen, íman, área, crítico, armadura) |
| Inimigos | drone, runner, brute, splitter (divide-se), spitter (dispara), elites com baú |
| Eventos | enxame em anel a cada 60 s, titã a cada 2:30 (4.º titã = vitória, depois modo infinito) |
| Meta | ouro guardado entre runs → 7 upgrades permanentes (loja) |
| Mobile | joystick flutuante por toque, zoom adaptado ao ecrã, cartas em coluna |
| Juice | screen shake, hit-stop, flash, partículas, números de dano, som e música sintetizados |

## Integração CrazyGames (SDK v3)

Sem SDK presente tudo funciona na mesma (os anúncios passam a "grátis").

- `loadingStop` no arranque; `gameplayStart` / `gameplayStop` em run, pausa, game over e menu.
- `happytime` ao matar um titã e ao ganhar.
- **Rewarded**: reviver uma vez por run; reroll das cartas depois de gastar os 2 grátis.
- **Midgame**: entre runs ("Play again").
- O áudio é suspenso durante anúncios; o jogo pausa ao perder foco ou mudar de separador.
- Setas e espaço não fazem scroll à página.

## Balanço (bot de teste, escolhas aleatórias, sem meta-upgrades)

Primeira run: chega ao nível 13-17, mata o 1.º titã e morre por volta dos 3:30, com ~100 de ouro.
É o ritmo pretendido. A primeira run ensina e paga o primeiro upgrade. Chegar aos 10:00 pede skill e progressão.

## Plano de lançamento

1. Upload em developer.crazygames.com → fase *Basic Launch* (tráfego de teste).
2. Métricas que decidem o *Full Launch*: tempo médio de jogo e retenção. O loop run → ouro → loja existe para isso.
3. Próximos passos se os números forem bons: guardar progresso na cloud com `SDK.data`, mais um titã e mais uma arma por update, traduções (PT/ES/FR/DE são baratas, o texto é pouco), leaderboard semanal.
