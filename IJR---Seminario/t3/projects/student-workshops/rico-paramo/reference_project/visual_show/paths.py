from __future__ import annotations

import sys
from pathlib import Path


def runtime_root() -> Path:
    """Return the folder that contains packaged runtime resources."""
    if hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parents[1]


def resource_path(relative: str) -> Path:
    return runtime_root() / relative
