# Development guide

## Run and verify

Install Node.js 22.12 or newer, run `npm ci`, then start `npm run dev`. Vite serves the game on port 5173 by default. Use `npm run build` to create a portable static build in `dist/`. Serve the folder over HTTP or HTTPS so browser modules can load.

- `npm test` verifies save isolation, malformed checkpoints, puzzle retries, and all nine route and ending combinations. GitHub Actions runs it and the production build on pushes and pull requests.
- `npm run test:browser` uses installed Google Chrome to walk the real scene, create and reload a save, consult the journal, retry the puzzle, and complete a route. Start the game server first. Set `LANTERN_TEST_URL` to verify another local build or an accessible deployment.
- If the 3D scene runs slowly, choose **Performance** in Settings. It reduces rendering resolution, dynamic lighting, and shadows. Audio starts after an interaction.

## Runtime

| Component | Responsibilities |
| --- | --- |
| `src/main.js` | Title, saves, overlays, routing, focus, dialogue playback, HUD, and checkpoint scheduling |
| `src/story.js` | Cast, scene text, reply effects, progression rules, world coordinates, discoveries, and outcomes |
| `src/world.js` | Camera, keyboard, first-person movement, collision, and interaction distance |
| `src/scenery.js` | Instanced geometry, lights, characters, particles, water, and scene markers |
| `src/audio.js` | Original synthesized score, ambience, footsteps, and story cues |
| `src/save.js` | Validation, save slots, settings, and formatting |
| `src/assets/` | Local art assets processed by Vite |

To add a story beat, register its location in `targets`, create its scene and discovery, and test chapter completion, replay, and save behavior. The playable lane runs along negative Z. A chapter opens its own movement area, and milestones determine which targets are available. Scenes apply choice effects to a draft and commit the result once the final line is acknowledged. A wrong tuning answer leaves the organ interactable. Chapter changes move the camera to the next chapter’s spawn.

## Persistence

Version 1 uses `localStorage` keys under `lantern-vale:v1:`. The three slot records contain a name, act, completed scenes, position, camera angles, bond flags, tuning state, route, ending, play time, and save timestamp. Settings have a separate key. The game saves at creation, completed scenes, every 15 seconds of exploration, and when leaving or hiding the page. A manual save also preserves the current camera position. Leaving mid-dialogue resumes before that conversation. Browser private mode or blocked storage can limit persistence.

## Publishing

The public GitHub repository is the canonical source. Keep `.openai/hosting.json` tied to the existing Sites project and publish `dist/` built from the same verified commit. The Site is owner-private. The build requires no server runtime, account integration, or external write API.

GitHub protects `main` with required code-owner review from `@Gavintool`, stale approval dismissal, and blocked forced updates and deletion. The owner retains administrative bypass for authorized changes. GitHub detects `.github/CODEOWNERS` on the base branch.
