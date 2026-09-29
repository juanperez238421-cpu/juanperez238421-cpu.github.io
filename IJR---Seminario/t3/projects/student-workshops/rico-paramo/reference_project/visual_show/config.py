from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass
class VisualConfig:
    width: int = 960
    height: int = 540
    fps: int = 60
    background: tuple[int, int, int] = (18, 22, 38)
    orbit_speed: float = 1.4
    orbit_radius: float = 150.0
    pulse_speed: float = 3.2
    particle_count: int = 120
    seed: int = 17


def _rgb(value, default=(18, 22, 38)):
    if not isinstance(value, list) or len(value) != 3:
        return default
    try:
        return tuple(max(0, min(255, int(x))) for x in value)
    except (TypeError, ValueError):
        return default


def load_config(path: Path) -> VisualConfig:
    if not path.exists():
        return VisualConfig()

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return VisualConfig()

    return VisualConfig(
        width=max(320, int(raw.get("width", 960))),
        height=max(180, int(raw.get("height", 540))),
        fps=max(15, min(240, int(raw.get("fps", 60)))),
        background=_rgb(raw.get("background")),
        orbit_speed=float(raw.get("orbit_speed", 1.4)),
        orbit_radius=max(20.0, float(raw.get("orbit_radius", 150))),
        pulse_speed=float(raw.get("pulse_speed", 3.2)),
        particle_count=max(0, min(2000, int(raw.get("particle_count", 120)))),
        seed=int(raw.get("seed", 17)),
    )
