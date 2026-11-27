/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Options of `FileExportService.save`. */
export interface FileExportOptions {
  /** MIME type of the downloaded Blob when the save file picker is not used. */
  mimeType: string;
  /** File types proposed by the save file picker (e.g. `[{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }]`). */
  pickerTypes?: SaveFilePickerOptions['types'];
}

/**
 * Outcome of `FileExportService.save`:
 * - `saved`: written through the save file picker;
 * - `cancelled`: the user closed the save file picker, nothing was written;
 * - `downloaded`: the picker is unavailable or failed, the file was downloaded instead.
 */
export type FileExportResult = 'saved' | 'cancelled' | 'downloaded';
