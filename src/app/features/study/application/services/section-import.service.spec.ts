/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MessageService } from 'primeng/api';
import { SectionImportService } from './section-import.service';
import { SectionService } from '@services/section/section.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { Section, Study } from '@shared/domain';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { CatalogMaintenance } from '@shared/domain';

// ---------------------------------------------------------------------------
// Polyfill File.prototype.text — jsdom 26 does not implement it
// ---------------------------------------------------------------------------
if (typeof File !== 'undefined' && !File.prototype.text) {
  Object.defineProperty(File.prototype, 'text', {
    configurable: true,
    writable: true,
    value(): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(this as Blob);
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeJsonFile = (content: unknown, name = 'section.json'): File =>
  new File([JSON.stringify(content)], name, { type: 'application/json' });

const makeTextFile = (content: string, name = 'bad.json'): File =>
  new File([content], name, { type: 'application/json' });

const neverAccept = () => Promise.resolve(false);
const alwaysAccept = () => Promise.resolve(true);

/** Builds a minimal valid section payload (all required fields filled). */
const buildValidSectionPayload = (): Partial<Section> & Record<string, unknown> => ({
  uuid: 'sec-uuid-1',
  name: 'Test Section',
  type: 'phase',
  cables_amount: 1,
  cable_name: 'ASTER570',
  supports: [
    {
      ...createEmptySupport(),
      number: '1',
      spanLength: 100,
      spanAngle: 0,
      chainLength: 1,
      attachmentHeight: 20
    },
    {
      ...createEmptySupport(),
      number: '2',
      spanLength: null, // last support — spanLength may be null
      spanAngle: 0,
      chainLength: 1,
      attachmentHeight: 20
    }
  ]
});

/** Builds a minimal accroche object for GeoLiaison tests. */
const buildAccroche = (overrides: Record<string, string | null> = {}): Record<string, string | null> => ({
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
});

/** Builds a minimal portee object for GeoLiaison tests. */
const buildPortee = (
  ordre: string,
  designation: string,
  departOverrides: Record<string, string | null> = {},
  arriveeOverrides: Record<string, string | null> = {}
): Record<string, unknown> => ({
  PORTEE_UNITAIRE_ORDRE: ordre,
  PORTEE_LONGUEUR: '565.49',
  PORTEE_AZIMUT: '180.5',
  CM_DESIGNATION: 'CM_01',
  EEL_DESIGNATION: 'EEL_01',
  GMR_DESIGNATION: 'GMR_01',
  PORTEE_UNITAIRE_DESIGNATION: designation,
  'accroche depart': buildAccroche({ SUPPORT_NUMERO: ordre, ...departOverrides }),
  'accroche arrivee': buildAccroche({ SUPPORT_NUMERO: String(Number(ordre) + 1), ...arriveeOverrides })
});

/** Builds a valid GeoLiaison payload with 2 portees. */
const buildValidGeoLiaisonPayload = (): Record<string, unknown> => ({
  cantons: [
    {
      general: {
        CANTON_CUR: 'geo-uuid-1',
        CABLE_ADR: 'GeoSection',
        CANTON_TYPE: 'PHASE',
        FAISCEAU_CABLES_NOMBRE: '2',
        PHASE_ELECTRIQUE_NUMERO: '1',
        appartenance: [
          {
            LIT_ADR: 'LitName',
            LIT_IDR: 'LIT001',
            BRANCHE_IDR: 'FLAMAL73MENUE01',
            TENSION_ELECTRIQUE_IDR: '225kV',
            TENSION_ELECTRIQUE_ADR: '225 KV',
            LIAISON_IDR: 'LIA001',
            LIAISON_ADR: 'Liaison 225kV Flamal-Menuet'
          }
        ]
      },
      'portee unitaire': [
        buildPortee('2', 'Position 2 - Phase A', { SUPPORT_NUMERO: '2' }, { SUPPORT_NUMERO: '3' }),
        buildPortee('1', 'Position 1 - Phase A', { SUPPORT_NUMERO: '1' }, { SUPPORT_NUMERO: '2' })
      ]
    }
  ]
});

/** Builds a minimal valid Study containing no sections. */
const buildMockStudy = (sections: Section[] = []): Study => ({
  uuid: 'study-uuid-1',
  author_email: 'test@test.com',
  title: 'Test Study',
  shareable: false,
  created_at_offline: new Date().toISOString(),
  updated_at_offline: new Date().toISOString(),
  saved: true,
  sections
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SectionImportService', () => {
  let service: SectionImportService;
  let sectionServiceMock: vi.Mocked<SectionService>;
  let messageServiceMock: vi.Mocked<MessageService>;
  let loggerSpy: vi.Mocked<LoggerService>;
  let maintenanceServiceMock: { getMaintenance: ReturnType<typeof vi.fn> };

  const mockMaintenanceData: CatalogMaintenance[] = [
    {
      maintenance_center: 'CM_01',
      maintenance_center_id: 'MC_ID_01',
      regional_team: 'GMR_01',
      regional_team_id: 'GMR_ID_01',
      maintenance_team: 'EEL_01',
      maintenance_team_id: 'EEL_ID_01'
    }
  ];

  beforeEach(() => {
    sectionServiceMock = {
      createOrUpdateSection: vi.fn().mockResolvedValue(undefined),
      deleteSection: vi.fn().mockResolvedValue(undefined),
      duplicateSection: vi.fn(),
      getSectionByUuid: vi.fn()
    } as unknown as vi.Mocked<SectionService>;

    messageServiceMock = { add: vi.fn() } as unknown as vi.Mocked<MessageService>;

    loggerSpy = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn()
    } as unknown as vi.Mocked<LoggerService>;

    maintenanceServiceMock = {
      getMaintenance: vi.fn().mockResolvedValue(mockMaintenanceData)
    };

    TestBed.configureTestingModule({
      providers: [
        SectionImportService,
        { provide: SectionService, useValue: sectionServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: LoggerService, useValue: loggerSpy },
        { provide: MaintenanceService, useValue: maintenanceServiceMock }
      ]
    });
    service = TestBed.inject(SectionImportService);
  });

  // -------------------------------------------------------------------------
  // accepts()
  // -------------------------------------------------------------------------

  describe('accepts()', () => {
    it('should accept .json files', () => {
      expect(service.accepts(new File([], 'section.json'))).toBe(true);
    });

    it('should accept .JSON files (case-insensitive)', () => {
      expect(service.accepts(new File([], 'section.JSON'))).toBe(true);
    });

    it('should reject non-json files', () => {
      expect(service.accepts(new File([], 'section.csv'))).toBe(false);
      expect(service.accepts(new File([], 'section.clst'))).toBe(false);
      expect(service.accepts(new File([], 'section.txt'))).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // checkCollision()
  // -------------------------------------------------------------------------

  describe('checkCollision()', () => {
    it('should return null when studyContext is not set', async () => {
      const file = makeJsonFile({ uuid: 'sec-uuid-1' });
      const result = await service.checkCollision(file);
      expect(result).toBeNull();
    });

    it('should return null when no section in study matches the UUID', async () => {
      service.setStudyContext(buildMockStudy());
      const file = makeJsonFile({ uuid: 'unknown-uuid' });
      expect(await service.checkCollision(file)).toBeNull();
    });

    it('should return collision info when UUID matches an existing section', async () => {
      const existing = { ...createEmptySection(), uuid: 'sec-uuid-1', name: 'Existing Section' } as Section;
      service.setStudyContext(buildMockStudy([existing]));
      const file = makeJsonFile({ uuid: 'sec-uuid-1' });

      const result = await service.checkCollision(file);
      expect(result).toEqual({ uuid: 'sec-uuid-1', label: 'Existing Section' });
    });

    it('should return null when file has no uuid field', async () => {
      service.setStudyContext(buildMockStudy());
      const file = makeJsonFile({ name: 'No UUID here' });
      expect(await service.checkCollision(file)).toBeNull();
    });

    it('should return null when file content is invalid JSON', async () => {
      service.setStudyContext(buildMockStudy());
      const file = makeTextFile('{invalid json}');
      expect(await service.checkCollision(file)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // processFile() — no study context
  // -------------------------------------------------------------------------

  describe('processFile() — no study context', () => {
    it('should throw PERSISTENCE_ERROR when no study context is set', async () => {
      const file = makeJsonFile(buildValidSectionPayload());
      await expect(service.processFile(file, neverAccept)).rejects.toMatchObject({
        code: 'PERSISTENCE_ERROR',
        stage: 'PERSISTENCE'
      });
    });
  });

  // -------------------------------------------------------------------------
  // processFile() — parsing
  // -------------------------------------------------------------------------

  describe('processFile() — parsing', () => {
    beforeEach(() => {
      service.setStudyContext(buildMockStudy());
    });

    it('should throw FILE_PARSE_ERROR for malformed JSON', async () => {
      const file = makeTextFile('{invalid}');
      await expect(service.processFile(file, neverAccept)).rejects.toMatchObject({
        code: 'FILE_PARSE_ERROR',
        stage: 'PARSING'
      });
      expect(loggerSpy.error).toHaveBeenCalledWith('Error parsing section JSON', expect.anything());
    });
  });

  // -------------------------------------------------------------------------
  // processFile() — validation
  // -------------------------------------------------------------------------

  describe('processFile() — validation', () => {
    beforeEach(() => {
      service.setStudyContext(buildMockStudy());
    });

    it('should throw VALIDATION_ERROR when name is empty', async () => {
      const payload = { ...buildValidSectionPayload(), name: '' };
      await expect(service.processFile(makeJsonFile(payload), neverAccept)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        stage: 'VALIDATION',
        message: expect.stringContaining('name')
      });
    });

    it('should throw VALIDATION_ERROR when cable_name is missing', async () => {
      const payload = { ...buildValidSectionPayload(), cable_name: undefined };
      await expect(service.processFile(makeJsonFile(payload), neverAccept)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        stage: 'VALIDATION',
        message: expect.stringContaining('cable_name')
      });
    });

    it('should throw VALIDATION_ERROR when cables_amount is 0', async () => {
      const payload = { ...buildValidSectionPayload(), cables_amount: 0 };
      await expect(service.processFile(makeJsonFile(payload), neverAccept)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        stage: 'VALIDATION',
        message: expect.stringContaining('cables_amount')
      });
    });

    it('should throw VALIDATION_ERROR when a support spanLength is out of bounds (> 5000)', async () => {
      const payload = buildValidSectionPayload();
      (payload.supports as ReturnType<typeof createEmptySupport>[])[0].spanLength = 99999;
      await expect(service.processFile(makeJsonFile(payload), neverAccept)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        stage: 'VALIDATION'
      });
    });

    it('should throw VALIDATION_ERROR when a support attachmentHeight is out of bounds (< -100)', async () => {
      const payload = buildValidSectionPayload();
      (payload.supports as ReturnType<typeof createEmptySupport>[])[0].attachmentHeight = -200;
      await expect(service.processFile(makeJsonFile(payload), neverAccept)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        stage: 'VALIDATION'
      });
    });
  });

  // -------------------------------------------------------------------------
  // processFile() — success
  // -------------------------------------------------------------------------

  describe('processFile() — success', () => {
    it('should persist the section and emit success notification', async () => {
      service.setStudyContext(buildMockStudy());
      const payload = buildValidSectionPayload();
      const file = makeJsonFile(payload);

      const result = await service.processFile(file, neverAccept);

      expect(sectionServiceMock.createOrUpdateSection).toHaveBeenCalledTimes(1);
      expect(result).not.toBeNull();
      expect(result?.uuid).toBe('sec-uuid-1');
      expect(messageServiceMock.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('should merge imported data on top of createEmptySection defaults', async () => {
      service.setStudyContext(buildMockStudy());
      const payload = buildValidSectionPayload();
      const file = makeJsonFile(payload);

      const result = await service.processFile(file, neverAccept);

      // Fields from the payload are preserved
      expect(result?.name).toBe('Test Section');
      expect(result?.cable_name).toBe('ASTER570');
    });

    it('should merge supports on top of createEmptySupport defaults', async () => {
      service.setStudyContext(buildMockStudy());
      const payload = buildValidSectionPayload();
      const file = makeJsonFile(payload);

      const result = await service.processFile(file, neverAccept);

      expect(result?.supports[0].number).toBe('1');
      expect(result?.supports[0].spanLength).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // processFile() — UUID collision flow
  // -------------------------------------------------------------------------

  describe('processFile() — UUID collision flow', () => {
    it('should return null when user rejects collision replacement', async () => {
      const existing = { ...createEmptySection(), uuid: 'sec-uuid-1', name: 'Existing' } as Section;
      service.setStudyContext(buildMockStudy([existing]));
      const file = makeJsonFile(buildValidSectionPayload());

      const result = await service.processFile(file, neverAccept);

      expect(result).toBeNull();
      expect(sectionServiceMock.deleteSection).not.toHaveBeenCalled();
      expect(sectionServiceMock.createOrUpdateSection).not.toHaveBeenCalled();
    });

    it('should delete existing section and re-create when user accepts collision replacement', async () => {
      const existing = { ...createEmptySection(), uuid: 'sec-uuid-1', name: 'Existing' } as Section;
      service.setStudyContext(buildMockStudy([existing]));
      const file = makeJsonFile(buildValidSectionPayload());

      const result = await service.processFile(file, alwaysAccept);

      expect(sectionServiceMock.deleteSection).toHaveBeenCalledWith(expect.anything(), existing);
      expect(sectionServiceMock.createOrUpdateSection).toHaveBeenCalledTimes(1);
      expect(result).not.toBeNull();
    });

    it('should throw PERSISTENCE_ERROR when deleteSection fails during collision replacement', async () => {
      const existing = { ...createEmptySection(), uuid: 'sec-uuid-1', name: 'Existing' } as Section;
      service.setStudyContext(buildMockStudy([existing]));
      sectionServiceMock.deleteSection.mockRejectedValue(new Error('delete failed'));
      const file = makeJsonFile(buildValidSectionPayload());

      await expect(service.processFile(file, alwaysAccept)).rejects.toMatchObject({
        code: 'PERSISTENCE_ERROR',
        stage: 'PERSISTENCE'
      });
      expect(loggerSpy.error).toHaveBeenCalledWith('Error deleting existing section', expect.any(Error));
    });
  });

  // -------------------------------------------------------------------------
  // processFile() — persistence error
  // -------------------------------------------------------------------------

  describe('processFile() — persistence error', () => {
    it('should throw PERSISTENCE_ERROR when createOrUpdateSection fails', async () => {
      service.setStudyContext(buildMockStudy());
      sectionServiceMock.createOrUpdateSection.mockRejectedValue(new Error('db error'));
      const file = makeJsonFile(buildValidSectionPayload());

      await expect(service.processFile(file, neverAccept)).rejects.toMatchObject({
        code: 'PERSISTENCE_ERROR',
        stage: 'PERSISTENCE'
      });
      expect(loggerSpy.error).toHaveBeenCalledWith('Error persisting section', expect.any(Error));
    });
  });

  // -------------------------------------------------------------------------
  // setStudyContext() / studyContext signal
  // -------------------------------------------------------------------------

  describe('setStudyContext()', () => {
    it('should update the studyContext signal', () => {
      const study = buildMockStudy();
      service.setStudyContext(study);
      expect(service.studyContext()).toBe(study);
    });
  });

  // -------------------------------------------------------------------------
  // GeoLiaison format — checkCollision()
  // -------------------------------------------------------------------------

  describe('checkCollision() — GeoLiaison format', () => {
    it('should detect UUID from CANTON_CUR in GeoLiaison format', async () => {
      const existing = {
        ...createEmptySection(),
        uuid: 'geo-uuid-1',
        name: 'Existing GeoSection'
      } as Section;
      service.setStudyContext(buildMockStudy([existing]));
      const file = makeJsonFile(buildValidGeoLiaisonPayload());

      const result = await service.checkCollision(file);
      expect(result).toEqual({ uuid: 'geo-uuid-1', label: 'Existing GeoSection' });
    });

    it('should return null for GeoLiaison file with no matching UUID in study', async () => {
      service.setStudyContext(buildMockStudy());
      const file = makeJsonFile(buildValidGeoLiaisonPayload());

      expect(await service.checkCollision(file)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // GeoLiaison format — processFile()
  // -------------------------------------------------------------------------

  describe('processFile() — GeoLiaison format', () => {
    beforeEach(() => {
      service.setStudyContext(buildMockStudy());
    });

    it('should map UUID from CANTON_CUR', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      expect(result).not.toBeNull();
      expect(result?.uuid).toBe('geo-uuid-1');
    });

    it('should map section fields from general', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      expect(result?.name).toBe('FLAMAL73MENUE01-PHASE1-1-SET19-3-SET19');
      expect(result?.cable_name).toBe('GeoSection');
      expect(result?.type).toBe('phase');
      expect(result?.cables_amount).toBe(2);
      expect(result?.electric_phase_number).toBe(1);
    });

    it('should map appartenance fields', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      expect(result?.lit_name).toBe('LitName');
      expect(result?.lit_code).toBe('LIT001');
      expect(result?.link_name).toBe('LIA001');
      expect(result?.branch_idr).toBe('01');
      expect(result?.voltage_idr).toBeUndefined();
    });

    it('should lookup maintenance IDs from MaintenanceService', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      expect(result?.maintenance_center_id).toBe('MC_ID_01');
      expect(result?.maintenance_center_names).toEqual(['CM_01']);
      expect(result?.maintenance_team_id).toBe('EEL_ID_01');
      expect(result?.regional_team_id).toBe('GMR_ID_01');
      expect(result?.regional_maintenance_center_names).toEqual(['GMR_01']);
    });

    it('should use CM_DESIGNATION/EEL_DESIGNATION/GMR_DESIGNATION from the first portee (sorted)', async () => {
      const payload = buildValidGeoLiaisonPayload();
      // Portee with ordre=1 has CM_DESIGNATION CM_01, ordre=2 also has CM_01 in default builder.
      // Override ordre=1 portee to use a different CM to confirm first portee (ordre=1) is used.
      const portees = (payload['cantons'] as Record<string, unknown>[])[0]['portee unitaire'] as Record<
        string,
        unknown
      >[];
      // portee at index 1 has ordre=1 (unsorted), override its CM to something else
      portees[1] = { ...portees[1], CM_DESIGNATION: 'CM_FIRST' };
      portees[0] = { ...portees[0], CM_DESIGNATION: 'CM_SECOND' };

      maintenanceServiceMock.getMaintenance.mockResolvedValue([
        { ...mockMaintenanceData[0], maintenance_center: 'CM_FIRST', maintenance_center_id: 'MC_FIRST_ID' }
      ]);

      const file = makeJsonFile(payload);
      const result = await service.processFile(file, neverAccept);

      // After sorting by ordre, portee with ordre=1 comes first → CM_FIRST
      expect(result?.maintenance_center_names).toEqual(['CM_FIRST']);
    });

    it('should sort supports by PORTEE_UNITAIRE_ORDRE ascending', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      // Payload has ordre=2 first, ordre=1 second. After sort, support[0] comes from portee ordre=1.
      expect(result?.supports[0].number).toBe('1'); // accroche depart of portee ordre=1
    });

    it('should create a support from accroche arrivee of the last portee', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      // 2 portees → 2 (depart) + 1 (arrivee of last) = 3 supports
      expect(result?.supports.length).toBe(3);
      // Last support is from arrivee of portee ordre=2
      const lastSupport = result?.supports[result.supports.length - 1];
      expect(lastSupport?.number).toBe('3'); // arrivee of portee ordre=2 has SUPPORT_NUMERO='3'
    });

    it('should parse numeric string fields to numbers', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      const firstSupport = result?.supports[0];
      expect(firstSupport?.spanLength).toBe(565.49);
      expect(firstSupport?.spanAzimut).toBe(180.5);
      expect(firstSupport?.attachmentHeight).toBe(25.0);
      expect(firstSupport?.xFootLambert93).toBe(123456.0);
      expect(firstSupport?.yFootLambert93).toBe(789012.0);
    });

    it('should extract attachmentPosition from PORTEE_UNITAIRE_DESIGNATION', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      // First portee (ordre=1) has designation "Position 1 - Phase A"
      expect(result?.supports[0].attachmentPosition).toBe('1');
    });

    it('should map cable_name from CABLE_ADR', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      expect(result?.cable_name).toBe('GeoSection');
    });

    it('should handle null maintenance lookup gracefully when no match found', async () => {
      maintenanceServiceMock.getMaintenance.mockResolvedValue([]);
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      expect(result?.maintenance_center_id).toBeUndefined();
      expect(result?.maintenance_team_id).toBeUndefined();
      expect(result?.regional_team_id).toBeUndefined();
    });

    it('should create a default initial condition with a matching selected_initial_condition_uuid', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      expect(result?.initial_conditions).toHaveLength(1);
      expect(result?.selected_initial_condition_uuid).toBe(result?.initial_conditions[0].uuid);
      expect(result?.initial_conditions[0].base_temperature).toBe(15);
      expect(result?.initial_conditions[0].base_parameters).toBeNull();
    });

    it('should set spanLength to null on the last support', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      const lastSupport = result?.supports[result.supports.length - 1];
      expect(lastSupport?.spanLength).toBeNull();
    });

    it('should fail with field names in the error when accroche fields are null (real-world GeoLiaison file)', async () => {
      // Mimics a real CDG19 file where all accroche fields are null
      const nullAccroche = () => ({
        ANGLE_LIGNE: null,
        ACCROCHE_SET: '19',
        ACCROCHE_CABLE_Z_LAMBERT93: null,
        HAUTEUR_SOUS_CONSOLE: null,
        LONGUEUR_BRAS: null,
        CHAINE_DRN_ADR: null,
        CHAINE_DRN_IDR: null,
        CHAINE_DRN_LONGUEUR: null,
        CHAINE_DRN_POIDS: null,
        CHAINE_EN_V: null,
        CONTREPOIDS: null,
        CHAINE_DRN_SURFACE: null,
        PIED_Z_LAMBERT93: null,
        PIED_X_LAMBERT93: null,
        PIED_Y_LAMBERT93: null,
        SUPPORT_ADR: null,
        SUPPORT_IDR: null,
        SUPPORT_NUMERO: null,
        SUPPORT_TOWER: null
      });
      const payload = {
        cantons: [
          {
            general: {
              CANTON_CUR: 'cdg19-uuid',
              CABLE_ADR: 'Conducteur de phase',
              CANTON_TYPE: 'PHASE',
              FAISCEAU_CABLES_NOMBRE: '1.0',
              PHASE_ELECTRIQUE_NUMERO: null,
              appartenance: [
                {
                  LIT_ADR: 'LIT 400kV',
                  LIT_IDR: 'FLAMAL73MENUE',
                  BRANCHE_IDR: 'FLAMAL73MENUE01',
                  TENSION_ELECTRIQUE_ADR: '400 KV'
                }
              ]
            },
            'portee unitaire': [
              {
                PORTEE_UNITAIRE_ORDRE: '7.5',
                PORTEE_LONGUEUR: '444.1',
                PORTEE_AZIMUT: '107.821',
                CM_DESIGNATION: 'CM-NTR',
                EEL_DESIGNATION: 'NORMANDIE',
                GMR_DESIGNATION: 'GMR NORMANDIE',
                PORTEE_UNITAIRE_DESIGNATION: 'Position 1',
                'accroche depart': nullAccroche(),
                'accroche arrivee': nullAccroche()
              }
            ]
          }
        ]
      };
      const file = makeJsonFile(payload);
      await expect(service.processFile(file, neverAccept)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('ANGLE_LIGNE: null')
      });
    });
  });

  // -------------------------------------------------------------------------
  // GeoLiaison format — section name building (RG.CAN.NOM)
  // -------------------------------------------------------------------------

  describe('processFile() — GeoLiaison section name (RG.CAN.NOM)', () => {
    beforeEach(() => {
      service.setStudyContext(buildMockStudy());
    });

    it('should build the name from all components: branche-type+phase-startNum-SET-endNum-SET', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      // BRANCHE_IDR='FLAMAL73MENUE01', CANTON_TYPE='PHASE', PHASE='1'
      // supports[0].number='1', attachmentSet=19
      // supports[2].number='3', attachmentSet=19
      expect(result?.name).toBe('FLAMAL73MENUE01-PHASE1-1-SET19-3-SET19');
    });

    it('should omit phase number when CANTON_TYPE is GARDE', async () => {
      const payload = buildValidGeoLiaisonPayload();
      const general = (payload['cantons'] as Record<string, unknown>[])[0]['general'] as Record<string, unknown>;
      general['CANTON_TYPE'] = 'GARDE';
      general['PHASE_ELECTRIQUE_NUMERO'] = null;

      const file = makeJsonFile(payload);
      const result = await service.processFile(file, neverAccept);

      expect(result?.name).toBe('FLAMAL73MENUE01-GARDE-1-SET19-3-SET19');
    });

    it('should omit the branch prefix when BRANCHE_IDR is null', async () => {
      const payload = buildValidGeoLiaisonPayload();
      const appartenance = ((payload['cantons'] as Record<string, unknown>[])[0]['general'] as Record<string, unknown>)[
        'appartenance'
      ] as Record<string, unknown>[];
      appartenance[0]['BRANCHE_IDR'] = null;

      const file = makeJsonFile(payload);
      const result = await service.processFile(file, neverAccept);

      expect(result?.name).toBe('PHASE1-1-SET19-3-SET19');
    });

    it('should truncate support numbers to 5 characters', async () => {
      const payload = buildValidGeoLiaisonPayload();
      const portees = (payload['cantons'] as Record<string, unknown>[])[0]['portee unitaire'] as Record<
        string,
        unknown
      >[];
      // Override SUPPORT_NUMERO on accroche depart of portee ordre=1 and arrivee of portee ordre=2
      (portees[1]['accroche depart'] as Record<string, unknown>)['SUPPORT_NUMERO'] = 'ABCDE12345';
      (portees[0]['accroche arrivee'] as Record<string, unknown>)['SUPPORT_NUMERO'] = 'ZYXWV99999';

      const file = makeJsonFile(payload);
      const result = await service.processFile(file, neverAccept);

      expect(result?.name).toContain('ABCDE');
      expect(result?.name).not.toContain('ABCDE12345');
    });

    it('should omit SET parts when ACCROCHE_SET is null', async () => {
      const payload = buildValidGeoLiaisonPayload();
      const portees = (payload['cantons'] as Record<string, unknown>[])[0]['portee unitaire'] as Record<
        string,
        unknown
      >[];
      // Null out ACCROCHE_SET on the first departure and last arrival accroches
      (portees[1]['accroche depart'] as Record<string, unknown>)['ACCROCHE_SET'] = null;
      (portees[0]['accroche arrivee'] as Record<string, unknown>)['ACCROCHE_SET'] = null;

      const file = makeJsonFile(payload);
      const result = await service.processFile(file, neverAccept);

      expect(result?.name).not.toContain('SET');
    });
  });

  // -------------------------------------------------------------------------
  // GeoLiaison format — invalid file (RG.CAN.OUV-BTN.3)
  // -------------------------------------------------------------------------

  describe('processFile() — invalid GeoLiaison format', () => {
    it('should throw VALIDATION_ERROR with GeoLiaison message when cantons present but CANTON_CUR missing', async () => {
      service.setStudyContext(buildMockStudy());
      const invalidPayload = {
        cantons: [
          {
            general: {
              CABLE_ADR: 'SomeName'
              // CANTON_CUR intentionally absent
            },
            'portee unitaire': []
          }
        ]
      };
      const file = makeJsonFile(invalidPayload);
      await expect(service.processFile(file, neverAccept)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Fichier de géoliaison à importer non conforme.',
        stage: 'VALIDATION'
      });
    });
  });

  // -------------------------------------------------------------------------
  // Legacy Section JSON — fallback intact
  // -------------------------------------------------------------------------

  describe('processFile() — legacy Section JSON fallback', () => {
    it('should still process a valid legacy section JSON (no cantons key)', async () => {
      service.setStudyContext(buildMockStudy());
      const payload = buildValidSectionPayload();
      const file = makeJsonFile(payload);

      const result = await service.processFile(file, neverAccept);
      expect(result).not.toBeNull();
      expect(result?.uuid).toBe('sec-uuid-1');
    });
  });
});
