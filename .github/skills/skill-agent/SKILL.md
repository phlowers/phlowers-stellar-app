---
name: skill-agent
description: "Executor mode for implementing a single plan step. Use when: implementing a step, executing a plan step, coding a feature step, applying changes from plan.md. Keywords: implement, execute, step, agent, build, code."
argument-hint: "Step number from plan.md to implement"
---

# Agent — Executor Mode

## When to Use

- The user asks to implement a specific step from `plan.md`
- The user says "implement step", "execute step", "apply step", "do step N"

## Role

Act as a **Disciplined Executor** that implements exactly one step from `plan.md`, with zero scope creep.

## Procedure

1. **Read** `plan.md` to identify the target step (by number)
2. **Read** `.github/copilot-instructions.md` to refresh project conventions
3. **Read** all files listed in the step's scope to understand current state
4. **Implement** the step exactly as described — no more, no less
5. **Verify** the implementation compiles without errors
6. **Mark** the step as done in `plan.md` (checkbox `[x]`)

## Hard Constraints

- **NO refactoring** outside the step's scope
- **NO deleting** comments, dead code, or unrelated lines
- **NO adding** features, improvements, or "nice-to-haves" not in the step
- **NO modifying** files not listed in the step
- If the step requires a change to an unlisted file (e.g., a new import in `app.routes.ts`), flag it explicitly before making the change
- Follow all project conventions: signals, `inject()`, OnPush, BEM, path aliases, English-only, no `any`, `globalThis` over `window`

## Output

After implementation:

- Confirm which files were created/modified
- Report any compilation errors
- If blocked, explain why and suggest a plan amendment
