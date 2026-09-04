# TODO — Number inputs out of scope (patterns E, F, G)

Context: audit performed on branch `778-efforts-values-must-be-limited-to-one-decimal`
(diff vs `origin/dev`) while unifying number-input validation/error messages for patterns
A/B/C/D. The patterns below are explicitly **out of scope** for that work and left for a
later ticket. Do not delete this file silently — see `deadcode.md` policy equivalent for
scope tracking.

## Pattern E — Custom signals, no Angular Forms

**Files**: `src/app/features/study/presentation/components/sections-tab/newSectionModal/manualSection/location/location.component.ts`
(+ `.html`, `.constantes.ts`, `.interfaces.ts`)

**Current state**: `linkedSignal<string>` mirrors the DOM value as text, `computed()` signals
(`isLatitudeOverMax`, `isLatitudeUnderMin`, etc.) manually compare against `LOCATION_CONFIG`
bounds. Its own `LOCATION_ERROR_IDS` map drives `aria-errormessage`. Only
`common.out-of-bound-error` is used (soon to be replaced) — no decimal-count validation at all.

**Important**: `public/i18n/en.json`/`fr.json` still carry the legacy `common.out-of-bound-error`
key (merged min+max message) solely because this component still uses it — it was **not**
removed during the Transloco cleanup pass for patterns A–D to avoid a regression here. Remove
`common.out-of-bound-error` only once this component is migrated to the 3 unified messages.


**Suggested future migration**:
- Convert `latitude`/`longitude`/`azimuth` to `FormControl<number>` with
  `Validators.min`/`Validators.max` + the shared `maxDecimalsValidator`.
- Requires resolving the string↔number round-trip currently handled by the `linkedSignal`
  (needed so an in-progress keystroke, e.g. `"12."`, isn't clobbered by re-render) — likely via
  a custom `ControlValueAccessor` or careful `updateOn: 'blur'`/`'change'` strategy.
- Reuse the 3 unified messages/keys once patterns A–D are merged.

## Pattern F — `app-input-number` (atoms), silent clamp stepper

**Files**: `src/app/shared/components/atoms/input-number/input-number.component.ts`
(+ `.html`, `.scss`). Used by `pose-table.component.html` and `scale-view.component.html`.

**Current state**: `ControlValueAccessor` that silently clamps the written/typed value into
`[min, max]` (no decimal handling, no error message emitted — by design, this is a stepper-style
control, not a free-text field with validation feedback).

**Decision (2026-09-04)**: kept out of scope — the silent-clamp UX is intentionally different
from the validation-message UX used everywhere else.

**Suggested future migration** (if the UX is ever revisited — needs a product/UX decision, not
just a dev one):
- Option A: keep the silent clamp, but also round to a fixed decimal count consistently.
- Option B: replace the silent clamp with the same 3 unified error messages as patterns A–D, for
  UX consistency across the app.

## Pattern G — Unvalidated `type="number"` (plain `ngModel`, no Angular validators)

**Files**:
- `src/app/features/studio/distance-measuring/distance-measuring.component.html` — no
  `min`/`max`/`step` attributes at all, no Angular validation.
- `src/app/features/studio/field-measuring/presentation/components/calculus-setting/papoto/papoto.component.html`
- `src/app/features/studio/field-measuring/presentation/components/field-datas/field-datas.component.html`
- `src/app/features/studio/field-measuring/presentation/components/header/header.component.html` —
  has native HTML5 `min`/`max`/`step` attributes (e.g. `step="0.00000001"`, `min="-180"`,
  `max="180"`) but this is browser-level validation only; no Angular validator, no app error
  message.
- `src/app/features/studio/field-measuring/presentation/components/temperature-calculation/temperature-calculation.component.html`
- `src/app/features/studio/field-measuring/presentation/components/parameter-calculation-15-without-wind/parameter-calculation-15-without-wind.component.html`
- `src/app/features/studio/obstacles/presentation/components/obstaclesForm/obstaclesForm.component.html`
  (+ verify `@services/obstacles-form/obstaclesForm.service.ts`, not yet audited in detail)

**Current state**: plain `[(ngModel)]` bindings, most without any bound, some with native HTML5
attributes only.

**Suggested future migration**:
- Introduce Reactive Forms (or at minimum the shared `maxDecimalsValidator` + explicit
  `Validators.min`/`Validators.max`) with the 3 unified messages, matching pattern A.
- Min/max/decimal bounds are not currently documented for several of these fields (e.g. field
  measuring angles/distances) — needs business-rule input before implementation, not just a dev
  guess.

## Follow-up

- Re-run this audit once patterns A/B/C/D are merged, so E/F/G reuse the finalized shared
  validator (`maxDecimalsValidator`) and the finalized Transloco keys
  (`common.min-value-error` / `common.max-value-error` / `common.max-decimals-error`).
