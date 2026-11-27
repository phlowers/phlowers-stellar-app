import { buildCsv } from '@shared/helpers/csv-export.helpers';
import { sanitizeFilenamePart } from '@shared/helpers/filename.helpers';

import { L0Row } from './l0-sum.interfaces';

const L0_EXPORT_EXTENSION = '.csv';

const CSV_NUMBER_MAX_DECIMALS = 3;

// Translated column labels, in column order
export interface L0CsvLabels {
  span: string;
  spanLength: string;
  l0: string;
  cumulatedL0: string;
}

// Local time as YYYY-MM-DD_HH-mm-ss, the ":" of a time being illegal in a file name
function formatGenerationTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  return `${day}_${time}`;
}

// Builds "<translated prefix>_<study name>_<section name>_<generation timestamp>.csv"
export function buildL0ExportFilename(
  prefix: string,
  studyName: string,
  sectionName: string,
  generationDate: Date = new Date()
): string {
  const parts = [prefix, studyName, sectionName, formatGenerationTimestamp(generationDate)];
  return parts.map(sanitizeFilenamePart).join('_') + L0_EXPORT_EXTENSION;
}

// A table can be exported when it has rows and every length is a finite number
export function isL0TableExportable(rows: L0Row[]): boolean {
  return (
    rows.length > 0 &&
    rows.every((row) => [row.spanLength, row.l0, row.cumulatedL0].every((value) => Number.isFinite(value)))
  );
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
  const dataRows = rows.map((row) => [
    row.span,
    formatCsvNumber(row.spanLength, locale),
    formatCsvNumber(row.l0, locale),
    formatCsvNumber(row.cumulatedL0, locale)
  ]);
  return buildCsv([headingRow, ...dataRows]);
}
