"""Render the Mandarin clips used by the static game from the checked-in script."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from functools import partial
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
VOICES = {
    "bao": (58, 1.03),
    "yun": (5, 0.98),
    "ren": (21, 1.03),
    "echo": (34, 0.91),
    "courier": (72, 0.98),
    "narration": (85, 0.94),
}


def render(item, args, output):
    destination = output / (item["key"] + ".mp3")
    if destination.exists() and not args.force:
        return
    speaker, speed = VOICES[item["speaker"]]
    directory = args.model
    with tempfile.TemporaryDirectory() as temporary:
        wave = Path(temporary) / "voice.wav"
        encoded = Path(temporary) / "voice.mp3"
        cmd = [
            args.tts, f"--kokoro-model={directory / 'model.onnx'}",
            f"--kokoro-voices={directory / 'voices.bin'}",
            f"--kokoro-tokens={directory / 'tokens.txt'}",
            f"--kokoro-lexicon={directory / 'lexicon-zh.txt'}",
            f"--tts-rule-fsts={directory / 'number-zh.fst'},{directory / 'date-zh.fst'}",
            "--num-threads=2", "--tts-silence-scale=0.62", f"--sid={speaker}",
            f"--speed={speed}", f"--output-filename={wave}", item["text"],
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        filters = "highpass=f=62,lowpass=f=10300"
        if item["speaker"] == "echo":
            filters = "highpass=f=200,lowpass=f=4200"
        filters += ",loudnorm=I=-19:TP=-2:LRA=7,afade=t=in:d=0.025"
        subprocess.run([
            args.ffmpeg, "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(wave), "-af", filters, "-ar", "24000", "-ac", "1",
            "-c:a", "libmp3lame", "-b:a", "64k", str(encoded),
        ], check=True)
        destination.write_bytes(encoded.read_bytes())
    print(item["key"], flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tts", required=True, help="Path to sherpa-onnx-offline-tts")
    parser.add_argument("--model", required=True, type=Path, help="Extracted Kokoro v1.1 model folder")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--jobs", type=int, default=2)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    script = ROOT / "scripts" / "list-voice-lines.mjs"
    entries = json.loads(subprocess.check_output(["node", str(script)]))
    output = ROOT / "public" / "audio" / "voice"
    output.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=args.jobs) as executor:
        for _ in executor.map(partial(render, args=args, output=output), entries):
            pass
    print(f"Rendered or checked {len(entries)} line clips.")


if __name__ == "__main__":
    main()
