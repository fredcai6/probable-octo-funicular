# AGENTS.md

## Cursor Cloud specific instructions

This is a zero-dependency static HTML5 Canvas game (Pizza Runner). There is no package manager, build step, linter, or test framework.

### Running the application

Serve the static files with any HTTP server from the repo root:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html` in a browser. The game also works via `file://` protocol since there are no CORS-restricted fetches.

### Key files

- `index.html` — game page with canvas and mobile touch controls
- `game.js` — all game logic (canvas rendering, game loop, enemies, input handling)
- `style.css` — styling and responsive layout
- `test-controls.html` — standalone touch controls test page

### Notes

- No lint, test, or build commands exist. There are no `package.json`, lockfiles, or node_modules.
- High scores persist via `localStorage` (browser-native, no database).
- The game is entirely client-side with no backend or external API calls.
