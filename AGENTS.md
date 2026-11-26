# Working on Echoes of Lantern Vale

Every update must update this file and the documentation in the same commit or pull request. Keep the maintenance record below current, update the relevant guide in `docs/`, and update `README.md` when the change affects players, setup, or release instructions. A change is incomplete until the code and documentation agree.

## Repository workflow

- GitHub `main` is the source of truth. External contributors propose changes through a pull request. `@Gavintool` is the required code owner for every path.
- The repository owner can authorize Codex to publish changes directly using the owner’s GitHub access. Keep branch protection and the code-owner requirement in place.
- Run `npm test` and `npm run build` for every update. Run `npm run test:browser` against the dev server for changes to movement, the menu, dialogue, or progress.
- Use 奶龙 in all player-facing text. Keep third-party art, model, audio, and font provenance in [the asset guide](docs/ASSETS.md).
- Reuse the existing Sites project from `.openai/hosting.json`. Build with `npm run build` and publish the same verified source commit. Preserve the Site’s audience during updates.

## Architecture

- `src/story.js` owns chapter boundaries, interactions, branching dialogue, and endings.
- `src/world.js` owns the first-person controller and range checks. `src/scenery.js` builds the 3D scenes.
- `src/main.js` owns UI modes, dialogue playback, and checkpoints. `src/save.js` owns the save format and storage.
- Keep all player-facing copy in Simplified Chinese. Update voice assets when changing a spoken line. Run the voice coverage test and keep render provenance in the asset guide.
- Keep existing slot data readable. If a save revision changes, ship a migration, update [the development guide](docs/DEVELOPMENT.md), and test the old and new formats.

## Maintenance record

- **1.0.0** added five chapters, three relationship routes, three endings, the tuning puzzle, three named save slots, desktop and touch controls, and static Sites hosting.
- **2026-11-26** opened the live Sites deployment to the public. Players can start a journey without signing in.
- **1.1.0** localized the game and story into Simplified Chinese, added 79 Mandarin dialogue clips and a new stereo soundtrack, added four optional investigations, and dressed the supporting 奶龙 cast using the supplied reference photo.
