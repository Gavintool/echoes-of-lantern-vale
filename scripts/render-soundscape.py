"""Render the original stereo score, ambience and sound effects."""
import argparse
from pathlib import Path
import subprocess
import tempfile

import numpy as np
from scipy.io.wavfile import write
from scipy.signal import butter, fftconvolve, sosfilt

RATE = 32000
ROOT = Path(__file__).resolve().parents[1] / "public" / "audio"
RNG = np.random.default_rng(26919)


def time(seconds):
    return np.arange(round(seconds * RATE)) / RATE


def pitch(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def paint(track, sample, start, pan=0, gain=1):
    left = int(start * RATE)
    size = min(len(sample), len(track) - left)
    if size <= 0:
        return
    angle = (pan + 1) * np.pi / 4
    track[left:left + size] += sample[:size, None] * np.array([np.cos(angle), np.sin(angle)]) * gain


def noise(t, low, high):
    return sosfilt(butter(2, [low, high], fs=RATE, btype="bandpass", output="sos"), RNG.normal(size=len(t)))


def plume(freq, seconds):
    t = time(seconds)
    frequency = freq * (1 + 0.008 * (1 - np.exp(-3.2 * t)) * np.sin(t * 32) - 0.013 * np.exp(-22 * t))
    phase = np.cumsum(frequency) * 2 * np.pi / RATE
    breath = noise(t, 1100, 3400) * 0.075
    reed = np.sin(phase) + 0.21 * np.sin(2 * phase) + 0.1 * np.sin(3 * phase) + 0.029 * np.sin(5 * phase)
    envelope = np.minimum(1, t / 0.24) ** 1.4 * np.minimum(1, (seconds - t) / 0.43) ** 1.6
    return (reed + breath) * envelope * (0.86 + 0.14 * np.sin(12.4 * t) ** 2)


def silk(freq, seconds):
    t = time(seconds)
    sample = noise(t, 1800, 5800) * np.exp(-88 * t) * 0.3
    for partial in range(1, 14):
        phase = (freq * partial * t + 0.004 * np.sin(36 * t) * partial) * 2 * np.pi
        sample += np.sin(phase) * np.sin(partial * 0.41) / partial ** 0.77 * np.exp(-t * (1.53 + partial * 0.37))
    tap = np.minimum(1, t * 260) * np.minimum(1, (seconds - t) * 8)
    return sample * tap


def bell(freq, seconds):
    t = time(seconds)
    sample = np.zeros_like(t)
    for ratio, weight, decay in [(1, 0.47, 2.1), (2.008, 0.28, 1.9), (2.76, 0.23, 3.1), (4.11, 0.16, 5.2), (5.7, 0.07, 10.4)]:
        sample += weight * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-decay * t)
    return sample * np.minimum(1, t * 190)


def space(track, amount):
    t = time(1.4)
    for channel in range(2):
        impulse = noise(t, 190, 6800) * np.exp(-5.2 * t)
        impulse[:900] = 0
        impulse *= amount / np.linalg.norm(impulse)
        track[:, channel] += fftconvolve(track[:, 1 - channel].copy(), impulse)[:len(track)]


def taper(track, seconds=0.3):
    size = round(seconds * RATE)
    ramp = np.linspace(0, 1, size)
    if track.ndim == 2:
        ramp = ramp[:, None]
    track[:size] *= ramp
    track[-size:] *= ramp[::-1]
    return track


def score(scene):
    length = 69.0
    track = np.zeros((int(length * RATE), 2))
    roots = [50, 45, 48, 43, 50, 45, 48, 50] if scene != "dawn" else [50, 43, 45, 48, 50, 43, 45, 50]
    motifs = [
        [(0, 69, 1.1), (1.45, 72, 2.2), (4.35, 74, 1.85)],
        [(0.55, 76, 1.25), (2.25, 74, 1.05), (3.6, 72, 2.55)],
        [(0.3, 67, 1.65), (2.1, 69, 0.6), (3.0, 72, 2.6)],
        [(1, 74, 2.05), (3.75, 69, 2.35)],
    ]
    for i, root in enumerate(roots):
        start = 1.2 + i * 8.2
        for offset, note, gain in [(0, root, .10), (1.1, root + 12, .061), (3.75, root + 7, .073), (6.3, root + 19, .047)]:
            paint(track, silk(pitch(note), 3.3), start + offset, -0.45, gain * (0.93 + RNG.random() * 0.15))
        for j, (offset, note, duration) in enumerate(motifs[i % len(motifs)]):
            if scene == "night" and (i + j) % 3 == 0:
                continue
            note = note + (2 if scene == "dawn" else 0)
            paint(track, plume(pitch(note), duration), start + 0.1 + offset, 0.28, .049 if scene == "night" else .075)
        drone_time = time(7.8)
        drone = np.sin(2 * np.pi * pitch(root - 12) * drone_time)
        drone += 0.34 * np.sin(2 * np.pi * pitch(root - 5) * drone_time)
        drone *= np.sin(np.pi * drone_time / 7.8) ** 1.35
        paint(track, drone, start, 0, 0.037)
        if i in [0, 3, 6]:
            paint(track, bell(pitch(root + 22), 2.6), start + 0.64, 0.52, 0.051)
    space(track, 0.27)
    return taper(track, 0.82)


def ambience(kind):
    t = time(29)
    track = np.zeros((len(t), 2))
    for channel in range(2):
        flow = noise(t, 95, 1070) * (0.17 + 0.025 * np.sin(t * (0.69 + channel * 0.11)))
        patter = noise(t, 800, 4600) * (0.022 + 0.01 * np.sin(t * 1.8 + channel))
        wind = noise(t, 45, 330) * (0.21 + 0.13 * np.sin(channel + t * .43) ** 2)
        track[:, channel] = flow + patter if kind == "river" else wind + noise(t, 850, 3500) * 0.009
    if kind == "dawn":
        for start, pan in [(1.6, -0.5), (8.4, 0.6), (17.5, -0.28), (23.1, 0.35)]:
            for index in range(3):
                t_bird = time(.19 - .025 * index)
                phase = 2 * np.pi * (1430 * t_bird + 890 * (1 - np.exp(-26 * t_bird)) / 26 + index * 190 * t_bird)
                phrase = (np.sin(phase) + 0.18 * np.sin(phase * 1.48)) * np.maximum(0, np.sin(np.pi * t_bird / t_bird[-1])) ** 1.4
                paint(track, phrase, start + index * .225, pan, .075)
    return taper(track, 0.23)


def effect(name):
    track = np.zeros((len(time(3.15)), 2))
    if name.startswith("step"):
        number = int(name[-1])
        t = time(.28)
        impact = noise(t, 68, 240) * np.exp(-t * 21) * 0.37
        brush = noise(t, 680, 4150) * np.exp(-t * 24) * 0.12
        toe = noise(t, 210, 890) * np.exp(-t * 49) * 0.16
        paint(track, impact + brush, 0.002, (-1) ** number * 0.21)
        paint(track, toe, .061 + number * .006, (-1) ** number * 0.16)
        space(track, .08)
        return track[:len(time(.61))]
    if name == "cylinder":
        t = time(2.9)
        crackle = noise(t, 350, 3100) * (.072 + .022 * np.sin(t * 17))
        paint(track, crackle * np.minimum(1, t * 6) * np.minimum(1, (2.9 - t) * 2.1), 0)
        paint(track, silk(134, .43), .12, -.23, .26)
        paint(track, silk(140, .41), .34, -.18, .17)
    else:
        phrases = {
            "chime": [(0, 660, 0.16), (.16, 880, .14)],
            "windbell": [(0, 705, .16), (.19, 960, .13), (.49, 1225, .076)],
            "tuned": [(0, 147, .29), (.64, 293.7, .13), (1.45, 587.3, .18)],
            "mistune": [(0, 196, .2), (.3, 152, .13)],
            "chorus": [(0, 147, .27), (.32, 293.66, .15), (.72, 440, .17), (1.23, 587.33, .14)],
            "archive": [(0, 220, .18), (.44, 440, .16), (1.3, 523.25, .12)],
            "quiet": [(0, 130.81, .17), (.8, 196, .10)],
            "dawn": [(0, 146.83, .18), (.22, 349.23, .14), (.56, 440, .15)],
        }
        for index, (start, frequency, gain) in enumerate(phrases[name]):
            paint(track, bell(frequency, 2.65), start, (-1) ** index * 0.32, gain)
        space(track, .18)
    return taper(track, .045)


def export(ffmpeg, path, track, bitrate, target_peak):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not np.isfinite(track).all():
        raise ValueError(f"Invalid audio samples in {path.name}")
    maximum = np.max(np.abs(track))
    audio = np.asarray(track * (target_peak / max(.001, maximum)) * 32767, dtype=np.int16)
    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / "source.wav"
        write(source, RATE, audio)
        subprocess.run([
            ffmpeg, "-nostdin", "-v", "error", "-y", "-i", str(source),
            "-c:a", "libmp3lame", "-b:a", bitrate, str(path),
        ], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    args = parser.parse_args()
    for name in ["menu", "night", "dawn"]:
        export(args.ffmpeg, ROOT / "music" / f"{name}.mp3", score(name), "96k", .67)
    for name in ["river", "wind", "dawn"]:
        export(args.ffmpeg, ROOT / "ambience" / f"{name}.mp3", ambience(name), "80k", .51)
    for name in ["step1", "step2", "step3", "step4", "chime", "windbell", "tuned", "mistune", "chorus", "archive", "quiet", "dawn", "cylinder"]:
        export(args.ffmpeg, ROOT / "effects" / f"{name}.mp3", effect(name), "80k", .53)
    print("Rendered 19 original soundscape assets.")


if __name__ == "__main__":
    main()
