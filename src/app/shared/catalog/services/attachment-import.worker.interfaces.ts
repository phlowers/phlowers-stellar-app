/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Input message sent by the main thread to the attachment import worker. */
export interface AttachmentImportWorkerRequest {
  /** URL to download the attachments CSV from (streamed by PapaParse). */
  url: string;
  /** Optional chunk size in bytes. Defaults to 512 KB. */
  chunkSize?: number;
}

/** Progress message emitted after each processed chunk. */
export interface AttachmentImportProgressMessage {
  type: 'progress';
  processedRows: number;
}

/** Final success message. */
export interface AttachmentImportDoneMessage {
  type: 'done';
  totalRows: number;
  totalSupports: number;
}

/** Failure message. The worker is expected to be terminated by the caller. */
export interface AttachmentImportErrorMessage {
  type: 'error';
  message: string;
}

export type AttachmentImportWorkerResponse =
  | AttachmentImportProgressMessage
  | AttachmentImportDoneMessage
  | AttachmentImportErrorMessage;
