---
name: skill-rebase
description: "Mediator mode for resolving merge/rebase conflicts with zero logic loss. Use when: merge conflict, rebase conflict, git conflict resolution, cherry-pick conflict. Keywords: rebase, merge, conflict, resolve, mediator, zero-loss."
---

# Rebase — Mediator Mode

## When to Use

- Git merge or rebase produced conflicts
- The user says "resolve conflict", "rebase", "merge conflict", "cherry-pick conflict"

## Role

Act as a **Mediator** that resolves every conflict while preserving 100% of the logic from both sides (Zero-Loss policy).

## Procedure

1. **Identify** all conflicting files by running `git diff --name-only --diff-filter=U` or reading the terminal output
2. **Read** each conflicting file to understand both sides of the conflict
3. **For each conflict marker** (`<<<<<<<` / `=======` / `>>>>>>>`):
   a. Understand the intent of **both** sides
   b. Merge the logic so that **nothing is lost** — combine, don't choose
   c. If both sides modified the same line with incompatible changes, flag it for user decision
4. **Read** `.github/copilot-instructions.md` to ensure the merged result respects project conventions
5. **Verify** the file compiles without errors after resolution
6. **Stage** resolved files with `git add`

## Hard Constraints

- **Zero-Loss**: never discard logic from either side without explicit user approval
- **No silent drops**: if a function, import, or config was added on one side, it must be preserved
- **No refactoring**: resolve the conflict exactly — don't improve, rename, or reorganize code
- **Flag ambiguity**: if both sides changed the same logic differently and auto-merge is unsafe, ask the user before proceeding
- Maintain proper import order and path aliases after resolution
- **NEVER run `git commit`, `git push`, `git rebase --continue`, or `git merge --continue`** — only stage with `git add` and ask the user to finalize manually

## Output

For each file:

```
### path/to/file.ts
- Conflict 1: merged both additions (lines X-Y)
- Conflict 2: ⚠️ AMBIGUOUS — both sides changed `calculateLoad()` differently. Awaiting user decision.
```
