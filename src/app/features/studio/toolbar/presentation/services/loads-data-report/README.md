# Loads Table PDF Report Service

## Overview

`LoadsReportService` generates the "Loads tab" PDF report for a charge case. It extends
`PdfBaseService` (font preloading + document creation) and is triggered from
`LoadsTableComponent.onGenerateReport()`.

## Page 1 — portrait

Drawn by `drawLoadsReportPage1()` (`loads-data-report.helpers.ts`):

1. `drawHeader()` — report title, app name, generation date
2. `drawStudyAndCantonSection()` — cartouche bullets: author, study, study description, canton,
   canton comment, initial condition, charge name, charge description (`-` when empty)
3. `drawClimateSection()` — wind pressure, cable temperature, ice indicator, then either the
   symmetric ice thickness or the dis-symmetric frontier support + ice thickness before/after
   (driven by `climate.symmetryType`), and personnel presence

Each section ends with a horizontal separator and returns the Y used by the next one.

## Following pages — landscape

Result tables are **transposed** (one row per metric, one column per entity, at most 5 columns per
table) and rendered by `drawResultTablesFlow()` (`@shared/pdf/pdf-table.helpers`). Sections are
stacked continuously: a new landscape page is only started when the remaining vertical space is
insufficient.

Four sections, each skipped when its data set is empty:

| Section | Data | Metrics |
|---|---|---|
| Loads and markings | `spanLoads` | `LOADS_METRICS` |
| Cable length modifications | `cableModifications` | `CABLE_MODIF_METRICS` |
| Support manipulations | `supportManipulations` | `SUPPORT_MANIP_METRICS` |
| Span manipulations | `spanManipulations` | `SPAN_MANIP_METRICS` |

All four sections share a single label column width (`computeLabelColWidth()` computed over every
table) so the columns line up from one section to the next.

Footers are added last by `drawPageFooters(doc, labels.pageLabel, true)` — the `true` flag places
page numbers on the landscape footer from page 2 onward.

## Labels

- **Fixed page 1 text and section titles** → `LoadsReportLabels` / `PDF_LOADS_LABEL_KEYS`,
  resolved through `buildReportLabels()`.
- **Result table row labels** → the `labelKey` of each `MetricDescriptor` in
  `loads-data-report.constantes.ts`, resolved by `buildTables()`. They are deliberately *not*
  duplicated in `LoadsReportLabels`.

Cell values coming from an enum (load type, manipulation type, anchoring…) are already translated
by `LoadsTableComponent` before reaching the service: the table renderer prints them as-is.

## File name

`<reportTitle>_<cantonName>_<chargeName>_<date>.pdf`, each part passed through
`sanitizeFilenamePart()`.

## Data Flow

```
LoadsTableComponent.onGenerateReport()
    ↓ builds LoadsReportData (rows already carry translated labels)
LoadsReportService.generateReport()
    ↓ generatePdfReport() wrapper — success / error notifications
drawLoadsReportPage1()                                           → portrait page 1
buildTables() + computeLabelColWidth() + drawResultTablesFlow()   → landscape pages
drawPageFooters()
doc.save(filename)
```

## Key Design Patterns

- **Inheritance**: Extends `PdfBaseService` to reuse font preloading and doc creation
- **Translation**: Uses `buildReportLabels()` for i18n key resolution
- **Error Handling**: Uses `generatePdfReport()` wrapper for consistent error/success messaging
- **File Naming**: Uses `sanitizeFilenamePart()` to ensure valid PDF filenames

## References

- `SectionDataReportService` — similar report service pattern
- `pdf-table.helpers.ts` — transposed metric table utilities (result tables)
- `pdf-primitives.helpers.ts` — common PDF primitives (fonts, footers, bullets, etc.)
- `pdf-layout.constantes.ts` — PDF layout constants (margins, spacing, etc.)


## Related User Stories

- **US.CHG.TAB** — "Consulter le tableau de charges d'un cas de charges" (View charges table)
- **US.CHG.RAP** — charge case report generation
