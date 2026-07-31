/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { isNil } from 'lodash';
import { Section, Support } from '@shared/domain';
import { GeoLiaisonAccroche, GeoLiaisonFieldError, GeoLiaisonFormat } from './section-import.interfaces';

// ---------------------------------------------------------------------------
// Lambert93 to GPS reprojection helpers
// ---------------------------------------------------------------------------

/**
 * Builds the `spanLength`/`lineAngle` arrays consumed by the Lambert93-to-GPS reprojection
 * tasks. The last support has no outgoing span, so it gets `NaN`/`0` placeholders.
 */
export function buildReprojectionAngles(supports: Support[]): { spanLength: number[]; lineAngle: number[] } {
  const lastIndex = supports.length - 1;
  return {
    spanLength: supports.map((s, i) => (i === lastIndex ? Number.NaN : s.spanLength!)),
    lineAngle: supports.map((s, i) => (i === lastIndex ? 0 : s.spanAngle!))
  };
}

/** Returns a copy of `supports` with `footLatitude`/`footLongitude` set from the given arrays (by index). */
export function applyFootCoordinates(supports: Support[], latitude: number[], longitude: number[]): Support[] {
  return supports.map((support, i) => ({
    ...support,
    footLatitude: latitude[i] ?? null,
    footLongitude: longitude[i] ?? null
  }));
}

/**
 * Computes the mean absolute distance (meters) between two Lambert93 coordinate arrays —
 * the surveyed positions vs. the app's span/angle data model reconstruction.
 */
export function computeMeanReprojectionDiffMeters(
  lambertX: number[],
  lambertY: number[],
  reconstructedX: number[],
  reconstructedY: number[]
): number {
  return (
    lambertX.reduce((sum, x, i) => sum + Math.hypot(x - reconstructedX[i], lambertY[i] - reconstructedY[i]), 0) /
    lambertX.length
  );
}

// ---------------------------------------------------------------------------
// Pure helper functions
// ---------------------------------------------------------------------------

/** Converts a JSON string/null value to `number | null`. */
export function parseFloatOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number.parseFloat(typeof value !== 'object' ? String(value) : '');
  return Number.isNaN(n) ? null : n;
}

/** Converts a JSON string/boolean/null value to `boolean | null`. */
export function parseBooleanOrNull(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 'OUI') return true;
  if (value === 'false' || value === '0' || value === 'NON') return false;
  return null;
}

/**
 * Extracts the branch number from a BRANCHE_IDR string.
 * Rule RG.CAN.BRA — takes the last 2 characters (always digits) and converts them to an integer string.
 * e.g. "FLAMAL73MENUE01" → "1", "FLAMAL73MENUE08" → "8", "FLAMAL73MENUE10" → "10".
 */
export function extractBranchIdr(value: string): string {
  return String(Number.parseInt(value.slice(-2), 10));
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
 * Builds the section name from GeoLiaison data components.
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
 * Validates required fields directly on the raw GeoLiaison JSON before mapping.
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
export function validateGeoLiaisonRawFields(raw: GeoLiaisonFormat): GeoLiaisonFieldError[] {
  const seen = new Set<string>();
  const errors: GeoLiaisonFieldError[] = [];

  const report = (field: string, value: string | null): void => {
    if (!seen.has(field)) {
      seen.add(field);
      errors.push({ field, value });
    }
  };

  const canton = raw.cantons[0];
  const general = canton.general;
  const portees = [...(canton['portee unitaire'] ?? [])].sort(
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

  if (portees.length === 0) {
    errors.push({ field: 'portee unitaire', value: null });
    return errors;
  }

  // Accroche-level required fields ("Oui" in US contract interface)
  const acrocheNumericRequired: readonly (keyof GeoLiaisonAccroche)[] = [
    'ACCROCHE_CABLE_Z_LAMBERT93',
    'ANGLE_LIGNE',
    'CHAINE_DRN_LONGUEUR',
    'CHAINE_DRN_POIDS',
    'HAUTEUR_SOUS_CONSOLE',
    'LONGUEUR_BRAS',
    'PIED_Z_LAMBERT93'
  ];

  const checkAccroche = (accroche: GeoLiaisonAccroche): void => {
    for (const field of acrocheNumericRequired) {
      if (parseFloatOrNull(accroche[field]) === null) report(field, accroche[field] ?? null);
    }
    if (typeof accroche.SUPPORT_NUMERO !== 'string' || !accroche.SUPPORT_NUMERO) {
      report('SUPPORT_NUMERO', accroche.SUPPORT_NUMERO ?? null);
    }
  };

  portees.forEach((portee, i) => {
    const isLast = i === portees.length - 1;

    // portee unitaire — PORTEE_LONGUEUR and PORTEE_AZIMUT are "Oui" in US
    if (parseFloatOrNull(portee.PORTEE_LONGUEUR) === null) {
      report('PORTEE_LONGUEUR', portee.PORTEE_LONGUEUR ?? null);
    }
    if (parseFloatOrNull(portee.PORTEE_AZIMUT) === null) {
      report('PORTEE_AZIMUT', portee.PORTEE_AZIMUT ?? null);
    }

    // Every depart accroche produces a mapped support
    checkAccroche(portee['accroche depart']);
    // The arrivee of the last portée also produces a mapped support
    if (isLast) checkAccroche(portee['accroche arrivee']);
  });

  return errors;
}

/**
 * Returns the list of model field paths that fail the required-field check.
 * Used for legacy Section JSON imports where JSON keys already match model names.
 * When `requireCableName` is false, the cable_name check is skipped.
 */
export function getMissingRequiredFields(section: Section, requireCableName = true): string[] {
  const missing: string[] = [];
  if (!section.name.trim()) missing.push('name');
  if (!section.type) missing.push('type');
  if (!section.cables_amount) missing.push('cables_amount');
  if (requireCableName && !section.cable_name) missing.push('cable_name');
  section.supports.forEach((s, i) => {
    if (isNil(s.number)) missing.push(`supports[${i}].number`);
    if (isNil(s.spanLength) && i !== section.supports.length - 1) missing.push(`supports[${i}].spanLength`);
    if (isNil(s.spanAngle)) missing.push(`supports[${i}].spanAngle`);
    if (isNil(s.chainLength)) missing.push(`supports[${i}].chainLength`);
    if (isNil(s.attachmentHeight)) missing.push(`supports[${i}].attachmentHeight`);
  });
  return missing;
}
