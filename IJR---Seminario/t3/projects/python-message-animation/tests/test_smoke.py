from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from message_animation.config import AnimationConfig
from message_animation.scene import render_frame


def test_render_frame_has_expected_size():
    config = AnimationConfig(width=320, height=180, fps=4, seconds=1.0)
    frame = render_frame(config, 0)
    assert frame.size == (320, 180)
    assert frame.mode == "RGB"


def test_frame_count():
    config = AnimationConfig(fps=12, seconds=2.5)
    assert config.frames == 30
