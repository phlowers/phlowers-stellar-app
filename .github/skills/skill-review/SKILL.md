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

Act as a **Senior Auditor** with expertise in Angular 19, TypeScript strict, WASM/Pyodide memory management, and the project conventions in `.github/copilot-instructions.md`.

## Procedure

1. **Read** `.github/copilot-instructions.md` — especially the code review checklist (section 13)
2. **Read** `plan.md` to identify the step under review
3. **Read** all files modified in the step
4. **Audit** against the full checklist below
5. **Report** findings as a structured list: PASS / WARN / FAIL per category
6. **Do NOT fix** issues — only report them. Fixes are done via `/skill-agent` or `/skill-fix-test`

## Audit Checklist

### Architecture & DDD

- [ ] Domain layer has no imports from Angular, Dexie, or infrastructure
- [ ] Use cases are in `application/`, implementations in `infrastructure/`
- [ ] No cross-feature direct dependencies

### Angular 19

- [ ] `ChangeDetectionStrategy.OnPush` on all components
- [ ] `inject()` used (no constructor injection)
- [ ] State managed with `signal()` / `computed()` / `effect()`
- [ ] `standalone: true` on all components
- [ ] `input()` / `output()` (not `@Input` / `@Output`)
- [ ] No business logic in presentation components

### TypeScript Strict

- [ ] No `any` type
- [ ] `globalThis` instead of `window`
- [ ] Path aliases used (no relative imports)

### SCSS / BEM

- [ ] BEM naming respected
- [ ] No magic values (CSS variables used)
- [ ] Max 3 levels nesting

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

- [ ] No hardcoded text in templates
- [ ] Translation keys in both `fr.json` and `en.json`

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
