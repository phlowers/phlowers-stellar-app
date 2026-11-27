/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CSV_BOM, CSV_LINE_BREAK, CSV_SEPARATOR } from './csv-export.constantes';

// Quotes a field when it holds the separator, a quote or a line break
export function escapeCsvField(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * Builds the content of an exported CSV file: a UTF-8 BOM, then one ";" separated line per entry, each line
 * ending with CRLF. Fields are escaped, numbers must already be formatted by the caller.
 */
export function buildCsv(lines: readonly (readonly string[])[]): string {
  return CSV_BOM + lines.map((fields) => fields.map(escapeCsvField).join(CSV_SEPARATOR) + CSV_LINE_BREAK).join('');
}
