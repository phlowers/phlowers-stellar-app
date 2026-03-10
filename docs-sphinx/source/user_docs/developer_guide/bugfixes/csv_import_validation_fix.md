# CSV Import Validation Fix (PR #594)

:::{admonition} Bug #593
:class: warning

When importing a Proto V4 CSV file, the "Update section" button remained disabled even with valid data, preventing section editing after import.
:::

## Context

The Stellar application allows importing sections from CSV files in Proto V4 format. A critical bug prevented section editing after import due to silent validation errors.

## Issues Identified

### 1. Last Support Validation

**Symptom**: The "Update section" button remains grayed out after importing a valid CSV.

**Root Cause**: The last support in a section had `spanLength = 0` in the CSV (normal since there's no next span), but the validator considered this an error because the value was below the 5m minimum.

**Solution**: 
```typescript
// Before (line 287+)
const spanLength = support.portée;

// After
let spanLength: number | null = null;
if (!isLastSupport) {
  if (hasInvalidSpanLength) {
    console.warn(/* ... */);
  } else if (support.portée < 5 || support.portée > 5000) {
    console.warn(/* ... */);
    spanLength = Math.min(5000, Math.max(5, support.portée));
  } else {
    spanLength = support.portée;
  }
}
// Last support automatically has spanLength = null
```

### 2. NaN/Infinity Values Not Detected

**Symptom**: Non-numeric CSV values could bypass validation.

**Root Cause**: `NaN < min` and `NaN > max` both return `false`, allowing `NaN` to pass bounds validation.

**Solution**: Added explicit check before bounds validation.
```typescript
// Check for NaN/Infinity
if (!Number.isFinite(value)) {
  console.warn(
    `CSV Import Warning: Support ${supportIndex + 1} (${supportNumber || 'N/A'}) - ` +
      `${fieldName} = ${value} is not a finite number (NaN or Infinity). Converted to null.`
  );
  return null;
}
```

### 3. Inconsistency Between attachmentHeight and supportFootAltitude

**Symptom**: For out-of-bounds values (e.g., `alt_acc = 10000`), `attachmentHeight` was clamped to 9000 but `supportFootAltitude` was calculated from the raw value (9970 instead of 8970).

**Root Cause**: `supportFootAltitude` was calculated from raw `support.alt_acc`, not from validated `attachmentHeight`.

**Solution**: Calculate `supportFootAltitude` from the validated value.
```typescript
// Before
const baseAltitude = support.alt_acc && support.alt_acc - 30 > 0 ? support.alt_acc - 30 : 0;
attachmentHeight: validateSupportField('attachmentHeight', support.alt_acc, ...),
supportFootAltitude: validateSupportField('supportFootAltitude', baseAltitude, ...)

// After
const attachmentHeight = validateSupportField('attachmentHeight', support.alt_acc, ...);
const supportFootAltitude = attachmentHeight != null && attachmentHeight - 30 > 0 
  ? attachmentHeight - 30 
  : 0;
```

### 4. Error Messages vs Warnings

**Symptom**: Non-fatal warnings were emitted with `console.error` and an emoji, unlike real errors in the rest of the codebase.

**Solution**: Use `console.warn` for automatic corrections (clamping) and remove emojis to facilitate log searching.
```typescript
// Before
console.error(`⚠️ CSV Import Warning: ...`);

// After
console.warn(`CSV Import Warning: ...`);
```

### 5. Performance - Repeated Reallocation

**Symptom**: The `limits` object was recreated on every `validateSupportField()` call (7 times per support).

**Solution**: Extract limits table as a module-level constant.
```typescript
// Before (in validateSupportField)
const limits: Record<string, { min: number; max: number }> = {
  spanAngle: { min: -200, max: 200 },
  // ... 8 fields
};

// After (module level)
const SUPPORT_FIELD_LIMITS: Record<string, { min: number; max: number }> = {
  spanAngle: { min: -200, max: 200 },
  // ... 8 fields
};
```

For 100 supports: **700 allocations avoided**.

## Validation Limits

Numeric fields are now validated with the following limits:

| Field | Minimum | Maximum | Unit |
|-------|---------|---------|------|
| `spanLength` | 5 | 5000 | m |
| `spanAngle` | -200 | 200 | ° |
| `attachmentHeight` | -100 | 9000 | m |
| `armLength` | -50 | 50 | m |
| `chainLength` | 0 | 15 | m |
| `chainWeight` | 0 | 5000 | kg |
| `counterWeight` | 0 | 5000 | kg |
| `chainSurface` | 0 | 9.99 | m² |
| `supportFootAltitude` | -150 | 9000 | m |

## Log Messages

Warnings now follow this format:
```
CSV Import Warning: Support <n> (<nom>) - <champ> = <valeur> is out of bounds [<min>, <max>]. Value will be clamped.
```

Examples:
```
CSV Import Warning: Support 6 (S6) has invalid spanLength: 0. Expected value between 5-5000m. Converted to null.
CSV Import Warning: Support 1 (S1) - attachmentHeight = 10000 is out of bounds [-100, 9000]. Value will be clamped.
CSV Import Warning: Support 2 (S2) - chainLength = NaN is not a finite number (NaN or Infinity). Converted to null.
```

## Tests Added

Full test coverage added in `studies.service.spec.ts`:

- ✅ `derives supportFootAltitude from validated attachmentHeight` - Verifies consistency between the two fields
- ✅ `clamps out of bounds values and logs warnings` - Verifies clamping and logs for out-of-bounds values
- ✅ `handles invalid spanLength for non-last supports` - Verifies special logic for last support
- ✅ `rejects NaN and Infinity values` - Verifies detection of non-finite values

**Result**: 25/25 tests pass in `studies.service.spec.ts`, 54/54 in `import-study.component.spec.ts`.

## Modified Files

### Production Code
- `src/app/core/services/studies/studies.service.ts`
  - Added `SUPPORT_FIELD_LIMITS` constant
  - Added `validateSupportField()` method
  - Refactored `buildSupportsFromProtoV4()`
  - Added validation for `spanLength`

### Tests
- `src/app/core/services/studies/studies.service.spec.ts`
  - Added 4 new validation tests
  - Migrated from `console.error` to `console.warn` in existing tests

## Migration

No action required. The fixes are backward compatible:
- Existing CSV files continue to work
- Out-of-bounds values are automatically corrected
- Console warnings help with debugging

## References

- **Issue**: #593 - "Error validation edit canton after import CSV"
- **PR**: #594 - "[WIP] fix and add controls and logs"
- **Branch**: `fixbug/593/edit-canton-validation-error-after-import-csv`
- **Test CSV file**: `Canton_démo_180326.csv` (6 supports)

## See Also

- {doc}`../app/index` - Application architecture
- Proto V4 format specification
- {doc}`../../obstacles_service` - Imported data validation
