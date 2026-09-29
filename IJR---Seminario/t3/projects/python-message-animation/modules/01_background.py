"""Module 01: render only the animated gradient + particles background."""

from pathlib import Path
import sys

import imageio.v2 as imageio
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from message_animation.config import AnimationConfig
from message_animation.scene import _gradient_background, _make_particles
from message_animation.draw import draw_particles
from PIL import Image


config = AnimationConfig(width=640, height=360, fps=20, seconds=3)
particles = _make_particles(config)
frames = []

for i in range(config.frames):
    p = i / max(1, config.frames - 1)
    frame = _gradient_background(config.width, config.height, p)
    layer = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    positions = []
    for x0, y0, radius, speed in particles:
        y = (y0 - p * config.height * 0.28 * speed) % config.height
        positions.append((x0, y, radius))
    draw_particles(layer, positions, alpha=85)
    frames.append(np.asarray(Image.alpha_composite(frame, layer).convert("RGB")))

Path("output").mkdir(exist_ok=True)
imageio.mimsave("output/module_01_background.gif", frames, duration=1 / config.fps, loop=0)
print("Saved output/module_01_background.gif")
