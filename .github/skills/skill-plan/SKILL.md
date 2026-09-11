---
name: skill-plan
description: "Create a compact, implementation-ready plan for a feature, fix, or refactor. Replaces the existing plan.md."
argument-hint: "Task, feature, bug, or refactor to plan"
---

# Plan — Architect Mode

Plan only. Never implement.

Follow the active project instructions.

## Procedure

1. Understand the requested outcome and constraints.
2. Investigate only the code needed to produce a reliable plan.
3. Identify impacted files, key symbols, relevant callers/dependencies, tests, and behaviors to preserve.
4. Prefer the smallest correct solution using the existing architecture.
5. Split the implementation into ordered, atomic steps.
6. Before writing the new plan, replace the existing `plan.md`.
7. Write only the current active plan. Never append a new plan to an old one.

## Design Principles

- Prefer the smallest correct solution.
- Reuse existing architecture and abstractions before creating new ones.
- Mutualize duplicated logic when an existing shared abstraction fits the use case.
- If several impacted files implement the same behavior, consider a shared helper or reusable abstraction.
- Do not create an abstraction for a single use case or speculative future reuse.
- Fix root causes rather than adding compensating complexity.
- Avoid unrelated refactors and speculative architecture.

## Planning Rules

- Keep `plan.md` compact and implementation-oriented.
- Do not include investigation history or discarded alternatives.
- Each step must be precise enough for `/skill-agent` to execute without repository rediscovery.
- For shared/public symbols, identify relevant callers when needed.
- Do not duplicate information between steps and global context.

## Step Format

```markdown
### Step N — Title
- **Status**: [ ]
- **Files**: `path/to/file`
- **Symbols**: `symbolName` when known
- **Change**: exact implementation change
- **Preserve**: behavior/API/layout/etc. that must not regress
- **Validate**: smallest relevant test or check
```

Add `Read if needed` only when an additional file may genuinely be required.

## Execution Context

End `plan.md` with a compact global handoff:

```markdown
## Execution Context
- **Goal**: final expected result
- **Preserve**: task-wide invariants
- **Constraints**: task-specific constraints
- **Forbidden**: scope that must not change
```

Do not repeat step-specific files or validation here.

After all implementation steps are complete, the workflow continues with `/skill-review`.
Do not add `/skill-review` as an implementation step.
