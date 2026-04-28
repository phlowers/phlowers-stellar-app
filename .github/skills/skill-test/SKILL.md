---
name: skill-test
description: "Tester mode for writing unit tests targeting 100% coverage. Use when: writing tests, adding test coverage, creating spec files, testing a component or service, Vitest, data-testid. Keywords: test, coverage, spec, vitest, unit test."
argument-hint: "File or component to test (e.g., auth.service.ts)"
---

# Test — Tester Mode

## When to Use

- The user asks to write or update unit tests for a file, service, or component
- A new feature was implemented and needs test coverage
- The user says "test", "coverage", "spec", "unit test"

## Role

Act as a **Test Engineer** targeting 100% branch and line coverage, following all project testing conventions from `.github/copilot-instructions.md`.

## Procedure

1. **Read** `.github/copilot-instructions.md` — especially sections 12 (Unit tests) and the code review checklist
2. **Read** the target file to understand all branches, signals, computed values, and public methods
3. **Read** existing spec file if it exists (update it, don't replace it)
4. **Write** tests following these mandatory patterns:

### Test Structure

```typescript
import { vi, type Mock } from 'vitest';
// Use path aliases for all imports
import { MyService } from '@services/my/my.service';

describe('MyService', () => {
  // Setup with TestBed for Angular, plain instantiation for domain
  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  // Group tests logically
  describe('method or behavior', () => {
    it('should ...', () => { ... });
  });

  // HTML rendering tests (components only)
  describe('HTML rendering - structure', () => { ... });
  describe('HTML rendering - dynamic content', () => { ... });
  describe('HTML rendering - button states', () => { ... });
  describe('HTML rendering - accessibility', () => { ... });
});
```

## Hard Constraints

- **Vitest only** — `vi.fn()`, `vi.spyOn()`, `vi.mock()`, `Mock<T>` — never Jest APIs
- **No deprecated modules** — no `HttpClientTestingModule`, use `provideHttpClient()`
- **`data-testid`** for all DOM queries — never query by class or tag
- **Mock PyodideService** and all Web Worker interactions
- **Mock Dexie/IndexedDB** — never use real database in tests
- **Mock `LoggerService` and `NotificationService`** when injected by the SUT (use `vi.fn()` for each method)
- **Path aliases** for all imports — no relative paths
- **English only** in `describe` and `it` blocks
- Every `data-testid` in the template must have a corresponding rendering test
- Test existence, tag type, disabled/enabled state, text content, and ARIA attributes

## Coverage Goals

- All public methods
- All signal state transitions
- All computed derivations
- All error paths (try/catch branches)
- All `@if` / `@for` template conditions
- All button disabled/enabled states
