# 素材与声音来源

| 素材 | 来源 |
| --- | --- |
| `src/assets/milk-dragon.webp` | 主角沿用 **zeshentian1** 发布的[透明素材](https://www.meshy.ai/posts/%E5%A5%B6%E8%9B%99-01a19f9e-bf1b-77ff-b000-5f8fbf9835a7)。发布者将该素材标为 CC0。项目将其裁剪并转换为 WebP。 |
| `src/assets/qingyin.webp`、`dengsui.webp`、`shuangling.webp`、`courier.webp` | 用内置 ImageGen 直接编辑玩家提供的奶龙参考照片。保留黄皮肤、小绿眼、窄嘴、浅色圆肚、原来的手脚和姿势，为每位奶龙更换服装。 |
| `src/assets/vale.webp` | 内置 ImageGen 生成的灯谷场景。构图为山间水乡、石桥、枫树和暖色灯笼。 |
| 三维村落与道具 | 几何体、纹理、招牌和着色器均由 `src/scenery.js` 创建。奶龙们在场景内用透明立绘呈现。主角支持通过 `src/assets/milk-dragon.glb` 可选替换为有权发布的模型。 |
| `public/audio/voice/*.mp3` | 六种预置普通话音色通过 [Kokoro v1.1 中文模型](https://huggingface.co/hexgrad/Kokoro-82M-v1.1-zh)（Apache-2.0）本地合成。旁白、对白和每条支线都有媒体文件。完整模型和训练数据未打包进游戏。 |
| `public/audio/music/`、`public/audio/ambience/` | 原创立体声合成素材。配乐分标题、夜间和黎明三个版本，使用拨弦、吹管、尾响和钟声。 |
| `public/audio/effects/` | 大部分效果为项目原创合成。三段剧情笑声取自 Eneasz 的 [Male Laughter.wav](https://freesound.org/people/Eneasz/sounds/119459/)，CC0，做了剪辑、调音高和空间处理。 |
| `src/fonts/` | 基于 [Noto Sans SC](https://github.com/google/fonts/tree/main/ofl/notosanssc) 和 [Noto Serif CJK SC](https://github.com/notofonts/noto-cjk/tree/main/Serif) 制作的自托管子集。原字体采用 SIL Open Font License。许可文本和版权声明在该目录中。 |
| 图标与渲染 | [Lucide](https://lucide.dev/license)（ISC）和 [Three.js](https://github.com/mrdoob/three.js/blob/dev/LICENSE)（MIT）。 |

奶龙原作由[第七印象](https://www.nailoong.com/ipStar/NaiLong/)创作。第三方素材的许可适用于该素材。本作是玩家同人创作。

## 立绘指令

给内置 ImageGen 的共同指令为保持参考人物的原模型观感、黄色皮肤、高而平滑的头形、窄嘴、小绿眼、奶白椭圆肚子、暗色手指和扶肚子的姿势。补全照片裁掉的脚，输出单个全身透明素材。服装分别为：

- **青音奶龙**：敞开的青色工装、铜扣、小音叉、额头的圆护目镜。
- **灯穗奶龙**：朱红织物围巾、皮腰带、挂在身侧的琥珀纸灯。
- **霜铃奶龙**：淡紫织物披肩、细框眼镜、渡船铜钥匙。
- **信使奶龙**：靛蓝雨披、帆布邮袋、向后倾斜的旧斗笠。

## 重新制作音频

使用 [Sherpa-ONNX 的 Kokoro 中文模型包](https://k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/kokoro.html) 和支持 MP3 的 FFmpeg。配音脚本保留六套角色音色分配。给蜡筒中的霜铃奶龙额外使用带通滤波，以区别现场对白与录音。

```sh
python3 scripts/render-voices.py --tts /path/to/sherpa-onnx-offline-tts --model /path/to/kokoro-multi-lang-v1_1
python3 scripts/render-soundscape.py
```

第二条命令需要 NumPy 和 SciPy。玩家运行游戏只需要浏览器。
