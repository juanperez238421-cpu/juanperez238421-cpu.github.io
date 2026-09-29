# Python Animated Message — Seminario 11

Proyecto de **creative coding con Python** para construir una animación completamente programada: fondo dinámico, partículas, flores, corazón paramétrico, texto animado y exportación final a MP4/GIF.

## Resultado esperado

El estudiante entrega una animación original de 6–12 s, 1280×720 o superior, construida por código y organizada por módulos. El ejemplo base produce:

- fondo degradado animado;
- partículas ambientales;
- seis flores con crecimiento/bloom;
- corazón paramétrico con aparición y pulso;
- título y subtítulo con transición alpha;
- render H.264 MP4;
- versión GIF para módulos cortos;
- paquete final para USB.

## Arquitectura

```text
run.py
   |
   +--> AnimationConfig
   +--> renderer.py
           |
           +--> scene.py
                   |
                   +--> background
                   +--> flowers
                   +--> heart
                   +--> text
                   +--> particles
```

The final video is not a screen recording. Python computes every frame and the renderer encodes those frames into a video.

## Terminal — local workflow

From this folder:

```bash
python -m venv .venv
```

Windows:

```bat
.venv\Scripts\activate
pip install -r requirements.txt
```

macOS/Linux:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

Run each learning module:

```bash
python modules/01_background.py
python modules/02_heart.py
python modules/03_flowers.py
python modules/04_text.py
```

Render the final animation:

```bash
python run.py ^
  --title "Para ti" ^
  --subtitle "Un mensaje hecho con Python" ^
  --out output/animated_message.mp4 ^
  --width 1280 ^
  --height 720 ^
  --fps 30 ^
  --seconds 8
```

On macOS/Linux replace `^` with `\` or write the command on one line.

## Colab

Open:

`colab/Python_Animated_Message.ipynb`

The notebook installs dependencies, clones the repository, executes each module and renders the final MP4. Colab is useful when the student's computer does not have Python configured or when a reproducible notebook is required.

## Modules

### 01 — Background

Concepts:
- frame index;
- normalized time `0 → 1`;
- RGB gradient;
- RGBA composition;
- deterministic particles.

Output: `output/module_01_background.gif`.

### 02 — Parametric heart

The heart is generated mathematically from a parametric curve:

```text
x(t) = 16 sin³(t)
y(t) = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)
```

Students modify scale, timing and pulse frequency.

Output: `output/module_02_heart.gif`.

### 03 — Flowers

Each flower is composed from:
- stem;
- two leaves;
- petals;
- center;
- bloom progress;
- sway motion.

Output: `output/module_03_flowers.gif`.

### 04 — Text

Students work with:
- typography;
- alpha;
- fade timing;
- title/subtitle hierarchy;
- text layering.

Output: `output/module_04_text.gif`.

### 05 — Final composition

`run.py` combines every module through `message_animation/scene.py` and encodes the result using `imageio-ffmpeg`.

## USB idea

A USB should contain the **finished media plus technical evidence**, not rely on unsafe autorun behavior.

Recommended contents:

```text
USB_PACKAGE/
  animated_message.mp4
  AnimatedMessage.exe
  README_USB.txt
```

On Windows run:

```bat
usb\build_windows_usb.bat
```

The script:
1. creates a virtual environment;
2. installs requirements;
3. renders the MP4;
4. builds a standalone executable with PyInstaller;
5. creates `USB_PACKAGE`.

Modern Windows generally blocks USB autorun for executables, so the expected presentation is **double-click**.

## Student customization requirements

The final submission must change at least four aspects of the base example:

1. title/subtitle;
2. color palette;
3. flower arrangement or type;
4. timing/easing;
5. heart behavior or another parametric figure;
6. one additional animated element.

A submission that only changes the text is incomplete.

## Evidence

- GitHub repository / commits;
- four module outputs;
- final MP4;
- source code;
- Colab notebook or local terminal log;
- short architecture diagram;
- explanation of one mathematical animation concept;
- USB package or equivalent final delivery folder.

## QA

Smoke test:

```bash
python -m pytest tests
```

Quick render:

```bash
python run.py --out output/smoke.gif --width 320 --height 180 --fps 6 --seconds 1
```
