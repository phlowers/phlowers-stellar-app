# Loads Table PDF Report Service

## Overview

The `LoadsReportService` generates PDF reports of charge cases ("Tableau de charges"). It extends `PdfBaseService` and converts charge data (climate, loads, modifications, manipulations) into a downloadable PDF document.

## Current State

- ✅ Service structure (`LoadsReportService`)
- ✅ Data interfaces (`LoadsReportData`, `LoadsReportLabels`, etc.)
- ✅ Translation key definitions (`PDF_LOADS_LABEL_KEYS`)
- ✅ Page 1 layout implementation (`drawLoadsReportPage1()`) — charge case, climate, loads/markings, cable modifications, support manipulations and span manipulations, with automatic page breaks
- ✅ i18n keys in `public/i18n/en.json` and `public/i18n/fr.json`
- ✅ Unit tests (`loads-data-report.service.spec.ts`)
- ❌ Not yet wired to a UI trigger (see "Activate in LoadsTableComponent" below)

## Page 1 Layout

`drawLoadsReportPage1()` (in `loads-data-report.helpers.ts`) draws, in order:

1. Header (report title, app name, date)
2. Charge case bullets (name, description, personnel presence)
3. Climate bullets — wind pressure, cable temperature, ice indicator, and either the symmetric
   ice thickness or the dis-symmetric frontier support / ice thickness before/after, depending on
   `data.climate.frontierSupportNumber`
4. Loads and markings table (only if `data.spanLoads.length > 0`)
5. Cable length modifications table (only if `data.cableModifications.length > 0`)
6. Support manipulations table (only if `data.supportManipulations.length > 0`)
7. Span manipulations table (only if `data.spanManipulations.length > 0`)

Each table is drawn by a local generic grid table renderer (equal-width bordered columns, up to
two wrapped lines per cell) that automatically starts a new portrait page — redrawing the header
and column headers — whenever a row would overflow the bottom margin.

## How to Complete This Feature

### 1. Activate in LoadsTableComponent

In `loads-table.component.ts`, inject the service and enable the report button:

```typescript
export class LoadsTableComponent {
  private readonly loadsReportService = inject(LoadsReportService);

  async reportChargeCase(): Promise<void> {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.spanService.section()?.uuid;
    const uuid = this.chargeUuid();

    if (!studyUuid || !sectionUuid || !uuid) return;

    const reportData: LoadsReportData = {
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

    await this.loadsReportService.generateReport(reportData);
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

## Data Flow

```
LoadsTableComponent
    ↓ (build LoadsReportData)
LoadsReportService.generateReport()
    ↓ (preload fonts, create doc)
drawLoadsReportPage1()
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
- `pdf-table.helpers.ts` — transposed metric table utilities (result tables)
- `pdf-primitives.helpers.ts` — common PDF primitives (fonts, footers, bullets, etc.)
- `pdf-layout.constantes.ts` — PDF layout constants (margins, spacing, etc.)


## Related User Stories

- **US.CHG.TAB** — "Consulter le tableau de charges d'un cas de charges" (View charges table)
  - RG.CHG.RAP-BTN.1: Report button is currently inactive ("Inactif") in the current phase
  - Future phase: Implement report generation via this service
