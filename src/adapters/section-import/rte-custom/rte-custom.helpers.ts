/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Support } from '@shared/domain';
import { parseFloatOrNull } from '@shared/import/section-adapter/section-import-parse.helpers';
import {
  Appartenance,
  Attachment,
  FieldError,
  ImportedSection,
  SectionImportFile,
  Span
} from './rte-custom.interfaces';

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/** Returns `true` when the parsed JSON has a non-empty `cantons` array (the file claims to be a canton file). */
export function hasCantons(json: unknown): boolean {
  return (
    typeof json === 'object' &&
    json !== null &&
    Array.isArray((json as Record<string, unknown>)['cantons']) &&
    ((json as Record<string, unknown>)['cantons'] as unknown[]).length > 0
  );
}

/** Returns `true` when the parsed JSON is a well-formed canton file (`cantons[0].general.CANTON_CUR` is a string). */
export function isRteCantonFormat(json: unknown): json is SectionImportFile {
  if (!hasCantons(json)) return false;
  const canton0 = ((json as Record<string, unknown>)['cantons'] as unknown[])[0];
  if (typeof canton0 !== 'object' || canton0 === null) return false;
  const general = (canton0 as Record<string, unknown>)['general'];
  if (typeof general !== 'object' || general === null) return false;
  return typeof (general as Record<string, unknown>)['CANTON_CUR'] === 'string';
}

/** Trimmed `CANTON_CUR` of the first canton, or `null` when the file is not a well-formed canton file. */
export function extractCantonUuid(json: unknown): string | null {
  if (!isRteCantonFormat(json)) return null;
  const uuid = (json.cantons[0] as ImportedSection).general.CANTON_CUR.trim();
  return uuid === '' ? null : uuid;
}

// ---------------------------------------------------------------------------
// Pure helper functions
// ---------------------------------------------------------------------------

/**
 * Support name used as catalog lookup key: `SUPPORT_IDR` when present, otherwise `SUPPORT_ADR`
 * (the ADR is never used as a fallback when an IDR exists, even one absent from the catalog).
 */
export function pickSupportName(attachment: Attachment): string | null {
  return attachment.SUPPORT_IDR?.trim() ? attachment.SUPPORT_IDR : (attachment.SUPPORT_ADR ?? null);
}

/** Returns the first non-empty appartenance record from the raw canton file. */
export function findFirstMeaningfulAppartenance(
  general: ImportedSection['general'] | undefined
): Appartenance | undefined {
  const appartenance = general?.appartenance ?? [];
  return appartenance.find((entry): entry is Appartenance => {
    if (typeof entry !== 'object' || entry === null) return false;

    const record = entry as unknown as Record<string, unknown>;
    return Object.values(record).some((value) => {
      if (typeof value === 'string') return value.trim() !== '';
      return value !== null && value !== undefined;
    });
  });
}

/** Removes blank placeholder rows (empty objects, null values) from the raw "portee unitaire" array. */
export function filterMeaningfulSpans(spans: unknown[] | null | undefined): Span[] {
  if (!Array.isArray(spans)) return [];

  return spans.filter((span): span is Span => {
    if (typeof span !== 'object' || span === null) return false;

    const record = span as Record<string, unknown>;
    const hasDeparture = typeof record['accroche depart'] === 'object' && record['accroche depart'] !== null;
    const hasArrival = typeof record['accroche arrivee'] === 'object' && record['accroche arrivee'] !== null;

    return (
      hasDeparture ||
      hasArrival ||
      typeof record.PORTEE_UNITAIRE_ORDRE === 'string' ||
      typeof record.PORTEE_LONGUEUR === 'string' ||
      typeof record.PORTEE_AZIMUT === 'string' ||
      typeof record.PORTEE_UNITAIRE_DESIGNATION === 'string'
    );
  }) as Span[];
}

/**
 * Extracts the position number from a PORTEE_UNITAIRE_DESIGNATION string.
 * Rule RG.CAN.POS — e.g. "Position 1 - Phase A" → "1".
 */
export function extractAttachmentPosition(value: string | null): string | null {
  if (!value) return null;
  const match = /Position (\d{1,2})/.exec(value);
  return match ? match[1] : null;
}

/**
 * Builds the section name from canton data components.
 * Rule RG.CAN.NOM:
 * {BRANCHE_IDR}-{CANTON_TYPE}{PHASE_ELECTRIQUE_NUMERO}-{startNum}-SET{startSet}-{endNum}-SET{endSet}
 * No separator between CANTON_TYPE and PHASE_ELECTRIQUE_NUMERO.
 * PHASE_ELECTRIQUE_NUMERO is omitted when CANTON_TYPE is GARDE.
 */
export function buildSectionName(
  rawBranchIdr: string | null,
  cantonType: string | null,
  phaseElectriqueNumero: string | null,
  supports: Support[]
): string {
  const parts: string[] = [];

  if (rawBranchIdr) parts.push(rawBranchIdr);

  const isGarde = cantonType?.toUpperCase() === 'GARDE';
  const typeAndPhase = (cantonType ?? '') + (isGarde || !phaseElectriqueNumero ? '' : phaseElectriqueNumero);
  if (typeAndPhase) parts.push(typeAndPhase);

  const firstSupport = supports[0];
  const startNum = firstSupport?.number?.substring(0, 5) ?? null;
  if (startNum) parts.push(startNum);

  if (firstSupport?.attachmentSet != null) parts.push(`SET${firstSupport.attachmentSet}`);

  const lastSupport = supports.at(-1);
  const endNum = lastSupport?.number?.substring(0, 5) ?? null;
  if (endNum) parts.push(endNum);

  if (lastSupport?.attachmentSet != null) parts.push(`SET${lastSupport.attachmentSet}`);

  return parts.join('-');
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validates required fields directly on the raw canton JSON before mapping.
 * Only checks fields explicitly marked "Oui" (mandatory) in the US contract interface.
 * Operates on original JSON key names so error messages show exactly what the user
 * sees in their file (e.g. `ANGLE_LIGNE: null`).
 * Results are deduplicated: if the same field is null across multiple portées/accroches
 * it is reported only once.
 *
 * Required fields per US contract:
 * - general:               FAISCEAU_CABLES_NOMBRE
 * - portee unitaire:       PORTEE_LONGUEUR, PORTEE_AZIMUT
 * - accroche depart/arrivee: ACCROCHE_CABLE_Z_LAMBERT93, ANGLE_LIGNE,
 *                            CHAINE_DRN_LONGUEUR, CHAINE_DRN_POIDS,
 *                            HAUTEUR_SOUS_CONSOLE, LONGUEUR_BRAS, PIED_Z_LAMBERT93
 */
export function validateImportedSectionFields(raw: SectionImportFile): FieldError[] {
  const seen = new Set<string>();
  const errors: FieldError[] = [];

  const report = (field: string, value: string | null): void => {
    if (!seen.has(field)) {
      seen.add(field);
      errors.push({ field, value });
    }
  };

  const section = raw.cantons[0];
  const general = section.general;
  const spans = [...filterMeaningfulSpans(section['portee unitaire'] ?? [])].sort(
    (a, b) => Number.parseFloat(a.PORTEE_UNITAIRE_ORDRE ?? '0') - Number.parseFloat(b.PORTEE_UNITAIRE_ORDRE ?? '0')
  );

  // general — required fields
  if (typeof general.CABLE_ADR !== 'string' || !general.CABLE_ADR) {
    report('CABLE_ADR', general.CABLE_ADR ?? null);
  }
  if (typeof general.CANTON_TYPE !== 'string' || !general.CANTON_TYPE) {
    report('CANTON_TYPE', general.CANTON_TYPE ?? null);
  }
  if (parseFloatOrNull(general.FAISCEAU_CABLES_NOMBRE) === null) {
    report('FAISCEAU_CABLES_NOMBRE', general.FAISCEAU_CABLES_NOMBRE ?? null);
  }

  if (spans.length === 0) {
    errors.push({ field: 'portee unitaire', value: null });
    return errors;
  }

  // Attachment-level required fields ("Oui" in US contract interface)
  const ATTACHMENT_NUMERIC_REQUIRED: readonly (keyof Attachment)[] = [
    'ACCROCHE_CABLE_Z_LAMBERT93',
    'ANGLE_LIGNE',
    'CHAINE_DRN_LONGUEUR',
    'CHAINE_DRN_POIDS',
    'HAUTEUR_SOUS_CONSOLE',
    'LONGUEUR_BRAS',
    'PIED_Z_LAMBERT93'
  ];

  const checkAttachment = (attachment: Attachment): void => {
    for (const field of ATTACHMENT_NUMERIC_REQUIRED) {
      if (parseFloatOrNull(attachment[field]) === null) report(field, attachment[field] ?? null);
    }
    if (typeof attachment.SUPPORT_NUMERO !== 'string' || !attachment.SUPPORT_NUMERO) {
      report('SUPPORT_NUMERO', attachment.SUPPORT_NUMERO ?? null);
    }
  };

  spans.forEach((span, i) => {
    const isLast = i === spans.length - 1;

    // portee unitaire — PORTEE_LONGUEUR and PORTEE_AZIMUT are "Oui" in US
    if (parseFloatOrNull(span.PORTEE_LONGUEUR) === null) {
      report('PORTEE_LONGUEUR', span.PORTEE_LONGUEUR ?? null);
    }
    if (parseFloatOrNull(span.PORTEE_AZIMUT) === null) {
      report('PORTEE_AZIMUT', span.PORTEE_AZIMUT ?? null);
    }

    // Every depart accroche produces a mapped support
    checkAttachment(span['accroche depart']);
    // The arrivee of the last portée also produces a mapped support
    if (isLast) checkAttachment(span['accroche arrivee']);
  });

  return errors;
}
