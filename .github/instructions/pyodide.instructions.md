---
applyTo: "src/app/core/services/worker_python/**"
---

# Pyodide / Web Worker

Use `WorkerPythonService` at `@services/worker_python/worker-python.service`. Pyodide must only run
inside the Web Worker — never call it directly from a component or another service.

```typescript
const { result, error, pythonErrorCode } = await this.workerPythonService.runTask(Task.xxx, inputs);
readonly workerReady = toSignal(this.workerPythonService.ready$, { initialValue: false });
```

Python-side error messages must be translated through `shared.python-errors.*` Transloco keys
(see the i18n instructions) — never surfaced as raw Python tracebacks to the user.

`public/pyodide/*.whl` and the `config.mechaphlowers`/`config.thermohl` versions in `package.json`
are pinned to prebuilt wheels — never change them without explicit user instruction; a mismatch
breaks the Pyodide runtime silently.
