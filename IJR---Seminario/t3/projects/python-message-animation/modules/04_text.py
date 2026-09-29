"""Module 04: animate title and subtitle with alpha fades."""

from pathlib import Path
import sys

import imageio.v2 as imageio
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from message_animation.config import AnimationConfig
from message_animation.draw import draw_centered_text
from message_animation.easing import smoothstep
from message_animation.scene import _gradient_background


config = AnimationConfig(width=640, height=360, fps=24, seconds=3)
frames = []

for i in range(config.frames):
    p = i / max(1, config.frames - 1)
    frame = _gradient_background(config.width, config.height, p)
    layer = Image.new("RGBA", frame.size, (0, 0, 0, 0))

    title_alpha = int(255 * smoothstep(min(1.0, p / 0.45)))
    subtitle_alpha = int(220 * smoothstep(max(0.0, min(1.0, (p - 0.25) / 0.45))))

    draw_centered_text(layer, "Para ti", y=130, size=42, alpha=title_alpha, bold=True)
    draw_centered_text(
        layer,
        "Un mensaje hecho con Python",
        y=205,
        size=22,
        alpha=subtitle_alpha,
        fill_rgb=(242, 225, 255),
    )
    frames.append(np.asarray(Image.alpha_composite(frame, layer).convert("RGB")))

Path("output").mkdir(exist_ok=True)
imageio.mimsave("output/module_04_text.gif", frames, duration=1 / config.fps, loop=0)
print("Saved output/module_04_text.gif")
