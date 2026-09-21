# Charges Table PDF Report Service

## Overview

The `ChargesReportService` is a skeleton service for generating PDF reports of charge cases ("Tableau de charges"). It extends `PdfBaseService` and provides infrastructure for converting charge data (climate, loads, modifications, manipulations) into a downloadable PDF document.

## Current State

This is a **work-in-progress foundation** that includes:

- ✅ Service structure (`ChargesReportService`)
- ✅ Data interfaces (`ChargesReportData`, `ChargesReportLabels`, etc.)
- ✅ Translation key definitions (`PDF_CHARGES_LABEL_KEYS`)
- ✅ Helper function skeleton (`drawChargesReportPage1()`)
- ✅ Test file scaffold (`charges-data-report.service.spec.ts`)
- ❌ PDF layout implementation (not yet implemented)
- ❌ i18n keys in `public/i18n/en.json` and `public/i18n/fr.json` (to be added)

## How to Complete This Feature

### 1. Add i18n Keys

In `public/i18n/en.json` and `public/i18n/fr.json`, add:

```json
{
  "studio.charges-report": {
    "title": "Load Case Report",
    "charge-title": "Load Case",
    "climate-title": "Climate Conditions",
    "loads-title": "Loads and Markings",
    "cable-modif-title": "Cable Length Modifications",
    "support-manip-title": "Support Manipulations",
    "span-manip-title": "Span Manipulations",
    "page-label": "Page",
    "charge-name-label": "Load Case Name",
    "charge-description-label": "Description",
    "personnel-presence-label": "Personnel Presence",
    "report-generated-success": "Charges report generated successfully",
    "report-generation-failed": "Failed to generate charges report"
  }
}
```

### 2. Implement `drawChargesReportPage1()`

In `charges-data-report.helpers.ts`, implement the layout:

```typescript
export function drawChargesReportPage1(
  doc: jsPDF,
  data: ChargesReportData,
  labels: ChargesReportLabels
): void {
  // 1. Draw title header
  // 2. Draw charge case section (name, description, personnel presence)
  // 3. Draw climate table (always present per RG.CLI.CAD.1)
  // 4. Draw loads table (if data.spanLoads.length > 0)
  // 5. Draw cable modifications table (if data.cableModifications.length > 0)
  // 6. Draw support manipulations table (if data.supportManipulations.length > 0)
  // 7. Draw span manipulations table (if data.spanManipulations.length > 0)
}
```

Refer to `SectionDataReportService` and `pdf-table.helpers.ts` for table drawing patterns.

### 3. Activate in LoadsTableComponent

In `loads-table.component.ts`, inject the service and enable the report button:

```typescript
export class LoadsTableComponent {
  private readonly chargesReportService = inject(ChargesReportService);

  async reportChargeCase(): Promise<void> {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.spanService.section()?.uuid;
    const uuid = this.chargeUuid();

    if (!studyUuid || !sectionUuid || !uuid) return;

    const reportData: ChargesReportData = {
      date: new Date().toLocaleString(),
      chargeName: this.name(),
      chargeDescription: this.description(),
      personnelPresence: this.personnelPresence(),
      climate: {
        windPressure: this.climate()?.windPressure ?? null,
        cableTemperature: this.climate()?.cableTemperature ?? null,
        symmetryType: this.climate()?.symmetryType ?? '',
        iceThickness: this.climate()?.iceThickness ?? null,
        frontierSupportNumber: this.climate()?.frontierSupportNumber ?? null,
        iceThicknessBefore: this.climate()?.iceThicknessBefore ?? null,
        iceThicknessAfter: this.climate()?.iceThicknessAfter ?? null
      },
      spanLoads: this.spanLoadRows(),
      cableModifications: this.cableModifRows(),
      supportManipulations: this.supportManipRows(),
      spanManipulations: this.spanManipRows()
    };

    await this.chargesReportService.generateReport(reportData);
  }
}
```

In the template, change the Report button from `disabled` to active:

```html
<button
  app-btn
  type="button"
  btnStyle="text"
  (click)="reportChargeCase()"
  data-testid="report-btn"
>
  <app-icon icon="description" />
  <ng-container>{{ 'common.report' | transloco }}</ng-container>
</button>
```

### 4. Add/Update Tests

In `charges-data-report.service.spec.ts`, add tests for:

- PDF document structure and page layout
- Correct translation key resolution
- File download behavior
- Edge cases (empty tables, special characters in filenames, etc.)

## Data Flow

```
LoadsTableComponent
    ↓ (build ChargesReportData)
ChargesReportService.generateReport()
    ↓ (preload fonts, create doc)
drawChargesReportPage1()
    ↓ (draw sections)
drawPageFooters()
    ↓ (add page numbers)
doc.save(filename)
    ↓
Download PDF to user
```

## Key Design Patterns

- **Inheritance**: Extends `PdfBaseService` to reuse font preloading and doc creation
- **Translation**: Uses `buildReportLabels()` for i18n key resolution
- **Error Handling**: Uses `generatePdfReport()` wrapper for consistent error/success messaging
- **File Naming**: Uses `sanitizeFilenamePart()` to ensure valid PDF filenames

## References

- `SectionDataReportService` — similar report service pattern
- `pdf-table.helpers.ts` — table drawing utilities
- `pdf-primitives.helpers.ts` — common PDF primitives (fonts, footers, etc.)
- `pdf-layout.constantes.ts` — PDF layout constants (margins, spacing, etc.)

## Related User Stories

- **US.CHG.TAB** — "Consulter le tableau de charges d'un cas de charges" (View charges table)
  - RG.CHG.RAP-BTN.1: Report button is currently inactive ("Inactif") in the current phase
  - Future phase: Implement report generation via this service
