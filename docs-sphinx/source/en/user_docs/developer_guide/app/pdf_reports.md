# PDF reports

The application generates its PDF reports in the browser with [jsPDF](https://github.com/parallax/jsPDF).
Each report is a service extending `PdfBaseService` that draws the document with the shared helpers of
`src/app/shared/pdf/`. This page describes those helpers and how a report service uses them.

---

## Shared files

| File (`src/app/shared/pdf/`) | Content |
|---|---|
| `pdf-base.service.ts` | `PdfBaseService`: Nunito font loading and document creation |
| `pdf-primitives.helpers.ts` | Headers, footers, section titles, separators, bullet lists, cartouche, value formatting, label resolution, `generatePdfReport()` |
| `pdf-table.helpers.ts` | Transposed result tables: building, measuring, drawing, page flow |
| `pdf-layout.constantes.ts` | Page sizes and margins, line height, font sizes, units, app name |
| `pdf-table.constantes.ts` | Table dimensions: columns per table, row height, padding, gap between tables |
| `pdf-report.interfaces.ts` | Fonts, bullet items, cartouche labels and data, `BaseReportLabels` |
| `pdf-table.interfaces.ts` | `MetricDescriptor`, table models, `PdfResultSection`, flow options |

## Reports using them

| Service | Triggered from | Pages | Result tables drawn with |
|---|---|---|---|
| `SectionDataReportService` | `SectionsTabComponent` | Portrait page 1, landscape tables | `drawResultTablesSection()` |
| `SectionStateReportService` | `StudioPageComponent` | Portrait page 1, landscape tables | `drawResultTablesSection()` |
| `LoadsReportService` | `LoadsTableComponent` | Portrait page 1, landscape tables | `drawResultTablesFlow()` |
| `ObstaclesTableReportService` | `ObstaclesTableComponent` | Portrait page 1, landscape tables | `drawResultTablesFlow()` with the compact header |
| `HangingTableReportService` | `HangingTableComponent` | Portrait only | `drawTable()` |
| `VtlGuyingReportService` | `VtlAndGuyingComponent` | Portrait only, with a diagram image | — |

The report services live in `src/app/features/studio/toolbar/presentation/services/<name>-report/`, split
into `*.service.ts`, `*.helpers.ts` (page drawing), `*.constantes.ts` (metrics and label keys) and
`*.interfaces.ts` (data and labels).

---

## Anatomy of a report service

```typescript
@Injectable({ providedIn: 'root' })
export class ObstaclesTableReportService extends PdfBaseService {
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  async generateReport(data: ObstaclesTableReportData): Promise<void> {
    const translate = (key: string): string => this.translocoService.translate(key);

    await generatePdfReport({
      logger: this.logger,
      notificationService: this.notificationService,
      translate,
      errorLogMessage: 'Failed to generate obstacles table report',
      successKey: 'common.report-generated-successfully-label',
      errorKey: 'common.failed-to-generate-report',
      build: async () => {
        const doc = await this.createDoc();
        const labels = buildReportLabels<ObstaclesTableReportLabels>(translate, PDF_OBSTACLES_TABLE_LABEL_KEYS);

        drawObstaclesReportPage1(doc, data, labels);

        const tables = buildTables(data.rows, OBSTACLES_TABLE_METRICS, translate);
        const labelColWidth = computeLabelColWidth(doc, tables);
        drawResultTablesFlow(
          doc,
          data.date || '-',
          labels.reportTitle,
          [{ title: labels.obstaclesTitle, tables }],
          labelColWidth,
          { compactHeader: true, tableGap: OBSTACLES_TABLES_VERTICAL_GAP }
        );

        drawPageFooters(doc, labels.pageLabel, true);

        return { doc, filename: buildObstaclesReportFilename(labels.reportTitle, data) };
      }
    });
  }
}
```

1. **`createDoc()`** (from `PdfBaseService`) returns an A4 portrait document in millimeters with the
   Nunito font registered. The font files (`fonts/Nunito-*.ttf`) are fetched on the first call and
   cached by the service.
2. **`generatePdfReport()`** runs `build`, saves the document under the returned file name and shows
   the success notification. If `build` throws, it logs the error and shows the error notification:
   the error is never rethrown to the caller.
3. **`buildReportLabels()`** resolves the report's fixed labels through Transloco, from a constant that
   maps each field of the labels interface to its translation key.
4. **Page 1** is drawn by the report's own helpers, from the shared primitives.
5. **Result tables** are built from the rows and drawn on landscape pages.
6. **`drawPageFooters()`** comes last, once the total page count is known.
7. **The file name** joins its parts through `sanitizeFilenamePart()` (`@shared/helpers/filename.helpers`),
   which replaces the characters forbidden in file names (`/ \ : * ? " < > |`) with `-`.

The component that starts the report snapshots the data it displays (rows already translated, date
formatted in the active language), and drives the `[disabled]` and `[btnLoading]` state of its button
from a signal reset in a `finally` block.

---

## Coordinates and the Y convention

- Every position and size is in **millimeters**. A4 portrait is 210 × 297 (`PAGE_SIZE`), landscape is
  297 × 210 (`LANDSCAPE_PAGE`). Content starts at `PAGE_MARGIN` (top 10, right 15, bottom 15, left 15).
- Every drawing function takes the Y where it starts and **returns the Y where the next element
  starts**, so a page is drawn by chaining calls:

  ```typescript
  let y = drawHeader(doc, data.date || '-', labels.reportTitle);
  y = drawStudyAndCantonSection(doc, data, labels, y);
  drawHangingCalculationSection(doc, data, labels, y);
  ```

- To check whether an element still fits on the page before drawing it, use the constants and
  functions that give its height rather than recomputing it: `SECTION_TITLE_HEIGHT`,
  `SEPARATOR_HEIGHT` and `computeTableHeight()`.

---

## Primitives — `pdf-primitives.helpers.ts`

### Page layout

| Function | Draws | Returns |
|---|---|---|
| `drawHeader(doc, date, reportTitle, pageWidth?)` | App name, report title, date, separator line | Next Y (25 mm) |
| `drawCompactHeader(doc, pageWidth?)` | App name and separator line only | Next Y (18 mm) |
| `drawSectionTitle(doc, title, y)` | Underlined section title | `y + SECTION_TITLE_HEIGHT` |
| `drawSeparator(doc, y, width?)` | Horizontal line with a margin above and below | `y + SEPARATOR_HEIGHT` |
| `drawFooter(doc, text, pageWidth?, pageHeight?)` | Footer text, bottom right | — |
| `drawPageFooters(doc, pageLabel, landscapeFromPage2?)` | "Page n / total" on every page | — |

`pageWidth` and `pageHeight` default to portrait: pass `LANDSCAPE_PAGE.width` / `.height` on landscape
pages. `drawPageFooters(doc, label, true)` assumes every page after the first is landscape; a report
that adds portrait pages (the hanging table report) calls it without the flag.

### Metadata sections

| Function | Draws |
|---|---|
| `drawBulletItem()` / `drawWrappingBulletItem()` | One "• Label : value" line; the wrapping variant splits the value over several lines |
| `drawBulletList()` | A column of bullet items |
| `drawTitledBulletSection()` | Title, one column of bullet items, separator |
| `drawTwoColumnBullets()` / `drawTwoColumnBulletSection()` | Two independent bullet columns, with title and separator for the section variant |
| `drawStudyCartoucheSection(doc, title, labels, data, y)` | The study & canton cartouche shared by the canton reports: author, study, study description, canton, comment, initial condition, load case and its description, `-` for an empty value |

### Values and labels

| Function | Role |
|---|---|
| `formatValue(value, unit, decimals?)` | Fixed decimals (`DECIMAL_PLACES` = 3 by default) followed by the unit, or `-` for `null`/`undefined` |
| `buildReportLabels(translate, keys)` | Resolves a `{ field: translationKey }` constant into the typed labels object |
| `generatePdfReport(options)` | Runs `build`, saves the document and notifies success or failure |
| `loadFileAsBase64()` / `loadImageAsBase64()` | Fetches a font or an image for `addFileToVFS()` / `addImage()` |
| `registerNunitoFont()` | Registers the three Nunito variants in a document (called by `createDoc()`) |

---

## Result tables — `pdf-table.helpers.ts`

### Transposed tables

Result tables are **transposed**: each entity (span, support, load, obstacle point…) becomes a
**column**, and each metric a **row**. A report describes its rows with `MetricDescriptor`s:

```typescript
export const OBSTACLES_TABLE_METRICS: MetricDescriptor<ObstacleTableRow>[] = [
  { labelKey: 'studio.obstacles-table.obstacle-name-column-label', unit: null, decimals: 0, field: 'obstacleName' },
  { labelKey: 'studio.obstacles-table.point-column-label', unit: '', decimals: 0, field: 'pointNumber' },
  { labelKey: 'studio.shared.oblique', unit: PDF_UNITS.meters, decimals: 2, field: 'oblique' }
];
```

`buildTables(rows, metrics, translate, maxCols?)` turns the rows into `PdfTableModel`s: the rows are
chunked into tables of `MAX_COLS_PER_TABLE` (5) columns, unless `maxCols` is given, and each metric
label is translated. Each cell is formatted by `formatCell()`:

| `unit` | Cell |
|---|---|
| `null` | The raw string, or `-` when it is empty |
| `''` | The number without a unit (the label already carries it) |
| A unit | `formatValue(value, unit, decimals)` |

### Column widths

- `computeLabelColWidth(doc, tables)` sizes the label column to the widest metric label. Pass every
  table of the report so the columns line up from one section to the next.
- Each value column takes `(content width − label column) / max(5, number of columns)`: the last chunk
  of a section keeps the width of a full table, so its columns line up with the ones above.

### Cell wrapping

A cell wraps on as many lines as needed, up to **2** lines (`MAX_CELL_LINES`); jsPDF's
`splitTextToSize()` also splits a word longer than the cell. A longer text is cut after the second
line, which then ends with "…". A row is as tall as its tallest cell, in `TABLE_ROW_HEIGHT` (5.5 mm)
steps.

`computeTableHeight()` measures a table the same way `drawTable()` draws it, without drawing.

### Placing tables on pages

| Function | Behavior | Used by |
|---|---|---|
| `drawTable(doc, table, y, pageWidth, labelColWidth)` | Draws one table at `y`, without any page handling | Hanging table (portrait, every column in one table) |
| `drawResultTablesSection(doc, date, reportTitle, sectionTitle, tables, labelColWidth)` | Starts a new landscape page, then `MAX_TABLES_PER_PAGE` (2) tables per page, each page with the full header and the section title | Section data, section state |
| `drawResultTablesFlow(doc, date, reportTitle, sections, labelColWidth, options?)` | Stacks several titled sections continuously and only starts a new landscape page when the next table does not fit | Loads, obstacles table |

`drawResultTablesFlow()` in detail:

- It always starts on a new landscape page.
- A section without tables is skipped.
- A section title is only drawn where its first table and the closing separator also fit, so a title
  is never left alone at the bottom of a page.
- When a section continues on a new page, its title is drawn again.
- A separator closes each section, not each table chunk.
- `options.compactHeader` draws `drawCompactHeader()` on every landscape page instead of
  `drawHeader()`: `date` and `reportTitle` are then not drawn. The obstacles table report uses it, its
  date and title being on page 1 only.
- `options.tableGap` sets the gap between two tables of a section (`TABLE_VERTICAL_GAP`, 6 mm, by
  default). The obstacles table report uses 12 mm, made room for by the compact header.

---

## Labels and translation

- **Fixed labels** (report title, section titles, cartouche labels, page label) are declared in a
  labels interface extending `BaseReportLabels`, with a `PDF_*_LABEL_KEYS` constant giving their
  translation keys, and resolved by `buildReportLabels()`.
- **Metric row labels** are the `labelKey`s of the `MetricDescriptor`s, translated by `buildTables()`.
  They are not repeated in the labels interface.
- **Enum values** (obstacle type, altitude type, load type…) are translated by the component before
  they reach the service: the table helpers print the strings as they are.

---

## Testing

The report specs replace jsPDF with a mock document, so the drawing calls can be asserted:

```typescript
vi.mock('jspdf', () => {
  const mockDoc = {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setPage: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    rect: vi.fn(),
    addPage: vi.fn(),
    getNumberOfPages: vi.fn().mockReturnValue(2),
    getTextWidth: vi.fn().mockReturnValue(30),
    splitTextToSize: vi.fn().mockImplementation((text: string) => [text]),
    save: vi.fn()
  };
  const mockJsPDF = vi.fn(function () {
    return mockDoc;
  });
  return { default: mockJsPDF, jsPDF: mockJsPDF, __mockDoc: mockDoc };
});
```

- `splitTextToSize` returning `[text]` keeps every cell on one line; return several lines to test
  wrapping and page breaks.
- Table cells are drawn with `rect()`: the label cell of a row is the one at `PAGE_MARGIN.left`, which
  gives the Y of each row.
- The helper specs (`pdf-primitives.helpers.spec.ts`, `pdf-table.helpers.spec.ts`) build the mock
  document directly, without `vi.mock`.
