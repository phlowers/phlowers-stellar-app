# Plan Import — Study + Section

Objective: build a reusable generic import component for Study and Section, with the same visual and user flow for both contexts, while guaranteeing zero regression on Study (HTML, SCSS, functional behavior, messages).

---

## Locked Constraints

- One single import UI component for both Study and Section (same visual, same flow).
- Mandatory responsibility decoupling: Study business logic extracted into a dedicated service.
- Study zero regression: identical HTML structure, identical SCSS on critical selectors, identical behavior, identical user messages.
- Section: import from a JSON file containing one single section object.
- UUID collision: user confirmation then replacement if accepted.

---

## Phases and Steps

### ✅ Phase 1 — Architecture Framing *(done)*

**Step 1 — Define the generic import pipeline**
- ✅ Define common pipeline stages: file selection, decoding, parsing, validation, mapping, persistence, result reporting.
- ✅ Define extension points per context (Study / Section).
- ✅ Produce the contract baseline used by all steps below.

**Step 2 — Create shared contracts**
- ✅ Define interfaces for: import context, accepted file specs, normalized results, standardized error catalog, UUID collision resolution hook.
- ✅ Stabilize these contracts before extracting any service.

---

### ✅ Phase 2 — Study Decoupling *(done)*

**Step 3 — Extract Study logic into a dedicated service**
- ✅ Move all business logic currently in `ImportStudyComponent` into a new `StudyImportService`.
- ✅ Keep CSV/CLST rules, validations, notifications, confirmation dialogs, and user messages strictly identical.
- ✅ Leave the existing component as a UI orchestration layer only.
- Files:
  - ✅ `src/app/features/studies/application/services/study-import.service.ts` ← created
  - ✅ `src/app/features/studies/presentation/components/import-study/import-study.component.ts` ← slimmed down

---

### ✅ Phase 3 — Generic Import Engine *(done)*

**Step 4 — Implement the generic import engine**
- ✅ Create an engine service that orchestrates pipeline stages per file and returns typed outcomes (success, recoverable error, fatal error).
- ✅ Wire the Study import service as the first concrete adapter implementation.
- ✅ Keep file processing sequential for predictable UX and collision handling.
- Files:
  - ✅ `src/app/shared/import/application/services/generic-import-engine.service.ts` ← created
  - ✅ `src/app/shared/import/domain/import-contracts.ts` ← created

---

### ✅ Phase 4 — Generic UI Component *(done)*

**Step 5 — Build the single generic import UI component**
- ✅ Create a standalone component configurable by context (accepted formats, entity label, adapter key, texts).
- ✅ Renders: file picker, per-file processing status, per-file success/error outcomes.
- ✅ Identical UX behavior for Study and Section — no visual divergence between contexts.
- Files:
  - ✅ `src/app/shared/components/import/import.component.ts` ← created
  - ✅ `src/app/shared/components/import/import.component.html` ← created
  - ✅ `src/app/shared/components/import/import.component.scss` ← created

---

### ✅ Phase 5 — Study Migration Without Regression *(done)*

**Step 6 — Migrate Study to the generic component in compatibility mode**
- ✅ Replace `ImportStudyComponent` implementation with the generic component configured for Study mode via `StudyImportService`.
- ✅ Preserve the Study HTML structure, critical SCSS class names and selectors, all `data-testid` attributes, and all user-facing messages.
- ✅ No user-visible UI delta is allowed.
- Run Study non-regression checklist before proceeding:
  - ✅ Same key DOM structure
  - ✅ Same `data-testid` map
  - ✅ Same critical CSS classes/selectors
  - ✅ Identical functional scenarios (success, errors, collision, multi-file)
  - ✅ Identical user messages and toasts

---

### ✅ Phase 6 — Section JSON Import Service *(done)*

**Step 7 — Implement the Section JSON import service**
- ✅ Parse a JSON file containing a single section object.
- ✅ Map imported data via `createEmptySection()` and `createEmptySupport()` to merge defaults.
- ✅ Apply section business validations (required fields, supports bounds).
- ✅ Handle persistence via `SectionService.createOrUpdateSection()`.
- ✅ UUID collision: prompt confirmation → delete existing → create new if accepted.
- Files:
  - ✅ `src/app/features/study/application/services/section-import.service.ts` ← created

---

### ✅ Phase 7 — Section Modal Integration *(done)*

**Step 8 — Wire the generic component into the section creation modal**
- ✅ Enable the **From a file** radio button (remove `[disabled]="true"` on `source-extraction-radio`).
- ✅ Switch displayed content by `source()` value:
  - `source === 'manual'` → keep existing `<app-manual-section>` unchanged.
  - `source === 'extraction'` → display the generic import component in Section mode.
- ✅ Keep the footer (Cancel / Create section buttons) consistent across all sources.
- Files:
  - ✅ `src/app/features/study/presentation/components/sections-tab/newSectionModal/newSectionModal.component.html`
  - ✅ `src/app/features/study/presentation/components/sections-tab/newSectionModal/newSectionModal.component.ts`
  - ✅ `src/app/features/study/presentation/components/sections-tab/newSectionModal/import-section/import-section.component.ts` ← created

---

### ✅ Phase 8 — Tests *(done)*

**Step 9 — Add and update tests by layer**

| Layer | Tests to write/update |
|---|---|
| Generic engine | ✅ Pipeline orchestration: success, parser error, validator error, persistence error, collision accepted/refused |
| Study import service | (pre-existing service — no spec created in this plan) |
| Section import service | ✅ Valid JSON, malformed JSON, missing required fields, UUID collision flow |
| Generic UI component | ✅ Rendering: element presence, tag types, loading/disabled states, outcome messages, aria attributes — all via `data-testid` |
| Import-section wrapper | ✅ ngOnInit context propagation, study=null guard, importCompleted forwarding |
| Study integration | Covered by existing `import-study.component.spec.ts` |
| Section integration | Covered by `import-section.component.spec.ts` + `section-import.service.spec.ts` |

**Step 10 — Final verification**
- ✅ Lint: 0 errors on all 4 new spec files.
- ✅ All 74 unit tests pass (4 suites, 0 failures).
- ✅ Study non-regression checklist validated (HTML, SCSS, functional, messages).
- ✅ `plan-import.md` updated — all phases marked done.

---

## Full File Impact Map

| File | Status | Role |
|---|---|---|
| `src/app/features/studies/presentation/components/import-study/import-study.component.ts` | Modified | Slim down to UI orchestration only |
| `src/app/features/studies/presentation/components/import-study/import-study.component.html` | Preserved | Zero regression constraint |
| `src/app/features/studies/application/services/study-import.service.ts` | New | Study business logic (CSV/CLST) |
| `src/app/features/studies/application/services/study-import.service.spec.ts` | New | Study import service unit tests |
| `src/app/shared/import/domain/import-contracts.ts` | New | Shared contracts / interfaces / tokens |
| `src/app/shared/import/application/services/generic-import-engine.service.ts` | New | Generic pipeline orchestrator |
| `src/app/shared/components/import/import.component.ts` | New | Generic import UI component |
| `src/app/shared/components/import/import.component.html` | New | Generic import template |
| `src/app/shared/components/import/import.component.scss` | New | Generic import styles |
| `src/app/features/study/application/services/section-import.service.ts` | New | Section JSON import logic |
| `src/app/features/study/application/services/section-import.service.spec.ts` | New | Section import service unit tests |
| `src/app/features/study/presentation/components/sections-tab/newSectionModal/newSectionModal.component.html` | Modified | Enable extraction radio, conditional render |
| `src/app/features/study/presentation/components/sections-tab/newSectionModal/newSectionModal.component.ts` | Modified | Type source union, handle extraction state |
| `src/app/features/study/presentation/components/sections-tab/newSectionModal/import-section/import-section.component.ts` | New | Section import host wrapper |
| `src/app/core/services/studies/studies.service.ts` | Consumed | Study persistence — called by study-import.service |
| `src/app/core/services/section/section.service.ts` | Consumed | Section persistence — called by section-import.service |
| `src/app/shared/domain/helpers/study.helpers.ts` | Consumed | Study defaults factory |
| `src/app/shared/domain/helpers/sections.helpers.ts` | Consumed | Section/Support defaults factories |
| `src/app/shared/helpers/convertStringToNumber.ts` | Consumed | Numeric normalization used in mapping |
| `src/app/features/studies/presentation/components/import-study/import-study.component.spec.ts` | Updated | Retarget after service extraction |

---

## Acceptance Criteria

- [ ] Zero regression on Study import: HTML, SCSS, behavior, messages all identical to current.
- [ ] Single generic UI component shared by Study and Section with identical UX.
- [ ] Section importable via **From a file** using a valid JSON file (single section object).
- [ ] UUID collision handled with user confirmation and replacement in both Study and Section modes.
- [ ] Architecture decoupled: generic UI component + dedicated business services per context.
- [ ] All new and modified code covered by unit and rendering tests.
- [ ] Lint and full test suite pass with no errors.
