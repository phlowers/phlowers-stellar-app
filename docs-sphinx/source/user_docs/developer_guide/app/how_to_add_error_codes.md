# How to Add Error/Warning Codes and How the Toast Pipeline Works

This document explains how to add a new Python error or warning code so it
shows up as a toast in the app, and then describes how the underlying
catch/warning pipeline works end to end.

---

## Part 1 — Adding a new error/warning code

There are two distinct triggers on the Python side, and both are funnelled
into the same `PythonDiagnostic` shape on the TypeScript side:

- **A raised exception** — e.g. `raise ValueError("SolverError: ...")` — is
  caught by the `try/except` in `handleTask()`.
- **A captured warning** — e.g. `warnings.warn("...")` — never raises, but is
  intercepted by a `warnings.showwarning` hook and polled after every task.

In both cases, the JS/TS side identifies which code was raised by checking
whether the exception message or the warning text **contains** one of the
known `PythonErrorCode` enum values as a substring. This means:

- The Python side does **not** need to send a structured code — it just needs
  the code name to appear somewhere in the exception message or warning text.
- Adding a new code is purely a TypeScript-side change (enum + message +
  severity), as long as the Python message text contains that code name.

### Steps to add a new code

1. **Add the enum value** in types.ts:

   ```typescript
   export enum PythonErrorCode {
     // ...existing codes
     MyNewError = 'MyNewError'
   }
   ```

   The string value **must** be the exact substring that appears in the
   Python exception message or `warnings.warn(...)` text (e.g. `MyNewError`).

2. **Add its translation key** in python-error-messages.ts, in `PYTHON_ERROR_KEYS`, then add the
   corresponding entry to both `public/i18n/en.json` and `public/i18n/fr.json` under `shared.python-errors.*`:

   ```typescript
   const PYTHON_ERROR_KEYS: Record<PythonErrorCode, string> = {
     // ...
     [PythonErrorCode.MyNewError]: 'shared.python-errors.my-new-error'
   };
   ```

   ```json
   // public/i18n/en.json and public/i18n/fr.json
   {
     "shared": {
       "python-errors": {
         "my-new-error": "A description shown to the user."
       }
     }
   }
   ```

3. **Classify its severity** in python-error-severity.ts, in `PYTHON_ERROR_SEVERITY`:

   ```typescript
   export const PYTHON_ERROR_SEVERITY: Record<PythonErrorCode, DiagnosticSeverity> = {
     // ...
     [PythonErrorCode.MyNewError]: 'error' // or 'warning'
   };
   ```

   > **Important:** `python-error-severity.ts` must never import or use
   > `TranslocoService`/i18n. It is imported by `handle-task.ts`, which runs
   > inside the Pyodide Web Worker bundle — a bundle that has **no Angular
   > injector**, so `TranslocoService` cannot be instantiated there.
   > Translated messages belong in `python-error-messages.ts` instead, which
   > must only ever be imported from main-thread code (components/services),
   > never from `handle-task.ts` or anything else bundled into
   > `worker-python.ts`. See [Part 2, section 2.7](#27--the-worker-bundle-and-transloco)
   > for details.

   - `'error'` — shown as a blocking error notification
     (`notificationService.error(...)`) and prevents the calculation result
     from being used.
   - `'warning'` — shown as a non-blocking warning toast
     (`notificationService.warning(...)`); the calculation result is still
     used.

   TypeScript enforces that **every** `PythonErrorCode` has both a message and
   a severity — forgetting one is a compile error.

4. **On the Python side**, make sure the error/warning text actually contains
   the code name:

   ```python
   # Exception — message must contain "MyNewError"
   raise ValueError("MyNewError: something went wrong")

   # Warning — message must contain "MyNewError"
   warnings.warn("MyNewError: something to flag")
   ```

5. **Double-check the translation keys** you added in step 2 exist with matching values in both
   `public/i18n/en.json` and `public/i18n/fr.json` — Transloco silently falls back to the raw key
   string if a translation is missing in one of the languages.

6. **Add/update tests**:
   - python-error-severity.spec.ts
     asserts every `PythonErrorCode` has a severity mapping — this will fail
     until you add step 3.
   - python-error-messages.spec.ts
     asserts every known code formats to a non-null message.
   - Add a case to handle-task.spec.ts
     if the new code needs dedicated coverage for the matching logic.

No changes are needed in `WorkerPythonService`, `PlotService`, or
`StudioComponent` — they are generic over `PythonDiagnostic[]` and
automatically pick up any new code.

---

## Part 2 — How the catch/warning pipeline works

### Overview

```
Python (Pyodide worker)
  │
  │  raises exception             warnings.warn(...)
  │        │                            │
  │        ▼                            ▼
  │  try/except in            warnings.showwarning hook
  │  handleTask()              (functions.py, _capture_warning)
  │        │                            │
  │        │                    appended to _captured_warnings[]
  │        │                            │
  │        └──────────┬─────────────────┘
  │                    ▼
  │         handleTask() builds diagnostics: PythonDiagnostic[]
  │                    │
  ▼                    ▼
worker-python.ts postMessage({ result, error, diagnostics })
  │
  ▼
WorkerPythonService.onmessage → runTask() resolves { result, error, diagnostics }
  │
  ▼
PlotService.diagnostics = signal<PythonDiagnostic[]>([...])
  │
  ▼
StudioComponent effect() → NotificationService.error()/.warning() (one toast per diagnostic)
```

### 2.1 — Python side: two independent capture mechanisms

**Exceptions** are not touched on the Python side at all — they propagate
normally and are caught by the `try/catch` in
[handle-task.ts](../../../../../src/app/core/services/worker_python/tasks/handle-task.ts).

**Warnings** would otherwise be printed to stderr and lost, since
`warnings.warn()` does not raise. To capture them,
[functions.py](../../../../../src/app/core/services/worker_python/tasks/python-scripts/functions.py)
installs a global hook at worker startup:

```python
_captured_warnings: list[str] = []

def _capture_warning(message, category, filename, lineno, file=None, line=None):
    _captured_warnings.append(f"{category.__name__}: {message}")

warnings.showwarning = _capture_warning
warnings.simplefilter("always")  # capture every occurrence, not just the first
```

`get_and_clear_warnings()` returns and empties the buffer — it is called by
TypeScript after every task execution (success or failure), so warnings never
leak between tasks.

### 2.2 — TypeScript side: `handleTask()` builds the diagnostics array

`handleTask()` in `handle-task.ts` always returns:

```typescript
{ result, runTime, error: TaskError | null, diagnostics: PythonDiagnostic[] }
```

**On success:**

```typescript
const diagnostics = collectWarningDiagnostics(pyodide, task, log);
return { result: resultJs, runTime, error: null, diagnostics };
```

`collectWarningDiagnostics()`:
1. Calls Python's `get_and_clear_warnings()` and gets the raw warning strings.
2. For each warning text, finds the first `PythonErrorCode` enum value whose
   string is a substring of the text (`warningText.includes(code)`).
3. If a match is found, pushes a diagnostic with `origin: 'warning'`.
4. If no code matches, the warning is **logged but dropped** — no toast is
   shown for warnings that don't map to a known code.

**On failure (exception thrown):**

```typescript
const pythonErrorCode = Object.values(PythonErrorCode).find((code) => errorMessage.includes(code)) ?? null;
const diagnostics = collectWarningDiagnostics(pyodide, task, log); // any warnings before the throw
if (pythonErrorCode) {
  diagnostics.unshift({ code: pythonErrorCode, severity: PYTHON_ERROR_SEVERITY[pythonErrorCode], origin: 'exception', rawText: errorMessage });
}
return { result: null, runTime, error: errorType, diagnostics };
```

- The exception message is matched against `PythonErrorCode` the same way as
  warnings (substring match).
- If matched, the exception diagnostic is placed **first** (`unshift`) so
  consumers can reliably find it via `diagnostics.find(d => d.origin === 'exception')`.
- Any warnings captured *before* the exception was thrown are still collected
  and kept in the array (with `origin: 'warning'`).
- `error` is always set to a generic `TaskError` (`CALCULATION_ERROR` or
  `SOLVER_DID_NOT_CONVERGE`) regardless of whether a Python code matched —
  this is what gates whether the calculation result is considered failed.

### 2.3 — Threading through the worker boundary

- [worker-python.ts](../../../../../src/app/core/services/worker_python/worker-python.ts)
  posts `{ result, error, diagnostics }` back to the main thread (falls back
  to `diagnostics: []` if a task throws before `handleTask()` even runs).
- [worker-python.service.ts](../../../../../src/app/core/services/worker_python/worker-python.service.ts)
  receives the message, extracts `diagnostics` (`data.diagnostics ?? []`), and
  resolves the caller's `runTask()`/`runTaskWithTimeout()` promise with
  `{ result, error, diagnostics }`.

### 2.4 — Storage: `PlotService.diagnostics`

[plot.service.ts](../../../../../src/app/core/services/plot/plot.service.ts)
exposes a single signal:

```typescript
diagnostics = signal<PythonDiagnostic[]>([]);
```

It is set after every `runTask()` call that can produce diagnostics
(`initSectionStudio()`, `refreshProjection()`, load/cable-modification
services, …), and reset to `[]` in `resetAll()` and `purgePlot()` so stale
diagnostics never survive between sections or plot resets.

### 2.5 — Rendering: `StudioComponent` effect → toasts

[studio.component.ts](../../../../../src/app/shared/components/studio/studio.component.ts)
has a single `effect()` that reacts to both `plotService.error()` and
`plotService.diagnostics()`:

```typescript
effect(() => {
  const error = this.plotService.error();
  const diagnostics = this.plotService.diagnostics();
  const exceptionDiagnostic = diagnostics.find((d) => d.origin === 'exception') ?? null;

  if (error !== null) {
    const message = formatStudioError(error, exceptionDiagnostic?.code ?? null);
    if (exceptionDiagnostic?.severity === 'warning') {
      this.notificationService.warning(message);
    } else {
      this.notificationService.error(message);
    }
  }

  for (const diagnostic of diagnostics) {
    if (diagnostic.origin === 'warning') {
      const message = formatPythonError(diagnostic.code);
      if (message !== null) {
        this.notificationService.warning(message);
      }
    }
  }
});
```

This produces at most:
- **One blocking notification** for the `origin: 'exception'` diagnostic (if
  any) — routed to `.error()` or `.warning()` depending on its severity. This
  guards against a Python code classified as `'warning'` severity being
  raised as an actual exception (e.g. some codes can appear in both an
  exception message and a `warnings.warn()` call depending on context).
- **One warning toast per `origin: 'warning'` diagnostic** — every captured
  warning that resolved to a known code gets its own toast, using the plain
  `formatPythonError()` message (no fallback to the generic `TaskError`
  message, since there is no task-level error in that case).

Diagnostics with `origin: 'warning'` are never routed through
`notificationService.error()` — only exceptions can produce a blocking error.

### 2.6 — Why `origin` exists

`origin` (`'exception' | 'warning'`) is what lets `StudioComponent` merge what
used to be two separate signals/effects (`pythonErrorCode` for exceptions,
`pythonWarningCodes` for captured warnings) into a single `diagnostics` array
without double-toasting: the exception branch only looks at
`origin === 'exception'`, and the warning loop only looks at
`origin === 'warning'`, so the same diagnostic is never processed by both
paths.

### 2.7 — The worker bundle and Transloco

`worker-python.ts` is bundled by Angular as a **separate Web Worker chunk**
(triggered by the `new Worker(new URL('./worker-python', import.meta.url))`
call in `worker-python.service.ts`). This chunk only gets the code it
transitively imports — it does **not** run inside an Angular injection
context, so services obtained via `inject()` (like `TranslocoService`)
cannot be constructed there.

This means **any module imported (even transitively) by `handle-task.ts` or
`worker-python.ts` must not depend on `TranslocoService`** (directly or via a
helper that calls `translate()`), or the worker script throws at
construction/call time — which looks like "Pyodide is not loading" from the
outside.

This is why:

- `python-error-severity.ts` (severity map, plain string literals) is a
  **separate file** from `python-error-messages.ts` (translation-key map,
  `TranslocoService`-based) — `handle-task.ts` only imports the former.
- `python-error-messages.ts` must only ever be imported from main-thread code
  (`studio.component.ts`, `errors.ts`, `free-positioning.component.ts`, …),
  never from `handle-task.ts`, `worker-python.ts`, or any file they import.

If you need to add worker-side logic that depends on a new file, check its
import chain does not reach a `TranslocoService` usage before merging.
