# Splat Stack - HTML5 puzzle platformer (source code)

A jelly platformer where every death becomes a block. Die in the right place, stack your
corpses into stairs, jam saws with them and reach the door.

- 24 hand-made levels with par scores and 3-star ratings
- Unlockable skins, level select, save progress
- Desktop (keyboard) and mobile (on-screen buttons, rotate prompt)
- No build step: plain ES modules, open `index.html` from any static server
- All audio is synthesised with WebAudio (no audio files)
- CrazyGames SDK v3 wrapper already wired: midgame ads between levels and a
  rewarded "Skip level" button. It is a no-op on any other host.

## Run it

    python3 -m http.server   # then open http://localhost:8000

(ES modules do not load from `file://`.)

## Code map

| File | What it does |
|---|---|
| `src/sim.js` | Deterministic 60 Hz simulation: physics, traps, splats. No DOM, no randomness. |
| `src/levels.js` | Levels as 30x17 ASCII maps. The legend is at the top of the file. |
| `src/render.js` | Canvas renderer and particles. |
| `src/main.js` | Game loop, input, menus, stars, skins, saving. |
| `src/platform.js` | Portal SDK wrapper (ads, gameplay events, cloud save). Swap this to target another portal. |
| `src/audio.js` | Synthesised sound effects and music loop. |

## Add a level

Copy an entry in `src/levels.js`, draw the map with the legend characters (exactly 17 rows of
30 characters), set `name`, `hint` and `par`. `parseLevel` throws a clear error if a row has the
wrong length or a tile is unknown.

## Third-party

- Fonts: Fredoka and Outfit (SIL Open Font License 1.1), self-hosted in `fonts/`.
