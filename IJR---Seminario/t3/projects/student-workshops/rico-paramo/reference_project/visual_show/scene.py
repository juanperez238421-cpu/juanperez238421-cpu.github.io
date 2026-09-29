from __future__ import annotations

import pygame

from .config import VisualConfig
from .effects import OrbitEffect, ParticleField, PulseEffect


class VisualScene:
    def __init__(self, config: VisualConfig):
        self.config = config
        center = (config.width // 2, config.height // 2)
        self.effects = [
            ParticleField(config.width, config.height, config.particle_count, config.seed),
            PulseEffect(center, speed=config.pulse_speed),
            OrbitEffect(center, radius=config.orbit_radius, speed=config.orbit_speed),
        ]

    def update(self, dt: float) -> None:
        for effect in self.effects:
            effect.update(dt)

    def draw(self, surface: pygame.Surface) -> None:
        surface.fill(self.config.background)
        for effect in self.effects:
            effect.draw(surface)
