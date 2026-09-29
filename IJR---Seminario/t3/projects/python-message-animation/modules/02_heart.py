"""Module 02: learn parametric geometry by animating a beating heart."""

from pathlib import Path
import math
import sys

import imageio.v2 as imageio
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from message_animation.config import AnimationConfig
from message_animation.draw import draw_heart
from message_animation.easing import ease_out_back
from message_animation.scene import _gradient_background


config = AnimationConfig(width=640, height=360, fps=24, seconds=3)
frames = []

for i in range(config.frames):
    p = i / max(1, config.frames - 1)
    frame = _gradient_background(config.width, config.height, p)
    layer = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    enter = ease_out_back(min(1.0, p / 0.45))
    pulse = 1.0 + 0.05 * math.sin(p * math.tau * 4)
    draw_heart(
        layer,
        center=(config.width / 2, config.height / 2),
        scale=4.9 * enter * pulse,
        fill=(244, 78, 117, 245),
    )
    frames.append(np.asarray(Image.alpha_composite(frame, layer).convert("RGB")))

Path("output").mkdir(exist_ok=True)
imageio.mimsave("output/module_02_heart.gif", frames, duration=1 / config.fps, loop=0)
print("Saved output/module_02_heart.gif")
