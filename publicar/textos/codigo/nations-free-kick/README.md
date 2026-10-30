# Nations Free Kick - HTML5 football tournament game (source code)

Free-kick duels across a 48-team international tournament. Bend the ball round the wall or lift
it over, then swap roles and save the CPU's shot.

- 96 nations with kits, flags and strength ratings; a fresh tournament draw every run
- Full tournament engine: 12 groups of 4, best third-placed teams, knockout bracket to the final
- Ball-flight model with curl, arc, a jumping wall, woodwork and keeper reach
- Desktop (mouse/keyboard) and mobile (touch)
- No build step: plain ES modules
- CrazyGames SDK v3 wrapper: midgame ads at natural breaks, rewarded "second chance" after a
  knockout defeat, cloud save. A no-op on any other host.

## Run it

    python3 -m http.server   # then open http://localhost:8000

## Code map

| File | What it does |
|---|---|
| `engine.js` | Teams data and tournament rules (draw, groups, standings, bracket). No DOM. |
| `freekick.js` | Free-kick geometry, wall, ball flight, CPU taker and CPU keeper. No DOM. |
| `keeper.js` | Shared goalkeeper motion and save detection. |
| `renderer.js`, `sprites.js`, `fx.js` | Canvas drawing, player sprites, confetti and flashes. |
| `game.js` | Screens, input, match flow, saving. |
| `i18n.js` | Every visible string, in one place for translation. |
| `sdk.js` | Portal SDK wrapper. Swap this to target another portal. |
| `audio.js` | Crowd and kick samples with synthesised fallbacks. |

## Reskin ideas

Club cup instead of nations (edit `DATA` in `engine.js` and the flags), a different sport with
the same aim-and-power loop, or translate `i18n.js`.

## Third-party

- Flags: flag-icons by Panayiotis Lipiridis (MIT licence).
- Fonts: Inter and Barlow Condensed (SIL Open Font License 1.1).
- Sound effects in `assets/sfx`: CC0 recordings.
- Nation names and colours are factual; no federation crests, logos or official tournament names
  are used.
