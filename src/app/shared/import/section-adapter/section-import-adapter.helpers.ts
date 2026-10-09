/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Provider, Type } from '@angular/core';
import { ImportError } from '@shared/import/domain/import-contracts.interfaces';
import { SECTION_IMPORT_ADAPTERS } from './section-import-adapter.constantes';
import { SectionImportAdapter, SectionImportSource } from './section-import-adapter.interfaces';

/** Registers an adapter class and appends it to the `SECTION_IMPORT_ADAPTERS` multi-provider. */
export function provideSectionImportAdapter(adapter: Type<SectionImportAdapter>): Provider[] {
  return [adapter, { provide: SECTION_IMPORT_ADAPTERS, useExisting: adapter, multi: true }];
}

/** Returns the lowercase extension of a file name including the leading dot, or `''` if none. */
export function getFileExtension(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  return index < 0 ? '' : fileName.slice(index).toLowerCase();
}

/** Returns `true` when at least one adapter declares the extension of `fileName`. */
export function isFileAccepted(adapters: readonly SectionImportAdapter[], fileName: string): boolean {
  const extension = getFileExtension(fileName);
  return adapters.some((adapter) => adapter.extensions.includes(extension));
}

/**
 * Picks the first adapter (registry order) that declares the file extension and recognizes the content.
 * A throwing `canHandle` is treated as "not handled" so one faulty adapter cannot block the others.
 */
export function selectAdapter(
  adapters: readonly SectionImportAdapter[],
  source: SectionImportSource
): SectionImportAdapter | null {
  const extension = getFileExtension(source.fileName);
  return (
    adapters.find((adapter) => {
      if (!adapter.extensions.includes(extension)) return false;
      try {
        return adapter.canHandle(source);
      } catch {
        return false;
      }
    }) ?? null
  );
}

/** Builds a `SectionImportSource`, leaving `json` undefined when the text is not valid JSON. */
export function buildImportSource(fileName: string, text: string): SectionImportSource {
  try {
    return { fileName, text, json: JSON.parse(text) as unknown };
  } catch {
    return { fileName, text, json: undefined };
  }
}

/** Type guard for `ImportError`-shaped values thrown by adapters and the pipeline. */
export function isImportError(value: unknown): value is ImportError {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['code'] === 'string' &&
    typeof candidate['message'] === 'string' &&
    typeof candidate['stage'] === 'string'
  );
}
