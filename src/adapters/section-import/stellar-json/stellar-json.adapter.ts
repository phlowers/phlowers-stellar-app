/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { adapterErrorCode, ImportError } from '@shared/import/domain/import-contracts';
import {
  SectionImportAdapter,
  SectionImportPayload,
  SectionImportSource,
  STELLAR_SECTION_VERSION
} from '@shared/import/section-adapter/section-import-adapter';
import {
  STELLAR_JSON_ADAPTER_ID,
  STELLAR_JSON_ERROR_CODES,
  STELLAR_JSON_EXTENSIONS,
  STELLAR_JSON_I18N_KEYS,
  STELLAR_JSON_MIME_TYPES
} from './stellar-json.constantes';
import {
  extractStellarUuid,
  isRawSectionJson,
  isStellarEnvelopeJson,
  isSupportedEnvelopeVersion,
  mapRawToSection,
  parseEnvelopeCoordinates
} from './stellar-json.helpers';

/**
 * Default, mandatory section import adapter and reference example for custom adapters.
 *
 * Reads the versioned Stellar envelope (`.stsec`: `{ format, version, section, coordinates? }`)
 * and, for backward compatibility, a raw serialized `Section` in a `.json` file.
 */
@Injectable()
export class StellarJsonAdapter implements SectionImportAdapter {
  readonly id = STELLAR_JSON_ADAPTER_ID;
  readonly extensions = STELLAR_JSON_EXTENSIONS;
  readonly mimeTypes = STELLAR_JSON_MIME_TYPES;

  private readonly transloco = inject(TranslocoService);

  get formatLabel(): string {
    return this.transloco.translate(STELLAR_JSON_I18N_KEYS.formatLabel);
  }

  canHandle(source: SectionImportSource): boolean {
    return isStellarEnvelopeJson(source.json) || isRawSectionJson(source.json);
  }

  extractUuid(source: SectionImportSource): string | null {
    return extractStellarUuid(source.json);
  }

  async import(source: SectionImportSource): Promise<SectionImportPayload> {
    const json = source.json;

    if (isStellarEnvelopeJson(json)) {
      return this.importEnvelope(json);
    }
    if (isRawSectionJson(json)) {
      return { section: mapRawToSection(json) };
    }
    throw this.buildError(STELLAR_JSON_ERROR_CODES.invalidEnvelope, STELLAR_JSON_I18N_KEYS.invalidEnvelope);
  }

  private importEnvelope(envelope: Record<string, unknown>): SectionImportPayload {
    if (!isSupportedEnvelopeVersion(envelope['version'], STELLAR_SECTION_VERSION)) {
      throw this.buildError(STELLAR_JSON_ERROR_CODES.unsupportedVersion, STELLAR_JSON_I18N_KEYS.unsupportedVersion, {
        version: String(envelope['version']),
        maxVersion: STELLAR_SECTION_VERSION
      });
    }

    const rawSection = envelope['section'];
    if (typeof rawSection !== 'object' || rawSection === null || Array.isArray(rawSection)) {
      throw this.buildError(STELLAR_JSON_ERROR_CODES.invalidEnvelope, STELLAR_JSON_I18N_KEYS.invalidEnvelope);
    }

    const section = mapRawToSection(rawSection as Record<string, unknown>);
    const coordinates = parseEnvelopeCoordinates(envelope['coordinates'], section.supports.length);
    if (coordinates === null) {
      throw this.buildError(STELLAR_JSON_ERROR_CODES.invalidEnvelope, STELLAR_JSON_I18N_KEYS.invalidEnvelope);
    }

    return { section, coordinates };
  }

  private buildError(code: string, messageKey: string, params?: Record<string, unknown>): ImportError {
    return {
      code: adapterErrorCode(code),
      message: this.transloco.translate(messageKey, params),
      stage: 'VALIDATION'
    };
  }
}
