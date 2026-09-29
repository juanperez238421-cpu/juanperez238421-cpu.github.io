from __future__ import annotations

import math
import random

import numpy as np
from PIL import Image

from .config import AnimationConfig
from .draw import draw_centered_text, draw_flower, draw_heart, draw_particles
from .easing import ease_out_back, interval, smoothstep


def _gradient_background(width: int, height: int, progress: float) -> Image.Image:
    top_a = np.array([19, 25, 55], dtype=np.float32)
    top_b = np.array([47, 21, 73], dtype=np.float32)
    bottom_a = np.array([54, 31, 86], dtype=np.float32)
    bottom_b = np.array([92, 34, 89], dtype=np.float32)

    shift = 0.5 - 0.5 * math.cos(progress * math.tau)
    top = top_a * (1 - shift) + top_b * shift
    bottom = bottom_a * (1 - shift) + bottom_b * shift

    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None, None]
    rgb = top[None, None, :] * (1 - y) + bottom[None, None, :] * y
    rgb = np.repeat(rgb, width, axis=1)
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), mode="RGB").convert("RGBA")


def _make_particles(config: AnimationConfig) -> list[tuple[float, float, float, float]]:
    rng = random.Random(config.seed)
    particles = []
    for _ in range(42):
        particles.append(
            (
                rng.uniform(0, config.width),
                rng.uniform(0, config.height),
                rng.uniform(1.0, 3.2),
                rng.uniform(0.6, 1.4),
            )
        )
    return particles


def render_frame(
    config: AnimationConfig,
    frame_index: int,
    particles: list[tuple[float, float, float, float]] | None = None,
) -> Image.Image:
    config.validate()
    particles = particles or _make_particles(config)

    progress = frame_index / max(1, config.frames - 1)
    image = _gradient_background(config.width, config.height, progress)

    particle_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    particle_positions = []
    for x0, y0, radius, speed in particles:
        y = (y0 - progress * config.height * 0.28 * speed) % config.height
        x = x0 + math.sin(progress * math.tau * speed + y0 * 0.01) * 8
        particle_positions.append((x, y, radius))
    draw_particles(particle_layer, particle_positions, alpha=80)
    image = Image.alpha_composite(image, particle_layer)

    floral_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    bloom = smoothstep(interval(progress, 0.06, 0.42))
    flowers = [
        (0.13, 0.87, 0.24, (244, 137, 177, 235)),
        (0.22, 0.91, 0.31, (242, 173, 105, 235)),
        (0.31, 0.88, 0.23, (169, 133, 240, 235)),
        (0.69, 0.89, 0.24, (255, 152, 190, 235)),
        (0.78, 0.92, 0.31, (236, 186, 105, 235)),
        (0.87, 0.87, 0.24, (175, 140, 244, 235)),
    ]
    for idx, (fx, fy, sh, color) in enumerate(flowers):
        local_bloom = smoothstep(interval(bloom, idx * 0.05, 0.55 + idx * 0.05))
        sway = math.sin(progress * math.tau * 1.3 + idx) * 7.0
        draw_flower(
            floral_layer,
            x=config.width * fx,
            base_y=config.height * fy,
            stem_height=config.height * sh,
            bloom=local_bloom,
            sway=sway,
            petal_color=color,
        )
    image = Image.alpha_composite(image, floral_layer)

    heart_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    heart_in = ease_out_back(interval(progress, 0.26, 0.57))
    pulse = 1.0 + 0.035 * math.sin(progress * math.tau * 4.0)
    heart_scale = min(config.width, config.height) * 0.0108 * heart_in * pulse
    draw_heart(
        heart_layer,
        center=(config.width * 0.5, config.height * 0.42),
        scale=heart_scale,
        fill=(244, 78, 117, int(245 * min(1.0, heart_in))),
    )
    image = Image.alpha_composite(image, heart_layer)

    text_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    title_alpha = int(255 * smoothstep(interval(progress, 0.48, 0.70)))
    subtitle_alpha = int(225 * smoothstep(interval(progress, 0.62, 0.82)))
    draw_centered_text(
        text_layer,
        config.title,
        y=config.height * 0.64,
        size=max(28, int(config.height * 0.072)),
        alpha=title_alpha,
        bold=True,
    )
    draw_centered_text(
        text_layer,
        config.subtitle,
        y=config.height * 0.75,
        size=max(18, int(config.height * 0.034)),
        alpha=subtitle_alpha,
        bold=False,
        fill_rgb=(242, 225, 255),
    )
    image = Image.alpha_composite(image, text_layer)

    return image.convert("RGB")
