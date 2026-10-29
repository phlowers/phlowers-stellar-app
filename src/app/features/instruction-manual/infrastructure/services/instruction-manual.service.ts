/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { MANUAL_PDF_URL_FILE_NAME, UNKNOWN_PDF_INFO } from './instruction-manual.constantes';
import { ManualPdfInfo } from './instruction-manual.model';

@Injectable({
  providedIn: 'root'
})
/** Locates the instruction manual PDF for a language and reads its file metadata. */
export class InstructionManualService {
  private readonly http = inject(HttpClient);

  /**
   * Builds the URL of the PDF manual for a language.
   * @param lang - Language code of the app (e.g. `en`, `fr`).
   */
  getPdfUrl(lang: string): string {
    return `/docs/${lang}/${MANUAL_PDF_URL_FILE_NAME}`;
  }

  /**
   * Reads the size and update date of the PDF without downloading it.
   * Emits unknown values when the file is unreachable (offline, not deployed).
   * @param pdfUrl - URL returned by {@link getPdfUrl}.
   */
  getPdfInfo(pdfUrl: string): Observable<ManualPdfInfo> {
    // no-cache makes the browser revalidate, so a new release never shows the size and date of the previous PDF
    return this.http.head(pdfUrl, { observe: 'response', headers: { 'Cache-Control': 'no-cache' } }).pipe(
      map((response) => this.toPdfInfo(response)),
      catchError(() => of(UNKNOWN_PDF_INFO))
    );
  }

  private toPdfInfo(response: HttpResponse<unknown>): ManualPdfInfo {
    // A server falling back to the SPA shell answers 200 with HTML for a missing file
    if (!response.headers.get('Content-Type')?.includes('pdf')) {
      return UNKNOWN_PDF_INFO;
    }

    const contentLength = Number(response.headers.get('Content-Length'));
    const lastModified = new Date(response.headers.get('Last-Modified') ?? Number.NaN);

    return {
      sizeBytes: contentLength > 0 ? contentLength : null,
      lastModified: Number.isNaN(lastModified.getTime()) ? null : lastModified
    };
  }
}
