# make_fun

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/fairy715/make_fun/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/fairy715/make_fun/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Lamplight Keeper**: an original browser game for make.fun's [Make the best game](https://make.fun/bounty/best-game-01) bounty. You keep a lighthouse through seven stormy nights. Swing the beam to guide merchant ships home past hidden reefs, drifting fog and icebergs; ships left in the dark lose their way. Hold the light on smugglers and Black Sail raiders until they give up, and catch the thing below as it rises before it drags a ship under. Pick one lamp-room improvement after each night. Gale watch runs the sea at 1.6x speed for 1.5x score; Calm watch is the gentler way in.

Controls: mouse swings the beam, hold the left button to focus it (burns oil), Space or right click sounds the foghorn, A / D turn by keyboard, P pauses, M mutes.

## Run it

```sh
open game/index.html            # or double-click it: plain static files, no build, no network
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # the hand-in the grader runs (Node 22.18+)
```

The game's code is in `game/src/`, one job per file: the rules (`world.js`, `ships.js`, `pirates.js`, `monster.js`, `sea.js`, `beam.js`, `upgrades.js`), drawing (`scene.js`, `render.js`, `hud.js`, `screens.js`, `effects.js`), and the browser side (`input.js`, `audio.js` with every sound synthesized by Web Audio, `storage.js`, `main.js`). `tools/balance.mjs` plays hundreds of full runs with the computer keeper to tune the difficulty; `tools/shoot.mjs` takes the screenshots from real play.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
