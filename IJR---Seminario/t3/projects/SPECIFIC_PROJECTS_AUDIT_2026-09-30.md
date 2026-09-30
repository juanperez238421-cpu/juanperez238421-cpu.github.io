# Specific Projects Audit — 2026-09-30

## Scope

This audit compares the current production rows in `seminar_student_projects` with the Project Decision Center and the Seminar 11 Hour-2 workflow.

The current database contains **12 individualized project records** across five tracks:

- Web Development: 4
- Python / Data Analyst: 4
- Defensive Cybersecurity: 2
- 3D + Printing: 1
- Robotics: 1

## Readiness classification

### Ready-to-build fixed projects

These projects already have a concrete product, objective and technical scope. They may enter the Specific Project Workspace immediately.

| Group | Student | Track | Project |
|---|---|---|---|
| 11A | ARANGO GIRALDO JUAN PABLO | Cybersecurity | Web Resilience Defense Lab — DoS Mitigation in a Local Sandbox |
| 11A | GOMEZ CANO SAMUEL | Web | GTA V Mod Showcase — Web Catalog & Compatibility Guide |
| 11B | RICO PARAMO ALEJANDRO | Data / Python | Portable Python Visual Show — USB Launcher & Procedural Animation |

### Guided-definition projects

These records identify the student's technical route, but the source material does **not yet define a concrete final product**. They must first confirm title, problem, objective and tools in Project Decision Center. The workspace intentionally blocks gate progress until that confirmation exists.

| Group | Student | Track | Current definition state |
|---|---|---|---|
| 11A | MAZO LOPEZ JERONIMO | Data Science | Choose question + dataset |
| 11A | RODRIGUEZ PEÑA JERONIMO | Robotics | Define robot mission |
| 11B | ARBELAEZ ESCOBAR PEDRO PABLO | Cybersecurity | Define protected asset + defense |
| 11B | CHAVARRIAGA AVENDAÑO SAMUEL | 3D | Define functional object |
| 11B | JARAMILLO PALACIO PABLO | Web | Define user + problem + MVP |
| 11C | CORTES PAJON SAMUEL | Web | Define user + problem + MVP |
| 11C | GONZALEZ GIRALDO TOMAS | Data Science | Choose question + dataset |
| 11C | RINCON TORRES ALEJANDRO | Data Science | Choose question + dataset |
| 11C | VELASQUEZ BELTRAN SAMUEL | Web | Define user + problem + MVP |

## Functional gap found

Before this revision, the "Specific Projects" area was not equivalent to the other tracked course modules:

1. Only Rico had a dedicated build route.
2. Most project cards were descriptive; they did not persist Theory/Workshop progress.
3. Checkboxes in the dedicated Rico route were local-browser state only.
4. Project construction progress was not represented as unit-level evidence in the teacher Master panel.
5. A guided-definition row could look like a specific project even though the student had not yet defined a concrete product.
6. Project Studio percentage and the actual project build route could diverge.

## New functional contract

The new `projects/workspace/` route is now the canonical Hour-2 build module.

For every concrete project it provides:

- automatic reuse of the central Seminar institutional identity;
- no second student-email form;
- project title, objective, stack, scope and project-specific playbook from Supabase;
- one tracked unit per project sprint/class;
- separate Theory and Workshop views;
- four auditable workshop checks: Define, Build, Test, Evidence;
- evidence note, evidence URL and Git/file reference;
- sequential project gates;
- persistent progress in `seminar_project_unit_progress`;
- synchronization of project progress back into Project Studio percentage/current unit;
- visibility in the teacher Master panel.

## Integrity rule

A project in `guided_definition` mode cannot register build progress until `decision_status = confirmed`.

This is intentional: the system must not report progress on a "specific project" until the student has actually defined a specific product.

Fixed teacher-defined projects can begin immediately.

## Special project resources

Rico's detailed four-class Python/Pygame build remains available as an advanced reference route, but the new Specific Project Workspace is the canonical tracked source of progress.

Cybersecurity students continue to have the defensive case library available as supporting material.