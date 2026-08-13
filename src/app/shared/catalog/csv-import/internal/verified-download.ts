/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { createSHA256 } from 'hash-wasm';

/** Minimal `fetch` signature used here — kept narrow to ease testing. */
export type DownloadFetcher = (url: string) => Promise<Response>;

/** Result of a single verified download: the raw bytes and their SHA-256 hex digest. */
export interface DownloadAndHashResult {
  blob: Blob;
  hash: string;
}

/**
 * Downloads `url` exactly once, incrementally hashing the response body
 * while buffering it, and returns both the downloaded content (as a `Blob`,
 * ready for `Papa.parse`/`JSON.parse`) and its SHA-256 hex digest.
 *
 * @remarks
 * A single network round-trip serves both hash verification and parsing —
 * the catalog must never be downloaded twice, and its active version must
 * never be replaced by content that has not been fully downloaded and
 * verified first (see `run-worker-import.ts`).
 */
export async function downloadAndHash(
  url: string,
  fetcher: DownloadFetcher = (u) => fetch(u)
): Promise<DownloadAndHashResult> {
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  const hasher = await createSHA256();
  hasher.init();

  if (!response.body) {
    // Fallback for environments without a streamable body (e.g. some test doubles).
    const buffer = await response.arrayBuffer();
    hasher.update(new Uint8Array(buffer));
    return { blob: new Blob([buffer]), hash: hasher.digest('hex') };
  }

  const chunks: Uint8Array[] = [];
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      hasher.update(value);
      chunks.push(value);
    }
  }
  return { blob: new Blob(chunks), hash: hasher.digest('hex') };
}
