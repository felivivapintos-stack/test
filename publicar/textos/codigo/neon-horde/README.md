# Neon Horde - HTML5 survivor-like (source code)

Survive ten minutes against an endless neon swarm. Weapons fire on their own; you move, level up
and stack upgrades, then break four titans.

- Auto-firing weapons with 5-level upgrade paths, level-up choices with reroll
- Four titan bosses, a ten-minute run structure, permanent gold upgrades between runs
- Keyboard and touch (drag to move), quality toggle for low-end devices
- One self-contained `index.html` (plus `bg.jpg`): no build step, no dependencies
- CrazyGames SDK v3 wrapper: rewarded reroll and a midgame ad between runs. A no-op on any other host.

## Run it

Open `index.html` through any static server (`python3 -m http.server`).

## Where things are

Everything is in `index.html`. Search for these markers:

- `const WEAPONS` - weapon definitions and the text of each upgrade level
- `Upgrades` - the level-up and shop logic
- `CrazyGames` - the portal wrapper (swap it to target another portal)

## Third-party

- Fonts: Bungee and Chakra Petch from Google Fonts (SIL Open Font License 1.1).
