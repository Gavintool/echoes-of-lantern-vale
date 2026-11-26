# Echoes of Lantern Vale · 灯谷回声

*The valley lost its voice. All that’s left is one very loud laugh.*

Echoes of Lantern Vale is a first-person 3D story game inspired by the 奶龙 meme. You play a courier returning home with a parcel from your mother and a deadline that nobody remembers hearing. Walk the canal, follow the laugh, and help the people of the Vale decide which voices belong in their future.

- Five chapters with galgame-style portraits, branching dialogue, two optional romantic routes, a friendship route, and three endings.
- A walkable lantern village with animated water, an original synthesized score, a story puzzle, and a journal.
- Three named save slots, autosave, manual saving, a dialogue log, touch controls, and adjustable 3D quality, text speed, sound, and ambient motion.

## Play

[Open the game on Sites](https://echoes-of-lantern-vale.tool-not-me.chatgpt.site) without signing in, or run the public source locally. A browser with WebGL 2 is required. Desktop Chrome is the tested browser.

```sh
npm ci
npm run dev
```

Open [the local game](http://127.0.0.1:5173/). Use Node.js 22.12 or later. Select **Begin Journey**, choose a slot, and confirm its name.

| Action | Controls |
| --- | --- |
| Move | **WASD** or the touch stick. **Shift** moves faster. |
| Look | Drag the view, or use **← / →** and **Page Up / Page Down**. **M** captures the mouse where supported. |
| Interact | Approach the diamond marker, then press **E** or tap the prompt. |
| Read and choose | **Space** or **Enter** advances dialogue. **1–3** selects a reply. |
| Journal and pause | **J** opens the journal. **Esc** pauses and closes panels. |

Saves stay in your browser on the origin where you started. A local save and a hosted save are separate. Use **Load Journey** to switch slots. **New Journey** asks before replacing a slot.

## Develop

- [Development guide](docs/DEVELOPMENT.md) covers the runtime, save format, checks, and deployment.
- [Story guide](docs/STORY.md) contains spoilers, character motivations, and route details.
- [Asset credits](docs/ASSETS.md) lists sources and licenses.
- [AGENTS.md](AGENTS.md) documents the upkeep and pull request workflow.

This is an unofficial fan game. The original 奶龙 IP belongs to Seventh Impression.
