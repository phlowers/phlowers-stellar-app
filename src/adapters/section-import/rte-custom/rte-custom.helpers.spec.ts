/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Support } from '@shared/domain';
import { createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { Attachment, SectionImportFile } from './rte-custom.interfaces';
import {
  buildSectionName,
  extractAttachmentPosition,
  extractCantonUuid,
  hasCantons,
  isRteCantonFormat,
  normalizeVoltage,
  validateImportedSectionFields
} from './rte-custom.helpers';

/** Builds a minimal Support for helper tests, overriding only the fields under test. */
const buildSupport = (overrides: Partial<Support> = {}): Support => ({
  ...createEmptySupport(),
  ...overrides
});

/** Builds a minimal valid Accroche for helper tests, overriding only the fields under test. */
const buildAccroche = (overrides: Partial<Attachment> = {}): Attachment =>
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
  }) as Attachment;

/** Builds a minimal valid SectionImportFile payload for helper tests. */
const buildSectionImportFile = (overrides: {
  general?: Record<string, unknown>;
  portee?: Record<string, unknown>;
  depart?: Partial<Attachment>;
  arrivee?: Partial<Attachment>;
}): SectionImportFile =>
  ({
    cantons: [
      {
        general: {
          CANTON_CUR: 'CANTON-1',
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
  }) as unknown as SectionImportFile;

describe('hasCantons', () => {
  it('should be true for a non-empty cantons array', () => {
    expect(hasCantons({ cantons: [{}] })).toBe(true);
  });

  it('should be false for an empty array, a missing key and non-objects', () => {
    expect(hasCantons({ cantons: [] })).toBe(false);
    expect(hasCantons({})).toBe(false);
    expect(hasCantons(null)).toBe(false);
    expect(hasCantons('text')).toBe(false);
  });
});

describe('isRteCantonFormat', () => {
  it('should be true for a canton with a string CANTON_CUR', () => {
    expect(isRteCantonFormat(buildSectionImportFile({}))).toBe(true);
  });

  it('should be false when the first canton or its general block is malformed', () => {
    expect(isRteCantonFormat({ cantons: [null] })).toBe(false);
    expect(isRteCantonFormat({ cantons: [{ general: null }] })).toBe(false);
    expect(isRteCantonFormat({ cantons: [{ general: { CANTON_CUR: 12 } }] })).toBe(false);
  });
});

describe('extractCantonUuid', () => {
  it('should return the trimmed CANTON_CUR', () => {
    expect(extractCantonUuid(buildSectionImportFile({ general: { CANTON_CUR: '  ABC  ' } }))).toBe('ABC');
  });

  it('should return null for a blank CANTON_CUR or a malformed file', () => {
    expect(extractCantonUuid(buildSectionImportFile({ general: { CANTON_CUR: '   ' } }))).toBeNull();
    expect(extractCantonUuid({ cantons: [] })).toBeNull();
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

describe('validateImportedSectionFields', () => {
  it('should return no errors for a fully valid payload', () => {
    expect(validateImportedSectionFields(buildSectionImportFile({}))).toEqual([]);
  });

  it('should report CABLE_ADR when missing', () => {
    const errors = validateImportedSectionFields(buildSectionImportFile({ general: { CABLE_ADR: null } }));
    expect(errors).toContainEqual({ field: 'CABLE_ADR', value: null });
  });

  it('should report CANTON_TYPE when missing', () => {
    const errors = validateImportedSectionFields(buildSectionImportFile({ general: { CANTON_TYPE: null } }));
    expect(errors).toContainEqual({ field: 'CANTON_TYPE', value: null });
  });

  it('should report FAISCEAU_CABLES_NOMBRE when missing', () => {
    const errors = validateImportedSectionFields(buildSectionImportFile({ general: { FAISCEAU_CABLES_NOMBRE: null } }));
    expect(errors).toContainEqual({ field: 'FAISCEAU_CABLES_NOMBRE', value: null });
  });

  it('should report a single "portee unitaire" error when the portee array is empty', () => {
    const payload = buildSectionImportFile({});
    payload.cantons[0]['portee unitaire'] = [];
    expect(validateImportedSectionFields(payload)).toEqual([{ field: 'portee unitaire', value: null }]);
  });

  it('should report PORTEE_LONGUEUR and PORTEE_AZIMUT when missing', () => {
    const errors = validateImportedSectionFields(
      buildSectionImportFile({ portee: { PORTEE_LONGUEUR: null, PORTEE_AZIMUT: null } })
    );
    expect(errors).toContainEqual({ field: 'PORTEE_LONGUEUR', value: null });
    expect(errors).toContainEqual({ field: 'PORTEE_AZIMUT', value: null });
  });

  it('should report a missing required accroche field on the depart accroche', () => {
    const errors = validateImportedSectionFields(buildSectionImportFile({ depart: { ANGLE_LIGNE: null } }));
    expect(errors).toContainEqual({ field: 'ANGLE_LIGNE', value: null });
  });

  it('should report SUPPORT_NUMERO when missing on the depart accroche', () => {
    const errors = validateImportedSectionFields(buildSectionImportFile({ depart: { SUPPORT_NUMERO: null } }));
    expect(errors).toContainEqual({ field: 'SUPPORT_NUMERO', value: null });
  });

  it('should not check the arrivee accroche of a non-last portee', () => {
    const payload = buildSectionImportFile({});
    // Add a second, valid portee so the first one (index 0) is no longer the last.
    payload.cantons[0]['portee unitaire'].push({
      PORTEE_UNITAIRE_ORDRE: '2',
      PORTEE_LONGUEUR: '50.0',
      PORTEE_AZIMUT: '20.0',
      'accroche depart': buildAccroche({ SUPPORT_NUMERO: '3' }),
      'accroche arrivee': buildAccroche({ SUPPORT_NUMERO: '4' })
    } as unknown as SectionImportFile['cantons'][0]['portee unitaire'][0]);
    (payload.cantons[0]['portee unitaire'][0]['accroche arrivee'] as unknown as Record<string, unknown>)[
      'ANGLE_LIGNE'
    ] = null;

    const errors = validateImportedSectionFields(payload);
    expect(errors).toEqual([]);
  });

  it('should deduplicate the same missing field reported across multiple portees', () => {
    const payload = buildSectionImportFile({ depart: { ANGLE_LIGNE: null } });
    payload.cantons[0]['portee unitaire'].push({
      PORTEE_UNITAIRE_ORDRE: '2',
      PORTEE_LONGUEUR: '50.0',
      PORTEE_AZIMUT: '20.0',
      'accroche depart': buildAccroche({ SUPPORT_NUMERO: '3', ANGLE_LIGNE: null }),
      'accroche arrivee': buildAccroche({ SUPPORT_NUMERO: '4' })
    } as unknown as SectionImportFile['cantons'][0]['portee unitaire'][0]);

    const errors = validateImportedSectionFields(payload);
    expect(errors.filter((e) => e.field === 'ANGLE_LIGNE')).toHaveLength(1);
  });
});
