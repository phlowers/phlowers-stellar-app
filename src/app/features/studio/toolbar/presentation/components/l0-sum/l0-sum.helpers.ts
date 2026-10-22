import { L0Row } from './l0-sum.interfaces';

export const L0_EXPORT_FILENAME = 'export_natural_lengths.csv';

// Declaring the charset and prefixing a BOM forces UTF-8, otherwise Excel decodes accented labels as ANSI
export const L0_EXPORT_MIME_TYPE = 'text/csv;charset=utf-8';
const CSV_BOM = '\uFEFF';

const CSV_SEPARATOR = ';';
const CSV_LINE_BREAK = '\r\n';
const CSV_NUMBER_MAX_DECIMALS = 3;

// Translated column labels, in column order
export interface L0CsvLabels {
  span: string;
  spanLength: string;
  l0: string;
  cumulatedL0: string;
}

// A table can be exported when it has rows and every length is a finite number
export function isL0TableExportable(rows: L0Row[]): boolean {
  return (
    rows.length > 0 &&
    rows.every((row) => [row.spanLength, row.l0, row.cumulatedL0].every((value) => Number.isFinite(value)))
  );
}

// Quotes a field when it holds the separator, a quote or a line break
function escapeCsvField(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

// No thousands grouping, and the decimal separator follows the locale (e.g. "300,5" in French)
function formatCsvNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    useGrouping: false,
    maximumFractionDigits: CSV_NUMBER_MAX_DECIMALS
  }).format(value);
}

// Builds the L0 export: a heading row of translated upper case labels, then one row per span
export function buildL0Csv(rows: L0Row[], labels: L0CsvLabels, locale: string): string {
  const headingRow = [labels.span, labels.spanLength, labels.l0, labels.cumulatedL0].map((label) =>
    label.toLocaleUpperCase(locale)
  );
  // Support numbers are free text: spreadsheet software reads a cell starting with "=", "+", "-" or "@" as a formula,
  // and leading whitespace can hide that character, so those span labels get an apostrophe before the CSV escaping.
  // The lengths are left alone, a negative one legitimately starts with "-"
  const dataRows = rows.map((row) => [
    /^[\s=+@-]/.test(row.span) ? `'${row.span}` : row.span,
    formatCsvNumber(row.spanLength, locale),
    formatCsvNumber(row.l0, locale),
    formatCsvNumber(row.cumulatedL0, locale)
  ]);
  const lines = [headingRow, ...dataRows].map((fields) => fields.map(escapeCsvField).join(CSV_SEPARATOR));

  return CSV_BOM + lines.join(CSV_LINE_BREAK) + CSV_LINE_BREAK;
}
