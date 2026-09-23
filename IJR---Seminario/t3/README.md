# Seminar 11 · Third Period Software Engineering Studio

The public student frontend is deployed through GitHub Pages. Supabase is the private data, validation and teacher-authentication backend.

## Classroom architecture

- **Hour 1 — Common Core:** OOP + UML for everyone.
- **Hour 2 — Specialized Project Studio:** Web Development, Python & Data Science, Defensive Cybersecurity, 3D Design + Programming, or Robotics & Automation.
- Weekly engineering rule: **design → model → implement → test → document → defend**.

The existing 16-module Python/Java T3 course is preserved as a technical library, remediation path and advanced practice. It is not destroyed or replaced.

## Common Core

Ten sessions reuse the existing OOP modules while adding the missing UML layer: class/object/instance, state/behavior, constructors, encapsulation, object relationships, inheritance, polymorphism/abstraction, architecture, debugging/refactoring and final architecture defense.

## Specialized tracks

Every track has eight synchronized project sprints: problem/MVP, UML/data model, prototype, OOP integration, validation/persistence/control, testing, refactor, and final release/defense. The domain changes; the engineering evidence and assessment language remain common.

## One consolidated selection flow

The former GitHub-Issue and direct-table surveys are deprecated. Student selection now uses one write/read-by-secret Edge Function. Student records cannot be selected directly with the public/publishable key.

The first-choice field determines the initial track. A student may record a repository, UML link, current sprint, progress percentage and next goal. Only the student's private edit token can reload or update that profile.

## Private teacher controls

Teacher pages remain intentionally absent from public student navigation. Access requires an institutional `@ijr.edu.co` account, MFA/AAL2, an active `teacher` or `admin` profile, and the audited `teacher-auth-gateway`. Studio tables are never read directly by browser clients.

## Assessment model

- Common OOP + UML: **30%**
- Functional project: **40%**
- Git + documentation: **15%**
- Individual live defense/modification: **15%**

Final evidence: problem statement, UML V1, GitHub repository, functional MVP, final UML, individual defense + live modification.

## Existing T3 technical library

The parallel Python/Java route still contains 16 modules across Basic, Medium and Advanced levels. The separate Python OOP Colab Lab continues to provide real Pyodide execution and server-side validation.

## QA

`npm test` verifies the original T3 contracts plus the Studio manifest, five-track coverage, defensive cybersecurity scope, single Edge Function selection flow and absence of a Studio teacher link in the public T3 page.
