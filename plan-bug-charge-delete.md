# Plan: Fix "Poubelle" icon — delete span load only, not the entire load case

## Bug description

**Bug 1 — "Poubelle" in "Charge / Marquage" tab deletes the entire load case**

In the "Charge / Marquage" tab of load case #2 with span "4 - 5" selected, clicking the trash icon:

- **Actual**: Load case #2 is entirely deleted. The canton state is updated with load case #1.
- **Expected**: Only the charge saved for span "4 - 5" in the "Charge / Marquage" tab is deleted. The canton state is updated with the modified load case #2.

**Bug 2 — Deleting a load case sets the selected load case to the first remaining one instead of resetting to null**

When the user explicitly deletes load case #2 (e.g. from the menu bar), the canton state must revert to the initial condition without any load case — not switch to another load case.

- **Actual**: `selected_charge_uuid` is set to the first remaining charge UUID.
- **Expected**: `selected_charge_uuid` is set to `null`. The load case list shows "Select a load case".

---

## Files to modify

| File | Change |
|---|---|
| `src/app/features/studio/loads/presentation/services/loadForms.service.ts` | Add `deleteSpanLoad(supportUuid: string): void` |
| `src/app/features/studio/loads/presentation/components/load-marking/load-marking.component.ts` | Refactor `deleteCharge()` — use `deleteSpanLoad` + calculate + save flow |
| `src/app/core/services/charges/charges.service.ts` | Fix `deleteCharge()` — always set `selected_charge_uuid = null` |
| `src/app/features/studio/loads/presentation/services/loadForms.service.spec.ts` | Add `describe('deleteSpanLoad', ...)` tests |
| `src/app/features/studio/loads/presentation/components/load-marking/load-marking.component.spec.ts` | Update `describe('deleteCharge', ...)` tests |
| `src/app/core/services/charges/charges.service.spec.ts` | Update test expecting `charges[0].uuid` → `null` |
| `deadcode.md` | Log `deleteLoad()` in `loadForms.service.ts` as potentially dead code |

---

## Phase 1 — New behavior of the "Poubelle" button in the component

### Step 1 — Add `deleteSpanLoad(supportUuid: string): void` in `loadForms.service.ts`

- Find the `SpanLoad` in `plotService.temporaryLoadData.spanLoads` by `supportUuid`
- If found, reset its values in-place to `{ ...emptySpanLoad, supportUuid }`
- Guard: early return if `temporaryLoadData` is null or if the `SpanLoad` is not found

```typescript
deleteSpanLoad(supportUuid: string): void {
  const temporaryLoadData = this.plotService.temporaryLoadData;
  if (!temporaryLoadData) return;

  const spanLoad = temporaryLoadData.spanLoads.find((s) => s.supportUuid === supportUuid);
  if (!spanLoad) return;

  const reset = { ...emptySpanLoad, supportUuid };
  Object.assign(spanLoad, reset);
}
```

### Step 2 — Refactor `deleteCharge()` in `load-marking.component.ts`

- Make the method `async`
- Get `spanUuid = this.form.controls.spanSelect.value` — early return if null
- Call `this.loadFormsService.deleteSpanLoad(spanUuid)`
- Call `await this.loadFormsService.calculateLoad()`
- Call `await this.loadFormsService.saveTemporaryLoadDataInSection()`
- Call `this.resetForm()`
- Remove the call to `this.loadFormsService.deleteLoad()`

```typescript
async deleteCharge(): Promise<void> {
  const spanUuid = this.form.controls.spanSelect.value;
  if (!spanUuid) return;
  this.loadFormsService.deleteSpanLoad(spanUuid);
  await this.loadFormsService.calculateLoad();
  await this.loadFormsService.saveTemporaryLoadDataInSection();
  this.resetForm();
}
```

---

## Phase 2 — Fix `deleteCharge` in the charges service

### Step 3 — Fix `deleteCharge()` in `charges.service.ts`

Change:
```typescript
// Before (incorrect)
if (section.selected_charge_uuid === chargeUuid) {
  section.selected_charge_uuid = section.charges[0]?.uuid ?? null;
}
```

To:
```typescript
// After (correct)
if (section.selected_charge_uuid === chargeUuid) {
  section.selected_charge_uuid = null;
}
```

This applies globally: deleting a selected load case from the menu bar will also produce `null`, causing the UI to revert to the initial condition without any active load case.

---

## Phase 3 — Update unit tests

### Step 4 — `loadForms.service.spec.ts` (depends on Step 1)

Add `describe('deleteSpanLoad', ...)` with the following cases:

- Early return if `temporaryLoadData` is null → `spanLoads` not mutated
- Early return if `supportUuid` is not found in `spanLoads`
- Resets the SpanLoad values to `emptySpanLoad` when found (preserving `supportUuid`)

### Step 5 — `load-marking.component.spec.ts` (depends on Step 2)

Update `describe('deleteCharge', ...)`:

- Add `deleteSpanLoad: vi.fn()` mock in `mockLoadFormsService`
- Remove check that `deleteLoad` is called
- Add case: no span selected → nothing is called (early return)
- Add case: span selected → `deleteSpanLoad`, `calculateLoad`, `saveTemporaryLoadDataInSection` called in order
- Test that the form is reset after deletion

### Step 6 — `charges.service.spec.ts` (depends on Step 3)

Update the test:
- Rename `'should set selected_charge_uuid to the first remaining charge when deleting selected charge'`
  → `'should set selected_charge_uuid to null when deleting the selected charge'`
- Change expected value from `'charge-uuid-2'` to `null`

---

## Phase 4 — Dead code tracking

### Step 7 — `deadcode.md`

Add an entry for `deleteLoad()` in `loadForms.service.ts`:
- After this fix, `deleteLoad()` is no longer called by the component.
- It should be logged as pending review — only the user can authorize deletion.

---

## Verification checklist

- [ ] Select span "4 - 5" in the "Charge / Marquage" tab of load case #2 → click "Poubelle" → only the span load for "4 - 5" is reset, load case #2 remains active with its values for other spans
- [ ] The 3D view updates (calculateLoad + saveTemporaryLoadDataInSection called)
- [ ] Delete a load case from the menu bar → `selected_charge_uuid` becomes `null` → the list shows "Select a load case" and the canton state reverts to the initial condition
- [ ] `npm run test` — all tests pass

---

## Decisions

- `deleteLoad()` in `LoadFormsService` is **kept** (logged as dead code) — only the user can authorize deletion per project policy.
- `resetForm()` remains unchanged — it calls `initTemporaryLoadData()` which is idempotent and will re-trigger via the effect after save anyway.
- The fix to `charges.service.ts` is intentionally global: any deletion of the selected load case now produces `null` (consistent with the ticket note).
