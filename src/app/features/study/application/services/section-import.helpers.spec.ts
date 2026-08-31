/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Section, Support } from '@shared/domain';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { Accroche, CantonFormat } from './section-import.interfaces';
import {
  applyFootCoordinates,
  buildReprojectionAngles,
  buildSectionName,
  computeMeanReprojectionDiffMeters,
  extractAttachmentPosition,
  extractBranchIdr,
  getMissingRequiredFields,
  normalizeVoltage,
  parseBooleanOrNull,
  parseFloatOrNull,
  validateCantonRawFields
} from './section-import.helpers';

/** Builds a minimal Support for helper tests, overriding only the fields under test. */
const buildSupport = (overrides: Partial<Support> = {}): Support => ({
  ...createEmptySupport(),
  ...overrides
});

/** Builds a minimal valid Accroche for helper tests, overriding only the fields under test. */
const buildAccroche = (overrides: Partial<Accroche> = {}): Accroche =>
  ({
    ANGLE_LIGNE: '5.0',
    ACCROCHE_SET: '19',
    ACCROCHE_CABLE_Z_LAMBERT93: '25.0',
    HAUTEUR_SOUS_CONSOLE: '2.5',
    LONGUEUR_BRAS: '3.0',
    CHAINE_DRN_ADR: 'ChainA',
    CHAINE_DRN_IDR: 'ChainA_IDR',
    CHAINE_DRN_LONGUEUR: '5.0',
    CHAINE_DRN_POIDS: '50.0',
    CHAINE_EN_V: 'false',
    CONTREPOIDS: '0',
    CHAINE_DRN_SURFACE: '0.5',
    PIED_Z_LAMBERT93: '100.0',
    PIED_X_LAMBERT93: '123456.0',
    PIED_Y_LAMBERT93: '789012.0',
    SUPPORT_ADR: 'Support A',
    SUPPORT_IDR: 'Support_IDR_A',
    SUPPORT_NUMERO: '1',
    SUPPORT_TOWER: 'TowerX',
    ...overrides
  }) as Accroche;

/** Builds a minimal valid CantonFormat payload for helper tests. */
const buildCantonFormat = (overrides: {
  general?: Record<string, unknown>;
  portee?: Record<string, unknown>;
  depart?: Partial<Accroche>;
  arrivee?: Partial<Accroche>;
}): CantonFormat =>
  ({
    cantons: [
      {
        general: {
          CABLE_ADR: 'GeoSection',
          CANTON_TYPE: 'PHASE',
          FAISCEAU_CABLES_NOMBRE: '2',
          ...overrides.general
        },
        'portee unitaire': [
          {
            PORTEE_UNITAIRE_ORDRE: '1',
            PORTEE_LONGUEUR: '100.0',
            PORTEE_AZIMUT: '10.0',
            ...overrides.portee,
            'accroche depart': buildAccroche(overrides.depart),
            'accroche arrivee': buildAccroche({ SUPPORT_NUMERO: '2', ...overrides.arrivee })
          }
        ]
      }
    ]
  }) as unknown as CantonFormat;

describe('extractBranchIdr', () => {
  it('should return "1" for "TESTLINE73STB01"', () => {
    expect(extractBranchIdr('TESTLINE73STB01')).toBe('1');
  });

  it('should return "2" for a branch ending with "02"', () => {
    expect(extractBranchIdr('SOMELINE02')).toBe('2');
  });

  it('should strip leading zero — "08" becomes "8"', () => {
    expect(extractBranchIdr('TESTLINE73STB08')).toBe('8');
  });

  it('should return "10" for a two-digit branch number without leading zero', () => {
    expect(extractBranchIdr('TESTLINE73STB10')).toBe('10');
  });
});

describe('parseBooleanOrNull', () => {
  it('should return null for null/undefined', () => {
    expect(parseBooleanOrNull(null)).toBeNull();
    expect(parseBooleanOrNull(undefined)).toBeNull();
  });

  it('should return the value unchanged for native booleans', () => {
    expect(parseBooleanOrNull(true)).toBe(true);
    expect(parseBooleanOrNull(false)).toBe(false);
  });

  it('should recognize lowercase "true"/"false"', () => {
    expect(parseBooleanOrNull('true')).toBe(true);
    expect(parseBooleanOrNull('false')).toBe(false);
  });

  it('should recognize capitalized "True"/"False"', () => {
    expect(parseBooleanOrNull('True')).toBe(true);
    expect(parseBooleanOrNull('False')).toBe(false);
  });

  it('should recognize "OUI"/"NON" case-insensitively', () => {
    expect(parseBooleanOrNull('oui')).toBe(true);
    expect(parseBooleanOrNull('non')).toBe(false);
  });

  it('should recognize "1"/"0"', () => {
    expect(parseBooleanOrNull('1')).toBe(true);
    expect(parseBooleanOrNull('0')).toBe(false);
  });

  it('should return null for unrecognized values', () => {
    expect(parseBooleanOrNull('maybe')).toBeNull();
  });
});

describe('normalizeVoltage', () => {
  it('should strip whitespace and uppercase', () => {
    expect(normalizeVoltage('225 KV')).toBe('225KV');
    expect(normalizeVoltage('225kV')).toBe('225KV');
  });

  it('should return an empty string for null/undefined', () => {
    expect(normalizeVoltage(null)).toBe('');
    expect(normalizeVoltage(undefined)).toBe('');
  });
});

describe('parseFloatOrNull', () => {
  it('should return null for null, undefined and empty string', () => {
    expect(parseFloatOrNull(null)).toBeNull();
    expect(parseFloatOrNull(undefined)).toBeNull();
    expect(parseFloatOrNull('')).toBeNull();
  });

  it('should parse a valid numeric string to a number', () => {
    expect(parseFloatOrNull('42.5')).toBe(42.5);
    expect(parseFloatOrNull('0')).toBe(0);
    expect(parseFloatOrNull('-13.2')).toBe(-13.2);
  });

  it('should parse a native number value via String() conversion', () => {
    expect(parseFloatOrNull(4)).toBe(4);
  });

  it('should return null for a non-numeric string', () => {
    expect(parseFloatOrNull('abc')).toBeNull();
  });

  it('should return null for an object value', () => {
    expect(parseFloatOrNull({})).toBeNull();
  });
});

describe('extractAttachmentPosition', () => {
  it('should return null for a null value', () => {
    expect(extractAttachmentPosition(null)).toBeNull();
  });

  it('should extract a single-digit position number', () => {
    expect(extractAttachmentPosition('Position 2 - Phase 8')).toBe('2');
  });

  it('should extract a two-digit position number', () => {
    expect(extractAttachmentPosition('Position 12 - Phase 3')).toBe('12');
  });

  it('should return null when the string does not match the expected pattern', () => {
    expect(extractAttachmentPosition('No position here')).toBeNull();
  });
});

describe('buildSectionName', () => {
  it('should build the full name from branch, type, phase and boundary supports', () => {
    const supports = [
      buildSupport({ number: '1', attachmentSet: 19 }),
      buildSupport({ number: '3', attachmentSet: 19 })
    ];
    expect(buildSectionName('TESTLINE73STB01', 'PHASE', '1', supports)).toBe('TESTLINE73STB01-PHASE1-1-SET19-3-SET19');
  });

  it('should omit the phase number when cantonType is GARDE', () => {
    const supports = [
      buildSupport({ number: '1', attachmentSet: 19 }),
      buildSupport({ number: '3', attachmentSet: 19 })
    ];
    expect(buildSectionName('TESTLINE73STB01', 'GARDE', '1', supports)).toBe('TESTLINE73STB01-GARDE-1-SET19-3-SET19');
  });

  it('should omit the branch prefix when rawBranchIdr is null', () => {
    const supports = [
      buildSupport({ number: '1', attachmentSet: 19 }),
      buildSupport({ number: '3', attachmentSet: 19 })
    ];
    expect(buildSectionName(null, 'PHASE', '1', supports)).toBe('PHASE1-1-SET19-3-SET19');
  });

  it('should truncate support numbers to 5 characters', () => {
    const supports = [
      buildSupport({ number: 'ABCDE12345', attachmentSet: 19 }),
      buildSupport({ number: '3', attachmentSet: 19 })
    ];
    expect(buildSectionName('BRA', 'PHASE', '1', supports)).toContain('ABCDE-');
  });

  it('should omit SET parts when attachmentSet is null', () => {
    const supports = [
      buildSupport({ number: '1', attachmentSet: null }),
      buildSupport({ number: '3', attachmentSet: null })
    ];
    expect(buildSectionName('BRA', 'PHASE', '1', supports)).not.toContain('SET');
  });

  it('should return an empty string when given no supports and no branch/type/phase', () => {
    expect(buildSectionName(null, null, null, [])).toBe('');
  });
});

describe('buildReprojectionAngles', () => {
  it('should return spanLength/lineAngle arrays with NaN/0 placeholders on the last support', () => {
    const supports = [
      buildSupport({ spanLength: 100, spanAngle: 5 }),
      buildSupport({ spanLength: 200, spanAngle: 10 }),
      buildSupport({ spanLength: 300, spanAngle: 15 })
    ];
    const { spanLength, lineAngle } = buildReprojectionAngles(supports);

    expect(spanLength.slice(0, 2)).toEqual([100, 200]);
    expect(Number.isNaN(spanLength[2])).toBe(true);
    expect(lineAngle).toEqual([5, 10, 0]);
  });
});

describe('applyFootCoordinates', () => {
  it('should set footLatitude/footLongitude by index', () => {
    const supports = [buildSupport(), buildSupport()];
    const result = applyFootCoordinates(supports, [45.1, 45.2], [3.1, 3.2]);

    expect(result[0].footLatitude).toBe(45.1);
    expect(result[0].footLongitude).toBe(3.1);
    expect(result[1].footLatitude).toBe(45.2);
    expect(result[1].footLongitude).toBe(3.2);
  });

  it('should default to null when the coordinate array is shorter than the supports array', () => {
    const supports = [buildSupport(), buildSupport()];
    const result = applyFootCoordinates(supports, [45.1], [3.1]);

    expect(result[1].footLatitude).toBeNull();
    expect(result[1].footLongitude).toBeNull();
  });

  it('should not mutate the original support objects', () => {
    const supports = [buildSupport()];
    const result = applyFootCoordinates(supports, [45.1], [3.1]);

    expect(supports[0].footLatitude).toBeNull();
    expect(result[0]).not.toBe(supports[0]);
  });
});

describe('computeMeanReprojectionDiffMeters', () => {
  it('should return 0 when reconstructed coordinates equal the surveyed ones', () => {
    expect(computeMeanReprojectionDiffMeters([100, 200], [300, 400], [100, 200], [300, 400])).toBe(0);
  });

  it('should compute the mean euclidean distance across all points', () => {
    const expectedDiffs = [0, 1, 2].map((i) => Math.hypot(123456.0 - (100 + i), 789012.0 - (200 + i)));
    const expectedMean = expectedDiffs.reduce((a, b) => a + b, 0) / expectedDiffs.length;

    const result = computeMeanReprojectionDiffMeters(
      [123456.0, 123456.0, 123456.0],
      [789012.0, 789012.0, 789012.0],
      [100, 101, 102],
      [200, 201, 202]
    );
    expect(result).toBeCloseTo(expectedMean, 6);
  });
});

describe('validateCantonRawFields', () => {
  it('should return no errors for a fully valid payload', () => {
    expect(validateCantonRawFields(buildCantonFormat({}))).toEqual([]);
  });

  it('should report CABLE_ADR when missing', () => {
    const errors = validateCantonRawFields(buildCantonFormat({ general: { CABLE_ADR: null } }));
    expect(errors).toContainEqual({ field: 'CABLE_ADR', value: null });
  });

  it('should report CANTON_TYPE when missing', () => {
    const errors = validateCantonRawFields(buildCantonFormat({ general: { CANTON_TYPE: null } }));
    expect(errors).toContainEqual({ field: 'CANTON_TYPE', value: null });
  });

  it('should report FAISCEAU_CABLES_NOMBRE when missing', () => {
    const errors = validateCantonRawFields(buildCantonFormat({ general: { FAISCEAU_CABLES_NOMBRE: null } }));
    expect(errors).toContainEqual({ field: 'FAISCEAU_CABLES_NOMBRE', value: null });
  });

  it('should report a single "portee unitaire" error when the portee array is empty', () => {
    const payload = buildCantonFormat({});
    payload.cantons[0]['portee unitaire'] = [];
    expect(validateCantonRawFields(payload)).toEqual([{ field: 'portee unitaire', value: null }]);
  });

  it('should report PORTEE_LONGUEUR and PORTEE_AZIMUT when missing', () => {
    const errors = validateCantonRawFields(
      buildCantonFormat({ portee: { PORTEE_LONGUEUR: null, PORTEE_AZIMUT: null } })
    );
    expect(errors).toContainEqual({ field: 'PORTEE_LONGUEUR', value: null });
    expect(errors).toContainEqual({ field: 'PORTEE_AZIMUT', value: null });
  });

  it('should report a missing required accroche field on the depart accroche', () => {
    const errors = validateCantonRawFields(buildCantonFormat({ depart: { ANGLE_LIGNE: null } }));
    expect(errors).toContainEqual({ field: 'ANGLE_LIGNE', value: null });
  });

  it('should report SUPPORT_NUMERO when missing on the depart accroche', () => {
    const errors = validateCantonRawFields(buildCantonFormat({ depart: { SUPPORT_NUMERO: null } }));
    expect(errors).toContainEqual({ field: 'SUPPORT_NUMERO', value: null });
  });

  it('should not check the arrivee accroche of a non-last portee', () => {
    const payload = buildCantonFormat({});
    // Add a second, valid portee so the first one (index 0) is no longer the last.
    payload.cantons[0]['portee unitaire'].push({
      PORTEE_UNITAIRE_ORDRE: '2',
      PORTEE_LONGUEUR: '50.0',
      PORTEE_AZIMUT: '20.0',
      'accroche depart': buildAccroche({ SUPPORT_NUMERO: '3' }),
      'accroche arrivee': buildAccroche({ SUPPORT_NUMERO: '4' })
    } as unknown as CantonFormat['cantons'][0]['portee unitaire'][0]);
    (payload.cantons[0]['portee unitaire'][0]['accroche arrivee'] as unknown as Record<string, unknown>)[
      'ANGLE_LIGNE'
    ] = null;

    const errors = validateCantonRawFields(payload);
    expect(errors).toEqual([]);
  });

  it('should deduplicate the same missing field reported across multiple portees', () => {
    const payload = buildCantonFormat({ depart: { ANGLE_LIGNE: null } });
    payload.cantons[0]['portee unitaire'].push({
      PORTEE_UNITAIRE_ORDRE: '2',
      PORTEE_LONGUEUR: '50.0',
      PORTEE_AZIMUT: '20.0',
      'accroche depart': buildAccroche({ SUPPORT_NUMERO: '3', ANGLE_LIGNE: null }),
      'accroche arrivee': buildAccroche({ SUPPORT_NUMERO: '4' })
    } as unknown as CantonFormat['cantons'][0]['portee unitaire'][0]);

    const errors = validateCantonRawFields(payload);
    expect(errors.filter((e) => e.field === 'ANGLE_LIGNE')).toHaveLength(1);
  });
});

describe('getMissingRequiredFields', () => {
  const buildValidSection = (): Section => ({
    ...createEmptySection(),
    name: 'Valid Section',
    type: 'phase',
    cables_amount: 1,
    cable_name: 'ASTER 570',
    supports: [
      buildSupport({ number: '1', spanLength: 100, spanAngle: 0, chainLength: 5, attachmentHeight: 10 }),
      buildSupport({ number: '2', spanLength: null, spanAngle: 0, chainLength: 5, attachmentHeight: 10 })
    ]
  });

  it('should return no missing fields for a fully valid section', () => {
    expect(getMissingRequiredFields(buildValidSection())).toEqual([]);
  });

  it('should report "name" when empty or blank', () => {
    expect(getMissingRequiredFields({ ...buildValidSection(), name: '' })).toContain('name');
    expect(getMissingRequiredFields({ ...buildValidSection(), name: '   ' })).toContain('name');
  });

  it('should report "type" when falsy', () => {
    expect(getMissingRequiredFields({ ...buildValidSection(), type: '' as unknown as Section['type'] })).toContain(
      'type'
    );
  });

  it('should report "cables_amount" when 0', () => {
    expect(getMissingRequiredFields({ ...buildValidSection(), cables_amount: 0 })).toContain('cables_amount');
  });

  it('should report "cable_name" when missing and requireCableName is true (default)', () => {
    expect(getMissingRequiredFields({ ...buildValidSection(), cable_name: undefined })).toContain('cable_name');
  });

  it('should not report "cable_name" when requireCableName is false', () => {
    expect(getMissingRequiredFields({ ...buildValidSection(), cable_name: undefined }, false)).not.toContain(
      'cable_name'
    );
  });

  it('should report per-support missing number/spanAngle/chainLength/attachmentHeight', () => {
    const section = buildValidSection();
    section.supports[0].number = null;
    section.supports[0].spanAngle = null;
    section.supports[0].chainLength = null;
    section.supports[0].attachmentHeight = null;

    const missing = getMissingRequiredFields(section);
    expect(missing).toContain('supports[0].number');
    expect(missing).toContain('supports[0].spanAngle');
    expect(missing).toContain('supports[0].chainLength');
    expect(missing).toContain('supports[0].attachmentHeight');
  });

  it('should report spanLength missing on a non-last support but not on the last support', () => {
    const section = buildValidSection();
    section.supports[0].spanLength = null;
    // supports[1] (last) already has spanLength: null and must NOT be reported.

    const missing = getMissingRequiredFields(section);
    expect(missing).toContain('supports[0].spanLength');
    expect(missing).not.toContain('supports[1].spanLength');
  });
});
