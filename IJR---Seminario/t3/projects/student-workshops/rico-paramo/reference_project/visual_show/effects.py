from __future__ import annotations

import math
import random

import pygame


class OrbitEffect:
    def __init__(
        self,
        center: tuple[int, int],
        radius: float,
        speed: float,
        color=(236, 90, 144),
    ):
        self.center = pygame.Vector2(center)
        self.radius = radius
        self.speed = speed
        self.color = color
        self.t = 0.0

    def update(self, dt: float) -> None:
        self.t += dt

    def draw(self, surface: pygame.Surface) -> None:
        x = self.center.x + self.radius * math.cos(self.speed * self.t)
        y = self.center.y + self.radius * math.sin(self.speed * self.t)
        pygame.draw.circle(surface, self.color, (int(x), int(y)), 22)


class PulseEffect:
    def __init__(
        self,
        center: tuple[int, int],
        speed: float,
        base_radius: float = 52,
        amplitude: float = 14,
        color=(116, 93, 220),
    ):
        self.center = center
        self.speed = speed
        self.base_radius = base_radius
        self.amplitude = amplitude
        self.color = color
        self.t = 0.0

    def update(self, dt: float) -> None:
        self.t += dt

    def draw(self, surface: pygame.Surface) -> None:
        radius = self.base_radius + self.amplitude * (0.5 + 0.5 * math.sin(self.speed * self.t))
        pygame.draw.circle(surface, self.color, self.center, int(radius), width=4)


class ParticleField:
    def __init__(self, width: int, height: int, count: int, seed: int):
        self.width = width
        self.height = height
        self.rng = random.Random(seed)
        self.particles = []
        for _ in range(count):
            self.particles.append(
                {
                    "x": self.rng.uniform(0, width),
                    "y": self.rng.uniform(0, height),
                    "speed": self.rng.uniform(18, 54),
                    "radius": self.rng.uniform(1.0, 3.0),
                    "phase": self.rng.uniform(0, math.tau),
                }
            )
        self.t = 0.0

    def update(self, dt: float) -> None:
        self.t += dt
        for p in self.particles:
            p["y"] -= p["speed"] * dt
            if p["y"] < -5:
                p["y"] = self.height + 5
                p["x"] = self.rng.uniform(0, self.width)

    def draw(self, surface: pygame.Surface) -> None:
        for p in self.particles:
            drift = math.sin(self.t * 1.4 + p["phase"]) * 8
            pygame.draw.circle(
                surface,
                (220, 225, 255),
                (int(p["x"] + drift), int(p["y"])),
                max(1, int(p["radius"])),
            )
