from __future__ import annotations

import math
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont

from .easing import clamp01


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = []
    if bold:
        candidates.extend([
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "C:/Windows/Fonts/arialbd.ttf",
        ])
    else:
        candidates.extend([
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "C:/Windows/Fonts/arial.ttf",
        ])

    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


def heart_points(cx: float, cy: float, scale: float, samples: int = 220) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for i in range(samples):
        t = (i / samples) * math.tau
        x = 16 * math.sin(t) ** 3
        y = (
            13 * math.cos(t)
            - 5 * math.cos(2 * t)
            - 2 * math.cos(3 * t)
            - math.cos(4 * t)
        )
        points.append((cx + scale * x, cy - scale * y))
    return points


def draw_heart(
    layer: Image.Image,
    center: tuple[float, float],
    scale: float,
    fill: tuple[int, int, int, int],
    glow: bool = True,
) -> None:
    if scale <= 0:
        return
    draw = ImageDraw.Draw(layer, "RGBA")
    cx, cy = center
    if glow:
        for factor, alpha in ((1.18, 20), (1.10, 34), (1.05, 50)):
            glow_fill = (fill[0], fill[1], fill[2], alpha)
            draw.polygon(heart_points(cx, cy, scale * factor), fill=glow_fill)
    draw.polygon(heart_points(cx, cy, scale), fill=fill)


def draw_flower(
    layer: Image.Image,
    x: float,
    base_y: float,
    stem_height: float,
    bloom: float,
    sway: float,
    petal_color: tuple[int, int, int, int],
    center_color: tuple[int, int, int, int] = (255, 208, 74, 255),
) -> None:
    bloom = clamp01(bloom)
    if bloom <= 0:
        return

    draw = ImageDraw.Draw(layer, "RGBA")
    top_y = base_y - stem_height
    stem_x = x + sway
    stem_color = (76, 151, 91, int(230 * bloom))
    draw.line(
        [(x, base_y), (x + sway * 0.35, base_y - stem_height * 0.55), (stem_x, top_y)],
        fill=stem_color,
        width=max(2, int(5 * bloom)),
        joint="curve",
    )

    leaf_alpha = int(200 * bloom)
    leaf_fill = (75, 159, 89, leaf_alpha)
    leaf_w = 18 * bloom
    leaf_h = 9 * bloom
    mid_y = base_y - stem_height * 0.48
    draw.ellipse(
        [x - leaf_w - 2, mid_y - leaf_h, x + 2, mid_y + leaf_h],
        fill=leaf_fill,
    )
    draw.ellipse(
        [x - 1, mid_y + 8 - leaf_h, x + leaf_w + 3, mid_y + 8 + leaf_h],
        fill=leaf_fill,
    )

    radius = 28 * bloom
    petal_rx = 14 * bloom
    petal_ry = 24 * bloom
    for i in range(8):
        angle = i * math.tau / 8.0
        px = stem_x + math.cos(angle) * radius * 0.62
        py = top_y + math.sin(angle) * radius * 0.62
        box = [px - petal_rx, py - petal_ry, px + petal_rx, py + petal_ry]
        draw.ellipse(box, fill=petal_color)

    center_r = 12 * bloom
    draw.ellipse(
        [stem_x - center_r, top_y - center_r, stem_x + center_r, top_y + center_r],
        fill=center_color,
    )


def draw_centered_text(
    layer: Image.Image,
    text: str,
    y: float,
    size: int,
    alpha: int,
    bold: bool = False,
    fill_rgb: tuple[int, int, int] = (255, 255, 255),
) -> None:
    alpha = max(0, min(255, int(alpha)))
    if alpha <= 0 or not text:
        return

    draw = ImageDraw.Draw(layer, "RGBA")
    font = load_font(size, bold=bold)
    bbox = draw.textbbox((0, 0), text, font=font)
    width = bbox[2] - bbox[0]
    x = (layer.width - width) / 2
    shadow = (0, 0, 0, int(alpha * 0.35))
    draw.text((x + 2, y + 3), text, font=font, fill=shadow)
    draw.text((x, y), text, font=font, fill=(*fill_rgb, alpha))


def draw_particles(
    layer: Image.Image,
    particles: Iterable[tuple[float, float, float]],
    alpha: int,
) -> None:
    draw = ImageDraw.Draw(layer, "RGBA")
    a = max(0, min(255, int(alpha)))
    for x, y, radius in particles:
        draw.ellipse(
            [x - radius, y - radius, x + radius, y + radius],
            fill=(255, 240, 230, a),
        )
