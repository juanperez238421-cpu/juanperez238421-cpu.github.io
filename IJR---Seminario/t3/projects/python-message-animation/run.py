from __future__ import annotations

import argparse

from message_animation import AnimationConfig, render_animation


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render a reusable animated flowers + heart + text message."
    )
    parser.add_argument("--title", default="Para ti")
    parser.add_argument("--subtitle", default="Un mensaje hecho con Python")
    parser.add_argument("--out", default="output/animated_message.mp4")
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--seconds", type=float, default=8.0)
    parser.add_argument("--seed", type=int, default=17)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = AnimationConfig(
        width=args.width,
        height=args.height,
        fps=args.fps,
        seconds=args.seconds,
        title=args.title,
        subtitle=args.subtitle,
        seed=args.seed,
    )
    render_animation(config, args.out)


if __name__ == "__main__":
    main()
