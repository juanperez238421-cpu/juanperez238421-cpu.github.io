from __future__ import annotations

from pathlib import Path

import imageio.v2 as imageio
import numpy as np

from .config import AnimationConfig
from .scene import _make_particles, render_frame


def render_animation(
    config: AnimationConfig,
    output_path: str | Path,
    progress_every: int = 30,
) -> Path:
    config.validate()
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    suffix = output.suffix.lower()
    if suffix not in {".gif", ".mp4"}:
        raise ValueError("Output must end in .gif or .mp4")

    particles = _make_particles(config)

    if suffix == ".gif":
        frames = []
        for index in range(config.frames):
            frame = render_frame(config, index, particles)
            frames.append(np.asarray(frame))
            if progress_every and index % progress_every == 0:
                print(f"[render] frame {index + 1}/{config.frames}")
        imageio.mimsave(
            output,
            frames,
            duration=1.0 / config.fps,
            loop=0,
        )
    else:
        writer = imageio.get_writer(
            output,
            fps=config.fps,
            codec="libx264",
            quality=8,
            macro_block_size=None,
        )
        try:
            for index in range(config.frames):
                frame = render_frame(config, index, particles)
                writer.append_data(np.asarray(frame))
                if progress_every and index % progress_every == 0:
                    print(f"[render] frame {index + 1}/{config.frames}")
        finally:
            writer.close()

    print(f"[render] saved: {output.resolve()}")
    return output
