---
applyTo: "**/*.spec.ts"
---

# Tests — Vitest, mandatory before merge

Every new feature/service/component requires unit tests. **PR without tests is rejected.**
Modified code → update existing tests. No orphaned tests, no untested features.

## `vi` only — `jest.*` is forbidden

```typescript
import { vi } from 'vitest'; // only for vi.mock() / vi.hoisted()

// ✅
vi.fn() · vi.spyOn() · vi.mock() · vi.hoisted() · vi.Mocked<T>
// ❌ FORBIDDEN
jest.fn() · jest.spyOn() · jest.mock() · jest.Mocked<T>
```

## HTTP mocking

```typescript
// ✅
providers: [provideHttpClient(), provideHttpClientTesting()]
// ❌ FORBIDDEN — deprecated
import { HttpClientTestingModule }
```

## `data-testid` — required on all interactive/meaningful elements

- kebab-case values: `submit-btn` · `name-input` · `items-list`
- Repeated elements: shared `data-testid`, queried with `querySelectorAll`

```html
<form data-testid="my-form">
  <input data-testid="name-input" />
  <button type="submit" data-testid="submit-btn">{{ 'common.actions.save' | transloco }}</button>
</form>
```

## Rendering tests structure

```typescript
const getByTestId = (id: string): HTMLElement | null =>
  fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

describe("HTML rendering - form structure", () => {
  it("should render the form", () => {
    expect(getByTestId("my-form")?.tagName).toBe("FORM");
  });
});
```

## Mocking boundaries

Mock `WorkerPythonService`, Dexie/IndexedDB, Web Workers, `LoggerService`, and
`NotificationService` — never use the real implementation in a unit test.
