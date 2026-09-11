
### `skill-plan-update`

```md
---
name: skill-plan-update
description: "Review and update the existing plan.md without replacing it. Add only missing or newly required execution information."
argument-hint: "New requirement, concern, correction, or point to verify"
---

# Plan Update — Review & Patch

Update the existing `plan.md` in place.

Never replace the whole plan.

Follow the active project instructions.

## Procedure

1. Read the relevant part of `plan.md`.
2. Evaluate the user's new information or concern.
3. Investigate code only if needed to verify a concrete gap.
4. Modify only the affected step(s) or global `Execution Context`.

Check for material issues such as:
- missing impacted files or symbols;
- missing callers or dependencies;
- missing tests or validation;
- missing edge cases;
- missing preservation constraints;
- incorrect ordering;
- steps that are too broad;
- new user requirements.

## Rules

- Do not rewrite already-correct sections.
- Do not duplicate existing information.
- Do not append a second complete plan.
- Preserve completed `[x]` steps.
- Preserve the approved architecture unless new evidence makes it invalid.
- Add a new step only when the requirement cannot safely fit an existing step.
- Update `Execution Context` only when the new information affects the whole plan.
- Do not add speculative improvements or unrelated refactors.

If the existing plan already covers the new information correctly, make no change.