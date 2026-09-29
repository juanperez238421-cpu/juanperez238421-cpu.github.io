window.IJR_RICO_PROJECT_DATA = {
  project: {
    student: "RICO PARAMO ALEJANDRO",
    group: "11B",
    title: "Portable Python Visual Show — USB Launcher & Procedural Animation",
    workflow: "theory → workshop → run → test → evidence → gate"
  },
  classes: [
    {
      n: 1,
      slug: "foundation-architecture",
      title: "Project contract + animation architecture",
      lead: "Convert a visual idea into an executable engineering baseline with measurable acceptance criteria and clear runtime responsibilities.",
      theoryHref: "theory.html?class=1",
      workshopHref: "workshop.html?class=1",
      concepts: [
        "Animation is state evaluated over time. A frame is only one sample; the real system is the event/update/draw loop.",
        "Acceptance criteria turn aesthetic intentions into testable claims: startup time, resolution, target FPS, offline behavior and live parameter changes.",
        "The reference implementation uses Pygame because the final product must render in real time, accept runtime events and launch as a portable application.",
        "App, Scene, Effect, Config and Launcher have different responsibilities. Keeping them separate prevents the final project from becoming one monolithic script."
      ],
      uml: {
        name: "VisualApp",
        attrs: ["- screen: Surface", "- clock: Clock", "- scene: VisualScene", "- running: bool"],
        ops: ["+ handle_events(): void", "+ run(): void", "+ shutdown(): void"]
      },
      code: `import pygame

class VisualApp:
    def __init__(self, scene, width=960, height=540, fps=60):
        pygame.init()
        self.screen = pygame.display.set_mode((width, height))
        self.clock = pygame.time.Clock()
        self.scene = scene
        self.fps = fps
        self.running = True

    def run(self):
        while self.running:
            dt = self.clock.tick(self.fps) / 1000.0
            self.handle_events()
            self.scene.update(dt)
            self.scene.draw(self.screen)
            pygame.display.flip()
        pygame.quit()`,
      mistakes: [
        "Writing effects before defining what the product must demonstrably do.",
        "Mixing event handling, animation equations, file paths and drawing inside one global while loop.",
        "Using frame increments such as x += 3 as the final motion model.",
        "Treating a storyboard as decoration instead of a sequence of testable scenes and interactions."
      ],
      evidence: [
        "6–10 panel storyboard.",
        "Five measurable acceptance criteria.",
        "App → Scene → Effect → Surface responsibility diagram.",
        "Runnable Pygame baseline that opens, animates and closes cleanly.",
        "First Git commit containing the working baseline."
      ],
      diagram: {
        title: "Runtime responsibility flow",
        nodes: ["Launcher", "VisualApp", "VisualScene", "Effect[]", "Pygame Surface"],
        note: "Config is external data consumed by the runtime; it should not become animation logic."
      },
      stages: [
        {
          key:"predict", label:"01", title:"Define", subtitle:"Product contract",
          prompt:"Write the exact behavior the final USB project must demonstrate before writing more effects.",
          tasks:["Create a 6–10 panel storyboard.","Define resolution, target FPS and offline requirement.","Name three effects and one parameter that will be changed live.","Write five acceptance criteria that another person can test."],
          command:"mkdir portable-visual-show\ncd portable-visual-show\ngit init\npython -m venv .venv",
          expected:"A new project folder exists, Git is initialized and the acceptance criteria are saved in README.md."
        },
        {
          key:"model", label:"02", title:"Model", subtitle:"Responsibilities",
          prompt:"Translate the visual product into software responsibilities before adding visual complexity.",
          tasks:["Draw App, Scene, Effect, Config and Launcher.","For each box, write what it owns and what it must not own.","Connect update(dt) and draw(surface) responsibilities."],
          command:"App → Scene → Effect[]\nApp reads events + clock\nScene coordinates effects\nEffect updates and draws one behavior",
          expected:"A responsibility diagram exists and each responsibility maps to a future Python module/class."
        },
        {
          key:"implement", label:"03", title:"Implement", subtitle:"First real loop",
          prompt:"Build the minimum Pygame runtime and one visible time-based motion.",
          tasks:["Activate the virtual environment.","Install Pygame 2.6.1.","Create main.py.","Use dt in the loop.","Draw one moving element."],
          command:".venv\\Scripts\\activate\npip install pygame==2.6.1\npython main.py",
          expected:"A window opens, the element moves, close events work and the process exits without a traceback."
        },
        {
          key:"test", label:"04", title:"Test", subtitle:"Baseline verification",
          prompt:"Prove the baseline works before adding architecture complexity.",
          tasks:["Launch three times.","Close with the window button.","Verify no traceback.","Record approximate startup time.","Capture one screenshot/video."],
          command:"python main.py",
          expected:"Three clean runs with visible motion and one evidence capture."
        },
        {
          key:"evidence", label:"05", title:"Evidence", subtitle:"Gate + commit",
          prompt:"Freeze the working baseline before Class 2.",
          tasks:["Commit the baseline.","Save storyboard and UML/responsibility diagram.","Record the five acceptance criteria.","Explain why Pygame was selected."],
          command:"git add .\ngit commit -m \"Class 1: runnable architecture baseline\"",
          expected:"CLASS 1 GATE: executable baseline + architecture + acceptance criteria + commit."
        }
      ]
    },
    {
      n: 2,
      slug: "procedural-engine",
      title: "Animation engine + reusable effects",
      lead: "Refactor the baseline into a frame-rate-independent procedural engine with reusable effect objects and parameter-driven behavior.",
      theoryHref: "theory.html?class=2",
      workshopHref: "workshop.html?class=2",
      concepts: [
        "Delta time expresses motion in units per second instead of units per frame, so animation speed is less dependent on render frequency.",
        "Procedural animation derives geometry, color or position from time, equations and parameters instead of replaying a fixed asset.",
        "A stable update(dt) / draw(surface) contract lets one Scene manage heterogeneous effects without knowing their internal equations.",
        "Deterministic random seeds make particle initialization reproducible, which improves debugging, comparison and QA."
      ],
      uml: {
        name: "Effect",
        attrs: ["- t: float", "- parameters: dict"],
        ops: ["+ update(dt): void", "+ draw(surface): void"]
      },
      code: `class Effect:
    def update(self, dt: float) -> None:
        raise NotImplementedError

    def draw(self, surface) -> None:
        raise NotImplementedError

class VisualScene:
    def __init__(self, effects):
        self.effects = effects

    def update(self, dt):
        for effect in self.effects:
            effect.update(dt)

    def draw(self, surface):
        surface.fill((18, 22, 38))
        for effect in self.effects:
            effect.draw(surface)`,
      mistakes: [
        "Changing position by a fixed number every frame.",
        "Copy-pasting the same animation code for every visual element.",
        "Using random values every frame when the intended result should be stable and reproducible.",
        "Letting draw() redefine simulation state instead of rendering already-computed state."
      ],
      evidence: [
        "VisualApp and VisualScene separated.",
        "OrbitEffect, PulseEffect and ParticleField implemented.",
        "At least one effect instantiated twice with different parameters.",
        "30 FPS vs 120 FPS comparison.",
        "Deterministic seed restart evidence."
      ],
      diagram: {
        title: "One real-time frame",
        nodes: ["Poll events", "Measure dt", "Update effects", "Draw scene", "Flip display"],
        note: "The update phase owns simulation state; draw renders that state."
      },
      stages: [
        {
          key:"predict", label:"01", title:"Predict", subtitle:"Frame-rate behavior",
          prompt:"Predict what happens when frame rate changes if motion is coded per frame versus per second.",
          tasks:["Write a prediction for 30 FPS and 120 FPS.","Identify one current variable that should use dt.","Define the units of speed."],
          command:"# per-frame (bad): x += 3\n# per-second (correct): x += speed_px_s * dt",
          expected:"A written prediction that distinguishes render frequency from physical animation speed."
        },
        {
          key:"model", label:"02", title:"Model", subtitle:"Effect contract",
          prompt:"Define one common contract for all effects.",
          tasks:["Create Effect interface/mental model.","Define update(dt).","Define draw(surface).","Decide which parameters belong to each effect."],
          command:"Effect\n ├─ OrbitEffect\n ├─ PulseEffect\n └─ ParticleField",
          expected:"Three effects share the same update/draw responsibility contract."
        },
        {
          key:"implement", label:"03", title:"Implement", subtitle:"Three effects",
          prompt:"Build the procedural engine using reusable classes.",
          tasks:["Implement OrbitEffect with sin/cos polar motion.","Implement PulseEffect using a periodic sine response.","Implement ParticleField with a fixed random seed.","Add all effects to VisualScene."],
          command:"python main.py",
          expected:"The same scene renders all three effects simultaneously from reusable objects."
        },
        {
          key:"test", label:"04", title:"Test", subtitle:"Parameter experiment",
          prompt:"Run controlled parameter experiments instead of visual guessing.",
          tasks:["Run at 30 FPS.","Run at 120 FPS.","Double orbit_speed.","Restart twice with the same seed.","Instantiate two OrbitEffect objects."],
          command:"python main.py",
          expected:"Motion timing remains approximately consistent; seed reproduces the same initial particle layout."
        },
        {
          key:"evidence", label:"05", title:"Evidence", subtitle:"Engine gate",
          prompt:"Freeze evidence that the engine is reusable and parameter-driven.",
          tasks:["Save before/after parameter captures.","Document FPS comparison.","Commit effect classes.","Explain the update/draw separation."],
          command:"git add .\ngit commit -m \"Class 2: reusable procedural animation engine\"",
          expected:"CLASS 2 GATE: reusable effects + dt-based motion + parameter/seed verification."
        }
      ]
    },
    {
      n: 3,
      slug: "portable-build",
      title: "Relative paths + portable build + launcher",
      lead: "Transform the working Python animation into a portable product that can be moved, renamed and executed offline without developer-machine paths.",
      theoryHref: "theory.html?class=3",
      workshopHref: "workshop.html?class=3",
      concepts: [
        "An absolute path is a hidden dependency on one machine; a portable application resolves resources from its own runtime location.",
        "Configuration is data. Parameters such as FPS, particle count and orbit speed belong in JSON so they can change without editing algorithms.",
        "PyInstaller packages Python and dependencies, but packaging alone does not prove portability.",
        "A manual launcher is explicit and auditable; the project does not require USB autorun, hidden startup tasks or permanent system changes."
      ],
      uml: {
        name: "RuntimeResources",
        attrs: ["- base_dir: Path", "- config_path: Path"],
        ops: ["+ resource_path(relative): Path", "+ load_config(): VisualConfig"]
      },
      code: `import sys
from pathlib import Path

def runtime_root() -> Path:
    if hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent

def resource_path(relative: str) -> Path:
    return runtime_root() / relative`,
      mistakes: [
        "Hard-coding C:\\Users\\... paths.",
        "Assuming that a successful PyInstaller build automatically works after moving the folder.",
        "Storing every configurable value directly in Python source.",
        "Using hidden or automatic USB execution instead of a visible launcher."
      ],
      evidence: [
        "config.json with documented parameters and defaults.",
        "resource_path() or equivalent relative path mechanism.",
        "PortableVisualShow.exe built successfully.",
        "launch.bat manual launcher.",
        "Moved/renamed folder run with network disconnected."
      ],
      diagram: {
        title: "Source to portable runtime",
        nodes: ["Python source", "PyInstaller", "PORTABLE_BUILD", "Moved / USB path", "Offline execution"],
        note: "Portability is demonstrated at the destination after relocation."
      },
      stages: [
        {
          key:"predict", label:"01", title:"Audit", subtitle:"Find hidden dependencies",
          prompt:"Identify everything that currently depends on the development computer.",
          tasks:["Search for absolute paths.","List external assets.","List runtime dependencies.","Choose which parameters move to config.json."],
          command:"findstr /S /I \"C:\\\\Users\\\\\" *.py",
          expected:"A short portability risk list exists before packaging."
        },
        {
          key:"model", label:"02", title:"Configure", subtitle:"Data vs code",
          prompt:"Move runtime parameters out of animation algorithms.",
          tasks:["Create config.json.","Define defaults.","Implement JSON parsing fallback.","Document live-defense parameters."],
          command:"python main.py",
          expected:"The same code runs with different orbit_speed/particle_count values from config."
        },
        {
          key:"implement", label:"03", title:"Package", subtitle:"Build Windows executable",
          prompt:"Build the portable executable and explicit launcher.",
          tasks:["Install PyInstaller.","Build one-file executable.","Create launch.bat.","Copy config and README into PORTABLE_BUILD."],
          command:"pip install pyinstaller==6.16.0\npyinstaller --noconfirm --clean --onefile --name PortableVisualShow main.py",
          expected:"PORTABLE_BUILD contains the EXE, config, launcher and instructions."
        },
        {
          key:"test", label:"04", title:"Relocate", subtitle:"Clean-path test",
          prompt:"Prove that the build does not depend on the original path.",
          tasks:["Copy PORTABLE_BUILD to a new folder.","Rename the folder.","Disconnect network.","Launch with launch.bat.","Change one config parameter and relaunch."],
          command:"launch.bat",
          expected:"The copied build starts offline and reflects the config change."
        },
        {
          key:"evidence", label:"05", title:"Evidence", subtitle:"Portability gate",
          prompt:"Record the destination path and offline proof.",
          tasks:["Capture the moved path.","Capture the running application.","Record network-off condition.","Commit build scripts, not generated caches."],
          command:"git add build_portable.bat launch.bat config.json README_PORTABLE.txt\ngit commit -m \"Class 3: portable build and launcher\"",
          expected:"CLASS 3 GATE: moved-folder + offline execution + manual launcher."
        }
      ]
    },
    {
      n: 4,
      slug: "qa-live-defense",
      title: "Offline QA + live project defense",
      lead: "Treat the project as a product: inject controlled failures, fix the real cause, repeat the same test and defend the architecture through reproducible live behavior.",
      theoryHref: "theory.html?class=4",
      workshopHref: "workshop.html?class=4",
      concepts: [
        "A test is a claim-evidence pair: initial condition, action, expected behavior and observed result.",
        "Fault injection intentionally creates a failure condition so hidden assumptions are exposed before the final demonstration.",
        "A fix is not verified until the exact same failing condition is repeated as a regression test.",
        "Live defense demonstrates ownership: predict a parameter change, execute it, relaunch and explain why the observed result follows from the architecture."
      ],
      uml: {
        name: "QACase",
        attrs: ["- id: str", "- condition: str", "- expected: str", "- observed: str"],
        ops: ["+ run(): Result", "+ capture_evidence(): void", "+ retest(): Result"]
      },
      code: `QA_CASES = [
    ("QA-01", "original folder", "launches"),
    ("QA-02", "renamed folder", "launches"),
    ("QA-03", "network disconnected", "launches"),
    ("QA-04", "malformed config", "fallback or clear error"),
]

for case in QA_CASES:
    print(case)`,
      mistakes: [
        "Writing PASS without preserving any evidence.",
        "Changing several variables at once and then guessing which change fixed the defect.",
        "Testing only on the development path.",
        "Memorizing a defense script without being able to modify and explain the running system."
      ],
      evidence: [
        "Completed QA-01 through QA-08 matrix.",
        "At least one reproduced defect with before/fix/retest evidence.",
        "Offline or removable-media launch evidence.",
        "Final architecture diagram and README.",
        "Live parameter change with predicted and observed result."
      ],
      diagram: {
        title: "Evidence-driven QA loop",
        nodes: ["Inject condition", "Observe", "Diagnose", "Fix", "Repeat same test"],
        note: "The loop closes only when the original failure condition is repeated and passes."
      },
      stages: [
        {
          key:"predict", label:"01", title:"Plan", subtitle:"QA matrix",
          prompt:"Define the exact test matrix before final fixes.",
          tasks:["Prepare QA-01…QA-08.","For each test define condition/action/expected/evidence.","Select one parameter for live defense."],
          command:"type QA_MATRIX.md",
          expected:"Eight reproducible QA cases exist before testing begins."
        },
        {
          key:"model", label:"02", title:"Inject", subtitle:"Controlled failures",
          prompt:"Create failure conditions intentionally and observe behavior.",
          tasks:["Rename/copy the folder.","Disconnect internet.","Corrupt config JSON.","Remove one optional asset if used.","Close/reopen repeatedly."],
          command:"launch.bat",
          expected:"Failures or successful fallbacks are recorded with exact reproduction conditions."
        },
        {
          key:"implement", label:"03", title:"Fix", subtitle:"Small justified correction",
          prompt:"Fix root causes one at a time.",
          tasks:["Identify failing component.","Make the smallest justified code/config change.","Document why it fixes the assumption.","Do not hide errors without explanation."],
          command:"python -m pytest -q tests",
          expected:"Source-level smoke tests still pass after the correction."
        },
        {
          key:"test", label:"04", title:"Retest", subtitle:"Regression evidence",
          prompt:"Repeat the exact same condition after each fix.",
          tasks:["Re-run failed QA case.","Record PASS/FAIL.","Capture before/after.","Check target FPS on presentation hardware."],
          command:"launch.bat",
          expected:"The original failing condition now passes or produces the documented controlled fallback."
        },
        {
          key:"evidence", label:"05", title:"Defend", subtitle:"Live technical defense",
          prompt:"Demonstrate architectural ownership, not memorized narration.",
          tasks:["Launch from clean/portable media.","Explain Launcher → App → Scene → Effect → Surface.","Change orbit_speed or particle_count live.","Predict the visual result before relaunch.","Show one defect and its regression evidence."],
          command:"git add .\ngit commit -m \"Class 4: final QA and defense evidence\"",
          expected:"CLASS 4 GATE: portable demo + QA matrix + retest evidence + live parameter defense."
        }
      ]
    }
  ]
};
