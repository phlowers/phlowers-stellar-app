/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Supported study export formats.
 * - `clst`: base64-encoded JSON (default, app import format)
 * - `stsd`: plain, human-readable JSON
 */
export type StudyExportFormat = 'clst' | 'stsd';

/** Option displayed in the export format dropdown. */
export interface StudyExportFormatOption {
  label: string;
  value: StudyExportFormat;
}
