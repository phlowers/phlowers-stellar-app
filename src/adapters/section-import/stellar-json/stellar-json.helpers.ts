/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Section, Support } from '@shared/domain';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { SectionImportCoordinates, SectionImportCrs } from '@shared/import/section-adapter/section-import-adapter';
import { STELLAR_SECTION_FORMAT } from '@shared/import/section-adapter/section-import-adapter.constantes';
import { STELLAR_JSON_CRS_VALUES } from './stellar-json.constantes';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Returns `true` when the parsed JSON carries the Stellar envelope discriminator. */
export function isStellarEnvelopeJson(json: unknown): json is Record<string, unknown> {
  return isPlainObject(json) && json['format'] === STELLAR_SECTION_FORMAT;
}

/**
 * Returns `true` for a raw serialized `Section` (no envelope, not a canton file) that looks like a section:
 * it has a string `uuid` or a `supports` array.
 */
export function isRawSectionJson(json: unknown): json is Record<string, unknown> {
  if (!isPlainObject(json) || 'cantons' in json || 'format' in json) return false;
  return typeof json['uuid'] === 'string' || Array.isArray(json['supports']);
}

/** Returns `true` when `version` is an integer between 1 and `maxVersion`. */
export function isSupportedEnvelopeVersion(version: unknown, maxVersion: number): boolean {
  return typeof version === 'number' && Number.isInteger(version) && version >= 1 && version <= maxVersion;
}

/** Trimmed UUID of a raw section or of an envelope's section, or `null` when absent. */
export function extractStellarUuid(json: unknown): string | null {
  const rawSection = isStellarEnvelopeJson(json) ? json['section'] : json;
  if (!isPlainObject(rawSection) || typeof rawSection['uuid'] !== 'string') return null;
  const uuid = rawSection['uuid'].trim();
  return uuid === '' ? null : uuid;
}

/** Merges a raw section onto an empty one so missing optional fields get defaults. */
export function mapRawToSection(raw: Record<string, unknown>): Section {
  const uuid = typeof raw['uuid'] === 'string' ? raw['uuid'].trim() : raw['uuid'];
  return {
    ...createEmptySection(),
    ...raw,
    uuid,
    supports: mapRawSupports(raw['supports'])
  } as Section;
}

function mapRawSupports(rawSupports: unknown): Support[] {
  if (!Array.isArray(rawSupports) || rawSupports.length === 0) return [];
  return rawSupports.map((s) => ({
    ...createEmptySupport(),
    ...(s as Record<string, unknown>)
  })) as Support[];
}

/**
 * Validates the optional `coordinates` block of an envelope.
 *
 * @returns the typed coordinates, `undefined` when absent, or `null` when present but malformed.
 */
export function parseEnvelopeCoordinates(
  raw: unknown,
  supportsCount: number
): SectionImportCoordinates | undefined | null {
  if (raw === undefined) return undefined;
  if (!isPlainObject(raw)) return null;

  const { crs, x, y } = raw;
  const isCoordinateArray = (value: unknown): value is (number | null)[] =>
    Array.isArray(value) &&
    value.length === supportsCount &&
    value.every((v) => v === null || (typeof v === 'number' && Number.isFinite(v)));

  if (!STELLAR_JSON_CRS_VALUES.includes(crs as SectionImportCrs) || !isCoordinateArray(x) || !isCoordinateArray(y)) {
    return null;
  }
  return { crs: crs as SectionImportCrs, x, y };
}
