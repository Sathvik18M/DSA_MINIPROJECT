# Fieldwork · Minesweeper

A small game with a little room to think. Fieldwork is a complete, responsive Minesweeper implementation built around a **two-dimensional array**, with a muted green palette, tactile tiles, and keyboard and touch controls.

[Play Fieldwork](https://Sathvik18M.github.io/DSA_MINIPROJECT/)

## Play

- **Beginner:** 9 × 9, 10 mines.
- **Intermediate:** 16 × 16, 40 mines.
- **Expert:** 16 × 30, 99 mines.
- Click to reveal; right-click to flag. On touch screens, use the Reveal / Flag switch.
- The first square and all its neighbors are always safe.
- Double-click an open number to reveal its remaining neighbors when enough flags surround it. Incorrect flags can uncover a mine.
- Use arrow keys to move, **Enter / Space** to reveal, **F** to flag, and **C** to open neighbors.
- Pause hides the board and stops the timer. Leaving the tab automatically pauses an active game.
- Personal bests, difficulty, and optional sound preference are saved on the current device. No account or backend is required.

## Run locally

Requires Node.js 22 or later. No dependency installation is needed.

```sh
npm run dev
```

Open http://127.0.0.1:4173. To check the production build:

```sh
npm test
npm run build
npm run preview
```

The production build contains only HTML, CSS, JavaScript, the favicon, and license. Fonts use Google Fonts with system fallbacks; the game itself has no third-party runtime dependencies.

## Data structures and algorithms

`src/game.js` contains the game rules independently of the interface:

- **2D array:** `board[row][col]` holds mine, flag, reveal, and adjacent-count state.
- **Neighbor traversal:** each cell checks up to eight bounded neighbors.
- **Fisher–Yates shuffle:** places the exact number of mines without duplicates, excluding the opening square and its neighbors.
- **Iterative breadth-first flood fill:** reveals connected empty regions and their numbered boundary without recursive stack growth.
- **Win detection:** tracks revealed safe cells instead of rescanning the board after every move.

Board initialization and flood fill are **O(rows × columns)** time and space. A single flag operation and neighbor lookup are **O(1)**. Rendering updates at most one board's cells.

## Deployment

The GitHub Actions workflow tests the game, builds `dist/`, and publishes it to GitHub Pages when `main` changes. Pull requests run the tests and build without publishing.

For a fork, enable **Settings → Pages → Build and deployment → Source: GitHub Actions** and run **Test and deploy Fieldwork**. The static assets use relative paths, so repository subpaths work without additional configuration.

## Project files

```text
index.html              Accessible app layout and instructions
styles.css              Responsive interface and board styles
src/game.js             Framework-independent Minesweeper rules
src/app.js              Interactions, timer, audio, and local records
test/game.test.js        Deterministic game-rule tests
scripts/build.mjs       Static production build
scripts/serve.mjs       Local development server
.github/workflows/      Test and GitHub Pages deployment
```

Licensed under the [Apache License 2.0](LICENSE).
