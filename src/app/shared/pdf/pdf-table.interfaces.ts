/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Descriptor for one metric row of a result table.
 * `unit` is `null` for the (string) identifier row (e.g. span/support number).
 * `decimals` is the number of decimal places to render (unused/0 when `unit` is `null`).
 */
export interface MetricDescriptor<T> {
  labelKey: string;
  unit: string | null;
  decimals: number;
  field: keyof T;
}

/** A single table row: a metric label plus one formatted value per column. */
export interface PdfTableRow {
  label: string;
  values: string[];
}

/** A rendered table model (a chunk of up to MAX_COLS_PER_TABLE columns). */
export interface PdfTableModel {
  rows: PdfTableRow[];
}
