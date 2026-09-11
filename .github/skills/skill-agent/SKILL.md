---
name: skill-agent
description: "Execute one approved step from plan.md, or all remaining steps when explicitly requested, with minimal context, targeted validation, and zero scope creep."
argument-hint: "Step number from plan.md, or 'all' to execute all remaining steps"
---

# Agent — Executor Mode

Execute either:
- one requested step from `plan.md`; or
- all remaining unchecked steps when `all` is explicitly requested.

The planning and discovery phase is already complete.

Follow the active project instructions.

## Mode Selection

### Single-step mode

When a step number is provided:
- execute only that step;
- validate it;
- mark it `[x]` only after successful validation;
- stop after that step.

### Full-plan mode

When `all` is provided:
- execute remaining unchecked steps in order;
- validate each step before continuing;
- mark each successful step `[x]`;
- reuse already loaded context when still relevant;
- do not rediscover the repository between steps;
- stop at a clean step boundary if the plan becomes too large or context-heavy;
- stop immediately if a plan amendment is required.

## Procedure

For each step being executed:

1. Read the requested step and global `Execution Context`.
2. Read only the files or code ranges required for that step.
3. Implement the smallest correct diff.
4. Run the step's targeted validation.
5. Inspect the resulting diff.
6. Mark the step `[x]` only after successful validation.

## Implementation Principles

- Reuse existing code before creating new abstractions.
- Mutualize duplicated logic when duplication would otherwise be introduced.
- Prefer extending an appropriate existing shared helper over duplicating equivalent code.
- Do not extract or generalize unrelated code beyond the approved plan.
- Fix the root cause, not the symptom.
- No speculative architecture.
- No unrelated refactor, cleanup, or improvement.
- Preserve existing behavior outside the approved scope.

## Context and Tool Discipline

- Do not re-plan or rediscover the repository.
- No broad repository search by default.
- No subagents.
- Avoid rereading unchanged files.
- Prefer targeted reads and exact symbol searches.
- Do not modify files outside the step's approved scope.
- Do not weaken tests or safeguards to make validation pass.

## Controlled Discovery

Search outside the planned scope only when concrete evidence requires it:

- a referenced symbol cannot be resolved;
- the current code contradicts the plan;
- a shared/public dependency must be verified;
- targeted validation exposes an external dependency.

Search only for the missing fact, then return to the planned scope.

If implementation requires modifying an unlisted file, stop before editing it and report why the plan must be updated.

## Validation

Use the smallest relevant validation defined by each step.

Do not run the full test suite unless:
- the step explicitly requires it; or
- it is the plan's final validation step.

On failure:
1. inspect the failure;
2. investigate only the nearest relevant code;
3. fix the root cause;
4. rerun the same targeted validation.

If the same issue remains after two focused correction cycles without new evidence, stop and report the blocker instead of expanding the investigation.

## Completion

Before marking a step complete, confirm:
- the requested change is implemented;
- acceptance and validation pass;
- no unrelated scope was changed.

If the plan is stale, ambiguous, or incompatible with the current code, stop instead of improvising.
