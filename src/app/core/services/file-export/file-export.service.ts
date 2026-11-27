/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { DOCUMENT, inject, Injectable } from '@angular/core';
import { LoggerService } from '@core/services/logger/logger.service';
import { FileExportOptions, FileExportResult } from './file-export.interfaces';

/**
 * Saves a generated file on the user's machine.
 * Opens the browser "Save as" picker (`showSaveFilePicker`) when available, otherwise downloads the file
 * through a temporary `<a download>` link.
 */
@Injectable({ providedIn: 'root' })
export class FileExportService {
  private readonly document = inject(DOCUMENT);
  private readonly logger = inject(LoggerService);

  /**
   * Saves `content` under `filename`.
   * A user cancellation of the picker (`AbortError`) writes nothing; any other picker error is logged
   * and falls back to the download.
   * @param content - The file content
   * @param filename - The suggested file name, extension included
   * @param options - The download MIME type and the file types proposed by the picker
   * @returns How the file was handled
   */
  async save(content: string, filename: string, options: FileExportOptions): Promise<FileExportResult> {
    if (globalThis.showSaveFilePicker) {
      try {
        const handle = await globalThis.showSaveFilePicker({ suggestedName: filename, types: options.pickerTypes });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return 'saved';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
        this.logger.error('Failed to save file via showSaveFilePicker', error);
      }
    }

    const url = URL.createObjectURL(new Blob([content], { type: options.mimeType }));
    const link = this.document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }
}
