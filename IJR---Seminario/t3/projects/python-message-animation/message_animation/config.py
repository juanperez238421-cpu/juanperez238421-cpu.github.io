from dataclasses import dataclass


@dataclass(frozen=True)
class AnimationConfig:
    width: int = 1280
    height: int = 720
    fps: int = 30
    seconds: float = 8.0
    title: str = "Para ti"
    subtitle: str = "Un mensaje hecho con Python"
    seed: int = 17

    @property
    def frames(self) -> int:
        return max(1, int(round(self.fps * self.seconds)))

    def validate(self) -> None:
        if self.width < 160 or self.height < 90:
            raise ValueError("Canvas too small.")
        if not 1 <= self.fps <= 120:
            raise ValueError("fps must be between 1 and 120.")
        if not 0.5 <= self.seconds <= 60:
            raise ValueError("seconds must be between 0.5 and 60.")
