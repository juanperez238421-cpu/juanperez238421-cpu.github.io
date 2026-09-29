"""Module 03: compose reusable flowers from stems, leaves, petals and timing."""

from pathlib import Path
import math
import sys

import imageio.v2 as imageio
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from message_animation.config import AnimationConfig
from message_animation.draw import draw_flower
from message_animation.easing import smoothstep
from message_animation.scene import _gradient_background


config = AnimationConfig(width=640, height=360, fps=24, seconds=3)
frames = []
flowers = [
    (0.25, (244, 137, 177, 240)),
    (0.50, (242, 173, 105, 240)),
    (0.75, (169, 133, 240, 240)),
]

for i in range(config.frames):
    p = i / max(1, config.frames - 1)
    frame = _gradient_background(config.width, config.height, p)
    layer = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    for idx, (fx, color) in enumerate(flowers):
        local = smoothstep(max(0.0, min(1.0, (p - idx * 0.12) / 0.55)))
        draw_flower(
            layer,
            x=config.width * fx,
            base_y=config.height * 0.88,
            stem_height=config.height * 0.40,
            bloom=local,
            sway=math.sin(p * math.tau * 1.2 + idx) * 7,
            petal_color=color,
        )
    frames.append(np.asarray(Image.alpha_composite(frame, layer).convert("RGB")))

Path("output").mkdir(exist_ok=True)
imageio.mimsave("output/module_03_flowers.gif", frames, duration=1 / config.fps, loop=0)
print("Saved output/module_03_flowers.gif")
