from visual_show.app import VisualApp
from visual_show.config import load_config
from visual_show.paths import resource_path


def main() -> None:
    config = load_config(resource_path("config.json"))
    app = VisualApp(config)
    app.run()


if __name__ == "__main__":
    main()
