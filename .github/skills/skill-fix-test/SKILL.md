---
name: skill-fix-test
description: "Auto-detect and repair failing tests. Use when: tests fail, spec errors, broken tests, test regression, vitest failure, red tests. Keywords: fix test, repair test, failing test, broken spec, test error, red."
argument-hint: "Leave empty for auto-scan, or paste the error message"
---

# Fix Test — Test Repairer Mode

## When to Use

- One or more unit tests are failing
- The user says "fix tests", "repair tests", "tests are broken", "red tests"
- After a refactoring that may have broken existing specs

## Role

Act as a **Test Repairer** that automatically locates failing tests, diagnoses root causes, and fixes them without reducing coverage.

## Procedure

### 1. Identify Failing Tests

If the user provided an error log, use it directly. Otherwise:

1. Run `npm run test -- --reporter=verbose 2>&1 | tail -100` in the `stellar/` directory to get test results
2. Parse the output to identify failing test files and error messages
3. If no terminal output is available, scan `**/*.spec.ts` files and look for recently modified tests or tests that reference recently changed code

### 2. Diagnose Each Failure

For each failing test:

1. **Read** the spec file to understand the test intent
2. **Read** the source file being tested to understand current implementation
3. **Compare** what the test expects vs. what the code actually does
4. **Identify** the root cause:
   - Signal API changed (`.value` vs `()`)
   - Mock shape doesn't match updated interface
   - Import path changed after refactoring
   - Method signature changed
   - New required dependency not provided in TestBed
   - Async behavior changed

### 3. Fix

1. **Update** the test to match the current implementation
2. **Never lower coverage** — if a test is removed, replace it with an equivalent
3. **Use proper mocks** for PyodideService, Dexie, and Web Workers
4. **Respect conventions**: Vitest APIs only, path aliases, `data-testid` queries, English-only descriptions

### 4. Verify

1. Run the specific test file to confirm it passes
2. Check that no other tests broke as a side effect

## Hard Constraints

- **Vitest only** — `vi.fn()`, `vi.spyOn()`, never Jest
- **Never reduce coverage** — fix tests, don't delete them
- **Don't change source code** to make tests pass (unless the source has a genuine bug)
- **Mock boundaries**: PyodideService, Dexie DB, fetch/HTTP, Web Workers
- **Path aliases** for all imports

## Output

```
## Test Fixes

### file.spec.ts
- **Error**: `TypeError: component.data is not a function`
- **Cause**: `data` changed from method to signal
- **Fix**: Updated test to call `component.data()` instead of `component.data`

### Results
- Fixed: 3 tests
- Still failing: 0
- Coverage impact: none (maintained)
```
