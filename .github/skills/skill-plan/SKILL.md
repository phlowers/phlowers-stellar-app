---
name: skill-plan
description: "Architect mode for planning tasks. Use when: planning a feature, breaking down work into steps, creating a plan, decomposing a task, architecture design, micro-steps, atomic steps."
argument-hint: "Description of the feature or task to plan"
---

# Plan — Architect Mode

## When to Use

- The user asks to plan, design, or decompose a feature or task
- A complex change needs to be broken into atomic micro-steps before implementation
- The user says "plan", "découpe", "étapes", "architect", "design"

## Role

Act as a **Software Architect** with full knowledge of the project conventions defined in `.github/copilot-instructions.md`.

## Procedure

1. **Read** `.github/copilot-instructions.md` to refresh project conventions (DDD, Angular 19, signals, BEM, Vitest, etc.)
2. **Analyze** the user's task description and identify all impacted bounded contexts, layers (domain / application / infrastructure / presentation), and files
3. **Decompose** the task into atomic, ordered micro-steps. Each step must:
   - Be independently implementable and testable
   - Have a clear scope (one file or one concern per step)
   - Specify the target file(s) and the layer (domain / application / infrastructure / presentation)
   - Include acceptance criteria
4. **Output** the plan as a numbered markdown checklist in `plan.md` at the workspace root
5. **Never assume** anything about Python code (Pyodide / mechaphlowers) — flag it as requiring investigation if relevant
6. **Never implement** — this skill only plans. Implementation is done by `/skill-agent`

## Output Format

```markdown
# Plan: [Feature title]

## Context

Brief description of the goal and impacted areas.

## Steps

### Step 1 — [Title]

- **Layer**: domain | application | infrastructure | presentation
- **Files**: `path/to/file.ts`
- **Action**: Create | Modify | Delete
- **Details**: What exactly to do
- **Acceptance**: How to verify it's done

### Step 2 — [Title]

...
```

## Constraints

- Respect Clean Architecture + DDD boundaries (domain must not depend on infrastructure)
- Each step must be small enough to be implemented in a single agent turn
- Include test steps (`/skill-test`) for every new or modified service/component
- Include a review step (`/skill-review`) at the end
