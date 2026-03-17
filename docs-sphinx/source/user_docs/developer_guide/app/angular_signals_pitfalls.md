



# Angular Signals — Common Pitfalls (section, span, support)

This document lists the reactive bugs identified in the application related to the use of Angular signals (`signal`, `computed`, `effect`, `toSignal`).
It serves as a reference to avoid reproducing these errors in future developments, using the project's business vocabulary: **section** (sometimes called "canton"), **span**, **support**.

---



## Bug #447 — Application freeze when changing span

**Affected component**: `src/app/features/studio/loads/presentation/components/span/span.component.ts`

**Fix branch**: `fixbug/freeze-app-when-switch-span-in-charge`

### Symptom

The entire application would freeze as soon as the user selected a value in the span selector of the loads panel.


### Identified causes

Three distinct issues combined to cause this behavior.

---



#### Cause 1 — Unintentional reactive dependency on `section()` in an `effect`

In the project, a **section** (sometimes called "canton") groups several **spans**, and each span is delimited by two **supports**. Any function called inside an `effect()` body that reads an Angular signal will register that signal as a **reactive dependency** of the effect — even if this is not the intended behavior.

In `spanSelectEffect`, the methods `getSupportIndex()` and `getSupportOptions()` of `PlotService` read `section()` internally. Angular therefore registered `section()` as a dependency of the effect. However, `section()` is updated on every Dexie emission (with a new reference object, even if the data is identical), which caused `spanSelectEffect` to reload in a loop, freezing the app.

```typescript
// INCORRECT — section() is registered as a dependency of the effect
private readonly spanSelectEffect = effect(() => {
  const value = this.spanSelectSignal();
  const index = this.plotService.getSupportIndex(value); // reads section() internally
});

// CORRECT — untracked() isolates the signal read
private readonly spanSelectEffect = effect(() => {
  const value = this.spanSelectSignal();
  const index = untracked(() => this.plotService.getSupportIndex(value));
});
```

> **Rule**: Use `untracked(() => fn())` to call functions that read signals (e.g. `section()`, `span()`, `support()`) when you do not want those signals to trigger the effect.

---


#### Cause 2 — `enable()` without `{ emitEvent: false }` triggers unwanted reactive effects

`AbstractControl.enable()` emits on `valueChanges` by default. If a signal was created with `toSignal(control.valueChanges)`, enabling the control updates the signal with the control's current value (which may be stale), triggering reactive effects at the wrong time.

In the business context, this can impact the selected **span** or the current **support** control.

```typescript
// INCORRECT — emits on valueChanges, updates the signal with a stale value
this.form.controls.referenceSpan.enable();

// CORRECT — enables the control for user interaction without triggering the reactive chain
this.form.controls.referenceSpan.enable({ emitEvent: false });
```

> **Rule**: Always pass `{ emitEvent: false }` to `enable()` and `disable()` when a `toSignal` signal is subscribed to the control's `valueChanges` (e.g. for a **span** or **support** field), unless the emission is intentional.

---


#### Cause 3 — A single `effect` for multiple signals causes data corruption

An `effect()` that reads N signals (for example, several fields related to section, span, or support) will trigger when **any** of them changes, and then processes **all** signals together. If some signals have stale values (because `setValue(..., { emitEvent: false })` does not update them), this can overwrite correct data with incorrect values.

```typescript
// INCORRECT — a single effect reads all 4 signals; if the span changes,
// the other 3 fields are still updated with their stale values
private readonly spanControlsEffect = effect(() => {
  Object.keys(this.spanControlSignals).forEach((controlName) => {
    const value = this.spanControlSignals[controlName]();
    if (value !== undefined) this.onSpanControlChange(controlName, value);
  });
});

// CORRECT — one effect per control, each only updates its own field
private readonly spanPositionEffect = effect(() => {
  const value = this.spanControlSignals.spanPosition();
  if (value !== undefined) this.onSpanControlChange('spanPosition', value);
});

private readonly supportEffect = effect(() => {
  const value = this.spanControlSignals.support();
  if (value !== undefined) this.onSpanControlChange('support', value);
});

// etc.
```

> **Rule**: Create a separate `effect()` per signal (section, span, support, etc.) when each change should trigger an independent action. Avoid grouping distinct logic in a single effect.

---

### Summary of applied fixes

| # | Problem | Fix |
|---|---------|-----|
| 1 | `section()` registered as an unintended dependency | `untracked()` around calls to `getSupportIndex()` and `getSupportOptions()` |
| 2 | `enable()` triggers reactive effects with stale value | `enable({ emitEvent: false })` on span/support controls |
| 3 | One effect for N signals overwrites data with stale values | Separate effects for each business signal (section, span, support, etc.) |
