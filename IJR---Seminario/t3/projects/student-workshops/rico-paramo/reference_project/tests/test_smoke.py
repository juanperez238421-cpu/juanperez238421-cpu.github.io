import os
from pathlib import Path
import sys

os.environ.setdefault("SDL_VIDEODRIVER", "dummy")

import pygame

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from visual_show.config import VisualConfig, load_config
from visual_show.scene import VisualScene


def test_default_config():
    cfg = VisualConfig()
    assert cfg.width == 960
    assert cfg.height == 540
    assert cfg.fps == 60


def test_config_file_loads():
    cfg = load_config(ROOT / "config.json")
    assert cfg.width >= 320
    assert cfg.height >= 180
    assert cfg.particle_count >= 0


def test_scene_updates_and_draws_headless():
    pygame.init()
    cfg = VisualConfig(width=320, height=180, particle_count=12)
    surface = pygame.Surface((cfg.width, cfg.height))
    scene = VisualScene(cfg)

    for _ in range(4):
        scene.update(1 / 60)
        scene.draw(surface)

    assert surface.get_size() == (320, 180)
    pygame.quit()
