from __future__ import annotations

import pygame

from .config import VisualConfig
from .scene import VisualScene


class VisualApp:
    def __init__(self, config: VisualConfig):
        pygame.init()
        self.config = config
        self.screen = pygame.display.set_mode((config.width, config.height))
        self.clock = pygame.time.Clock()
        self.scene = VisualScene(config)
        self.running = True
        self.show_fps = True

    def handle_events(self) -> None:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    self.running = False
                elif event.key == pygame.K_f:
                    self.show_fps = not self.show_fps

    def run(self) -> None:
        while self.running:
            dt = self.clock.tick(self.config.fps) / 1000.0
            self.handle_events()
            self.scene.update(dt)
            self.scene.draw(self.screen)

            if self.show_fps:
                pygame.display.set_caption(
                    f"Portable Python Visual Show | FPS: {self.clock.get_fps():5.1f}"
                )
            else:
                pygame.display.set_caption("Portable Python Visual Show")

            pygame.display.flip()

        pygame.quit()
