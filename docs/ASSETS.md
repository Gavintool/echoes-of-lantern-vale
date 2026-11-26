# Asset credits

| Asset | Provenance |
| --- | --- |
| `src/assets/milk-dragon.webp` | Existing transparent render of 奶蛙 by **zeshentian1**. The creator’s [Meshy listing](https://www.meshy.ai/posts/%E5%A5%B6%E8%9B%99-01a19f9e-bf1b-77ff-b000-5f8fbf9835a7) marks the work CC0. The game uses the published preview, trimmed and converted to WebP, for the menu, dialogue, and camera-facing scene actor. |
| `src/assets/vale.webp` | ImageGen environment plate. Original composition. |
| `src/assets/yun.webp`, `src/assets/ren.webp` | ImageGen portrait atlas, cropped into two WebP portraits. Original supporting characters. |
| 3D environment and villagers | Procedural meshes, generated textures, and shaders in `src/scenery.js`. |
| Music, ambience, and sound effects | Original sound design synthesized at runtime in `src/audio.js`. |
| Cinzel and Manrope | [Fontsource packages](https://fontsource.org/), SIL Open Font License. |
| Interface icons | [Lucide](https://lucide.dev/license), ISC license with upstream notices in the package. |
| Rendering engine | [Three.js](https://github.com/mrdoob/three.js/blob/dev/LICENSE), MIT license. |

The original 奶龙 animation IP belongs to [Seventh Impression](https://www.nailoong.com/ipStar/NaiLong/). No official association is claimed. The Meshy creator’s CC0 designation is for their asset.

The current release uses a sprite for 奶龙 in the 3D scenes. The renderer supports an optional source-authorized GLB named `src/assets/milk-dragon.glb`, with +Y up and +Z forward. The shipped sprite also serves as the fallback if that file is absent or fails to load.

## Artwork prompts

Built-in ImageGen was used for the two original art commissions.

- **Lantern Vale** — “Widescreen videogame main menu environment plate, cinematic high-end 3D animated film render, no characters, no lettering. A richly detailed ancient Chinese lantern village in the misty autumn mountains. A broad mossy stone footbridge comes from bottom right and bends toward the center. ON THE RIGHT a beautiful warmly lit multistory dark wood pavilion with rust-red hanging lanterns, dark jade ceramic roof, orange maple bough overhead, realistic reflected golden light on canal, towering blue-green karst mountains with thin waterfall and warm sky in distant center top. The left 42% is significantly darker, calm deep evergreen mist with gentle silhouettes representing clear negative space for overlay title and buttons. Right 55% has radiant amber lanterns and soft golden volumetric evening light contrasting dark forest teal shadows. Soft drifting gold leaves. Sophisticated photographic framing, playful storybook visual language, realistic material rendering. No characters, creatures, ornaments shaped like dragons, text, logo, menus, or graphics.”
- **Yun and Ren** — “Landscape rectangular videogame character portrait atlas with exactly two equally wide halves separated cleanly at the exact center, each half an independent tall 3:4 portrait, no lettering or frames. Left half exclusively: Yun, a 24-year-old Chinese woman and mountain-town sound engineer with expressive brown eyes, midnight-blue hair in a low bun, jade-green short Song-inspired jacket layered over cream collared shirt, copper tuning fork pendant, no weapons, thoughtful subtle smile, waist-up facing toward viewer, misty teal covered bridge behind her. Right half exclusively: Ren, a 25-year-old Chinese woman, lantern keeper, freckled warm brown skin, auburn-black hair in two loose side braids, red-ochre scarf with brass lantern pin, slate brown artisan work coat, holding a small amber handheld lantern waist-up facing viewer, navy and autumn pagoda lanterns behind her. Keep heads at same height, no overlap. Luxurious hand-painted cel-shaded modern galgame visual novel portraits, subtle fine brushwork, warm highlights, visible silhouettes. Cozy and wistful cinematic mood. No writing, no watermarks, no UI.”
