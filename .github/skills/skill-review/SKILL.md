---
name: skill-review
description: "Senior auditor mode for reviewing implementation steps. Use when: reviewing code, auditing a step, checking for regressions, memory leaks, WASM issues, code quality. Keywords: review, audit, check, regression, memory leak, WASM, quality."
argument-hint: "Step number from plan.md to review"
---

# Review — Senior Auditor Mode

## When to Use

- A plan step has been implemented and needs validation before moving on
- The user asks to review, audit, or check code quality
- The user says "review", "audit", "check step N", "verify"

## Role

Act as a **Senior Auditor** with expertise in the current Angular version (see `package.json`), TypeScript strict, WASM/Pyodide memory management, and the project conventions in `.github/copilot-instructions.md`.

## Procedure

1. **Read** `.github/copilot-instructions.md` and any `.github/instructions/*.instructions.md` matching the reviewed files
2. **Read** `plan.md` to identify the step under review
3. **Read** all files modified in the step
4. **Audit** against the full checklist below
5. **Report** findings as a structured list: PASS / WARN / FAIL per category
6. **Do NOT fix** issues — only report them. Fixes are done via `/skill-agent` or `/skill-fix-test`

## Audit Checklist

### Architecture

- [ ] Changes respect the repo layout: `src/app/{core, features/<feat>, infrastructure, shared}`. Most features use an internal `application/` + `presentation/` (+ `infrastructure/`) split — follow it for new/modified features (`studio` is a legacy exception with a `core/` + sub-feature-folder layout; don't migrate it opportunistically). No invented third layout without explicit user validation
- [ ] No cross-feature direct dependencies
- [ ] Reusable logic lives in `core/` or `shared/`, not duplicated per feature

### Angular

- [ ] `ChangeDetectionStrategy.OnPush` on all components
- [ ] `inject()` used (no constructor injection)
- [ ] State managed with `signal()` / `computed()` / `effect()`
- [ ] `standalone: true` on all components
- [ ] `input()` / `output()` (not `@Input` / `@Output`)
- [ ] No business logic in presentation components

### TypeScript Strict

- [ ] `npm run lint-check` passes — do not manually re-verify rules already enforced as ESLint errors (no `any`, no `window`)
- [ ] Path aliases used (no relative imports)

### Logging & Notifications

- [ ] No `console.log` / `console.warn` / `console.error` in DI-injectable code
- [ ] `LoggerService` used for all technical logs
- [ ] `NotificationService` used for user-facing error / warning / info / success messages

### SCSS / BEM

- [ ] BEM naming respected
- [ ] No magic values (CSS variables used)
- [ ] No unnecessary selector nesting depth

### Accessibility

- [ ] `aria-*` attributes on interactive elements
- [ ] `data-testid` on all interactive/meaningful elements
- [ ] Keyboard navigation works

### Performance & Memory

- [ ] Plotly calls run outside Angular zone (`ngZone.runOutsideAngular`)
- [ ] `Plotly.purge()` called in `ngOnDestroy()`
- [ ] Pyodide runs in Web Worker only
- [ ] No WASM memory leaks (`.destroy()` called on Pyodide proxies)
- [ ] Dexie transactions used for multi-table operations
- [ ] Subscriptions properly cleaned up

### Testing

- [ ] New/modified code has corresponding tests
- [ ] No Jest APIs (only Vitest)
- [ ] `data-testid` rendering tests present

### i18n

- [ ] No hardcoded user-facing text in templates (use the `transloco` pipe)
- [ ] No hardcoded user-facing text in TypeScript (use `TranslocoService.translate()`)
- [ ] No `$localize` / `i18n` attribute usage (Angular native i18n was fully replaced by Transloco)
- [ ] New/changed translation keys added to **both** `public/i18n/en.json` and `public/i18n/fr.json`

### Dead Code

- [ ] Any suspected dead code logged in `deadcode.md` (not deleted)

## Output Format

```
## Review: Step N — [Title]

### PASS
- ✅ OnPush on all components
- ✅ No `any` types

### WARN
- ⚠️ Missing `aria-label` on dialog trigger button

### FAIL
- ❌ Domain entity imports from `@angular/core`
- ❌ Missing tests for error branch in `loadData()`

### Verdict: PASS | NEEDS FIXES
```
