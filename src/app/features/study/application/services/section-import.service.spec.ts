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
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskError } from '@core/services/worker_python/tasks/types';
import { Section, Study } from '@shared/domain';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { CatalogMaintenance } from '@shared/domain';
import { SupportNameEntry } from '@shared/catalog/services/attachment.interfaces';
import { TranslocoService } from '@jsverse/transloco';

const geoLiaisonSupportCatalogMissingWarning =
  'The attachment support from the geolink file is not present in the application support catalog';

const sectionImportTranslations: Record<string, string> = {
  'sectionImport.fileTypeNotAllowed': 'File type not allowed',
  'sectionImport.fileReadError': 'Error reading file',
  'sectionImport.fileParseError': 'Error parsing file',
  'sectionImport.validationRequiredFields': 'Section is missing required fields',
  'sectionImport.validationSupportsBounds': 'Section has supports with values out of bounds',
  'sectionImport.importError': 'Error importing section',
  'sectionImport.deleteError': 'Error deleting section',
  'sectionImport.geoLiaisonFormatError': 'The geolink file to import is invalid.',
  'sectionImport.lambertReprojectionError': 'Error computing GPS coordinates from Lambert93 data',
  'sectionImport.catalogMissingWarning': geoLiaisonSupportCatalogMissingWarning,
  'sectionImport.importSuccess': 'Section imported successfully'
};

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
  let attachmentServiceMock: {
    addSupportNamesIfAbsent: ReturnType<typeof vi.fn>;
    resolveGeoLiaisonCatalogAttachment: ReturnType<typeof vi.fn>;
  };
  let chainsServiceMock: { getChains: ReturnType<typeof vi.fn> };
  let workerPythonServiceMock: { runTask: ReturnType<typeof vi.fn> };

  /** Default successful runTask mock: returns arrays matching the length of the input arrays. */
  const mockSuccessfulRunTask = (task: Task, inputs: Record<string, unknown>) => {
    if (task === Task.importLambert) {
      const lambertX = inputs['lambert_x'] as number[];
      return Promise.resolve({
        result: {
          latitude: lambertX.map((_, i) => 45 + i),
          longitude: lambertX.map((_, i) => 3 + i),
          azimuth: lambertX.map(() => 0),
          lambert_x: lambertX,
          lambert_y: inputs['lambert_y']
        },
        error: null,
        pythonErrorCode: null
      });
    }
    if (task === Task.importLambertAndValidate) {
      const lambertX = inputs['lambert_x'] as number[];
      return Promise.resolve({
        result: {
          localization: {
            latitude: lambertX.map((_, i) => 45 + i),
            longitude: lambertX.map((_, i) => 3 + i),
            azimuth: lambertX.map(() => 0),
            lambert_x: lambertX,
            lambert_y: inputs['lambert_y']
          },
          meanGpsDiff: 0.0001
        },
        error: null,
        pythonErrorCode: null
      });
    }
    if (task === Task.computeLocalization) {
      const spanLength = inputs['spanLength'] as number[];
      return Promise.resolve({
        result: {
          latitude: spanLength.map((_, i) => 45 + i),
          longitude: spanLength.map((_, i) => 3 + i),
          azimuth: spanLength.map(() => 0),
          lambert_x: spanLength.map((_, i) => 100 + i),
          lambert_y: spanLength.map((_, i) => 200 + i)
        },
        error: null,
        pythonErrorCode: null
      });
    }
    return Promise.resolve({ result: null, error: null, pythonErrorCode: null });
  };

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

    attachmentServiceMock = {
      addSupportNamesIfAbsent: vi.fn().mockResolvedValue(undefined),
      resolveGeoLiaisonCatalogAttachment: vi.fn().mockResolvedValue(undefined)
    };

    chainsServiceMock = {
      getChains: vi.fn().mockResolvedValue([])
    };

    workerPythonServiceMock = {
      runTask: vi.fn(mockSuccessfulRunTask)
    };

    TestBed.configureTestingModule({
      providers: [
        SectionImportService,
        { provide: SectionService, useValue: sectionServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: LoggerService, useValue: loggerSpy },
        { provide: MaintenanceService, useValue: maintenanceServiceMock },
        { provide: AttachmentService, useValue: attachmentServiceMock },
        { provide: ChainsService, useValue: chainsServiceMock },
        { provide: WorkerPythonService, useValue: workerPythonServiceMock },
        {
          provide: TranslocoService,
          useValue: {
            translate: (key: string, params?: Record<string, unknown>): string => {
              if (key === 'sectionImport.reprojectionInfo') {
                return `Reprojection using ${params?.['appName']} data model seems to add a mean absolute error of ${params?.['error']} m`;
              }
              return sectionImportTranslations[key] ?? key;
            }
          }
        }
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
      attachmentServiceMock.resolveGeoLiaisonCatalogAttachment.mockResolvedValue(undefined);
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
      expect(result?.branch_idr).toBe('1');
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
      // footLatitude/footLongitude come from the mocked Task.importLambertAndValidate result,
      // not from the raw PIED_X_LAMBERT93/PIED_Y_LAMBERT93 values anymore.
      expect(firstSupport?.footLatitude).toBe(45);
      expect(firstSupport?.footLongitude).toBe(3);
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

    it('should always keep support name equal to SUPPORT_IDR in both catalog and fallback branches', async () => {
      attachmentServiceMock.resolveGeoLiaisonCatalogAttachment.mockResolvedValueOnce({
        uuid: 'cat-1',
        created_at: 'c',
        updated_at: 'u',
        support_name: 'Support A',
        support_tower: 'Tower X',
        attachment_set: 19,
        cross_arm_length: 4,
        attachment_altitude: 40,
        attachment_set_x: 1,
        attachment_set_y: 2,
        attachment_set_z: 40
      });

      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      expect(result?.supports[0].name).toBe('Support_IDR_A');
      expect(result?.supports[1].name).toBe('Support_IDR_A');
    });

    it('should prioritize catalog attachmentSet/armLength/heightBelowConsole over file values when complete', async () => {
      attachmentServiceMock.resolveGeoLiaisonCatalogAttachment.mockResolvedValue({
        uuid: 'cat-1',
        created_at: 'c',
        updated_at: 'u',
        support_name: 'Support A',
        support_tower: 'Tower X',
        attachment_set: 7,
        cross_arm_length: 9.9,
        attachment_altitude: 99.9,
        attachment_set_x: 1,
        attachment_set_y: 2,
        attachment_set_z: 99.9
      });

      const payload = buildValidGeoLiaisonPayload();
      const portees = (payload.cantons as Record<string, unknown>[])[0]['portee unitaire'] as Record<string, unknown>[];
      (portees[0]['accroche depart'] as Record<string, unknown>)['ACCROCHE_SET'] = '19';
      (portees[0]['accroche depart'] as Record<string, unknown>)['LONGUEUR_BRAS'] = '3.0';
      (portees[0]['accroche depart'] as Record<string, unknown>)['HAUTEUR_SOUS_CONSOLE'] = '2.5';

      const result = await service.processFile(makeJsonFile(payload), neverAccept);
      const support = result?.supports[0];

      expect(support?.attachmentSet).toBe(7);
      expect(support?.armLength).toBe(9.9);
      expect(support?.heightBelowConsole).toBe(99.9);
    });

    it('should keep file attachmentSet and file armLength/heightBelowConsole and warn once when SUPPORT_IDR is absent from catalog', async () => {
      attachmentServiceMock.resolveGeoLiaisonCatalogAttachment.mockResolvedValue(undefined);

      const result = await service.processFile(makeJsonFile(buildValidGeoLiaisonPayload()), neverAccept);

      expect(result?.supports[0].attachmentSet).toBe(19);
      expect(result?.supports[0].armLength).toBe(3.0);
      expect(result?.supports[0].heightBelowConsole).toBe(2.5);
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn', detail: geoLiaisonSupportCatalogMissingWarning })
      );
    });

    it('should keep file attachmentSet and file armLength/heightBelowConsole and warn once when matching support exists but attachment set is absent', async () => {
      attachmentServiceMock.resolveGeoLiaisonCatalogAttachment.mockResolvedValue(undefined);

      const result = await service.processFile(makeJsonFile(buildValidGeoLiaisonPayload()), neverAccept);

      expect(result?.supports[0].attachmentSet).toBe(19);
      expect(result?.supports[0].armLength).toBe(3.0);
      expect(result?.supports[0].heightBelowConsole).toBe(2.5);
      expect(
        messageServiceMock.add.mock.calls.filter((call) =>
          [geoLiaisonSupportCatalogMissingWarning].includes(call[0].detail as string)
        )
      ).toHaveLength(1);
    });

    it('should accept zero values from catalog when complete geometry is present', async () => {
      attachmentServiceMock.resolveGeoLiaisonCatalogAttachment.mockResolvedValue({
        uuid: 'cat-1',
        created_at: 'c',
        updated_at: 'u',
        support_name: 'Support A',
        support_tower: 'Tower X',
        attachment_set: 0,
        cross_arm_length: 0,
        attachment_altitude: 0,
        attachment_set_x: 0,
        attachment_set_y: 0,
        attachment_set_z: 0
      });

      const result = await service.processFile(makeJsonFile(buildValidGeoLiaisonPayload()), neverAccept);

      expect(result?.supports[0].attachmentSet).toBe(0);
      expect(result?.supports[0].armLength).toBe(0);
      expect(result?.supports[0].heightBelowConsole).toBe(0);
    });

    it('should prioritize catalog chain details over file values when CHAINE_DRN_IDR is in the catalog', async () => {
      chainsServiceMock.getChains.mockResolvedValue([
        {
          uuid: 'chain-1',
          chain_name: 'ChainA_IDR',
          mean_length: 7.7,
          mean_mass: 707.8,
          v_chain: true,
          chain_type: 'suspension',
          chain_surface: 2.91
        }
      ]);

      const result = await service.processFile(makeJsonFile(buildValidGeoLiaisonPayload()), neverAccept);
      const support = result?.supports[0];

      expect(support?.chainName).toBe('ChainA_IDR');
      expect(support?.chainLength).toBe(7.7);
      expect(support?.chainWeight).toBe(707.8);
      expect(support?.chainV).toBe(true);
      expect(support?.chainSurface).toBe(2.91);
    });

    it('should apply catalog zero chain values over non-zero file values', async () => {
      chainsServiceMock.getChains.mockResolvedValue([
        {
          uuid: 'chain-1',
          chain_name: 'ChainA_IDR',
          mean_length: 0,
          mean_mass: 0,
          v_chain: false,
          chain_type: 'suspension',
          chain_surface: 0
        }
      ]);

      const result = await service.processFile(makeJsonFile(buildValidGeoLiaisonPayload()), neverAccept);
      const support = result?.supports[0];

      // File carries CHAINE_DRN_SURFACE 0.5 / LONGUEUR 5.0 / POIDS 50.0: the catalog still wins.
      expect(support?.chainLength).toBe(0);
      expect(support?.chainWeight).toBe(0);
      expect(support?.chainSurface).toBe(0);
    });

    it('should keep file chain details when CHAINE_DRN_IDR is absent from the catalog', async () => {
      chainsServiceMock.getChains.mockResolvedValue([
        {
          uuid: 'chain-2',
          chain_name: 'SomeOtherChain',
          mean_length: 7.7,
          mean_mass: 707.8,
          v_chain: true,
          chain_type: 'suspension',
          chain_surface: 2.91
        }
      ]);

      const result = await service.processFile(makeJsonFile(buildValidGeoLiaisonPayload()), neverAccept);
      const support = result?.supports[0];

      expect(support?.chainName).toBe('ChainA_IDR');
      expect(support?.chainLength).toBe(5.0);
      expect(support?.chainWeight).toBe(50.0);
      expect(support?.chainV).toBe(false);
      expect(support?.chainSurface).toBe(0.5);
    });

    it('should keep file chain details when the chain catalog is empty', async () => {
      chainsServiceMock.getChains.mockResolvedValue([]);

      const result = await service.processFile(makeJsonFile(buildValidGeoLiaisonPayload()), neverAccept);

      expect(result?.supports[0].chainLength).toBe(5.0);
      expect(result?.supports[0].chainSurface).toBe(0.5);
    });

    it('should keep the counterWeight from the file even when the chain is resolved from the catalog', async () => {
      chainsServiceMock.getChains.mockResolvedValue([
        {
          uuid: 'chain-1',
          chain_name: 'ChainA_IDR',
          mean_length: 7.7,
          mean_mass: 707.8,
          v_chain: true,
          chain_type: 'suspension',
          chain_surface: 2.91
        }
      ]);

      const payload = buildValidGeoLiaisonPayload();
      const portees = (payload.cantons as Record<string, unknown>[])[0]['portee unitaire'] as Record<string, unknown>[];
      (portees[1]['accroche depart'] as Record<string, unknown>)['CONTREPOIDS'] = '42';

      const result = await service.processFile(makeJsonFile(payload), neverAccept);

      expect(result?.supports[0].counterWeight).toBe(42);
    });

    it('should handle null maintenance lookup gracefully when no match found', async () => {
      maintenanceServiceMock.getMaintenance.mockResolvedValue([]);
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      expect(result?.maintenance_center_id).toBeUndefined();
      expect(result?.maintenance_team_id).toBeUndefined();
      expect(result?.regional_team_id).toBeUndefined();
    });

    it('should NOT create any initial condition on GeoLiaison import', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      expect(result?.initial_conditions).toHaveLength(0);
      expect(result?.selected_initial_condition_uuid).toBeUndefined();
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
  // GeoLiaison format — Lambert93 to GPS reprojection
  // -------------------------------------------------------------------------

  describe('processFile() — Lambert93 to GPS reprojection', () => {
    beforeEach(() => {
      service.setStudyContext(buildMockStudy());
    });

    it('should call importLambert, importLambertAndValidate and computeLocalization in order', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      await service.processFile(file, neverAccept);

      const calledTasks = workerPythonServiceMock.runTask.mock.calls.map((call) => call[0]);
      expect(calledTasks).toEqual([Task.importLambert, Task.importLambertAndValidate, Task.computeLocalization]);
    });

    it('should store mean_reprojection_diff_meters computed from the raw Lambert93 input vs. computeLocalization output', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      const result = await service.processFile(file, neverAccept);

      // 3 supports: raw lambert_x = [123456, 123456, 123456], reconstructed lambert_x = [100, 101, 102]
      // raw lambert_y = [789012, 789012, 789012], reconstructed lambert_y = [200, 201, 202]
      const expectedDiffs = [0, 1, 2].map((i) => Math.hypot(123456.0 - (100 + i), 789012.0 - (200 + i)));
      const expectedMean = expectedDiffs.reduce((a, b) => a + b, 0) / expectedDiffs.length;
      expect(result?.mean_reprojection_diff_meters).toBeCloseTo(expectedMean, 6);
    });

    it('should throw an ImportError and abort the import when a reprojection task fails', async () => {
      workerPythonServiceMock.runTask.mockImplementation((task: Task) => {
        if (task === Task.importLambert) {
          return Promise.resolve({ result: null, error: TaskError.CALCULATION_ERROR, pythonErrorCode: null });
        }
        return mockSuccessfulRunTask(task, {});
      });

      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      await expect(service.processFile(file, neverAccept)).rejects.toMatchObject({
        code: 'MAPPING_ERROR',
        stage: 'MAPPING'
      });
      expect(sectionServiceMock.createOrUpdateSection).not.toHaveBeenCalled();
    });

    it('should skip reprojection and still persist the section when a support has no raw Lambert93 coordinates', async () => {
      const payload = buildValidGeoLiaisonPayload();
      const portees = (payload.cantons as Record<string, unknown>[])[0]['portee unitaire'] as Record<string, unknown>[];
      (portees[0]['accroche depart'] as Record<string, unknown>)['PIED_X_LAMBERT93'] = null;

      const file = makeJsonFile(payload);
      const result = await service.processFile(file, neverAccept);

      expect(result).not.toBeNull();
      expect(result?.mean_reprojection_diff_meters).toBeNull();
      expect(result?.supports.every((s) => s.footLatitude === null && s.footLongitude === null)).toBe(true);
      expect(workerPythonServiceMock.runTask).not.toHaveBeenCalled();
      expect(sectionServiceMock.createOrUpdateSection).toHaveBeenCalledTimes(1);
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
        message: 'The geolink file to import is invalid.',
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

  // -------------------------------------------------------------------------
  // addSupportNamesIfAbsent integration (RG.CAN.ATT)
  // -------------------------------------------------------------------------

  describe('processFile() — addSupportNamesIfAbsent integration', () => {
    beforeEach(() => {
      service.setStudyContext(buildMockStudy());
    });

    it('should call addSupportNamesIfAbsent with SupportNameEntry[] from GeoLiaison accroches', async () => {
      const file = makeJsonFile(buildValidGeoLiaisonPayload());
      await service.processFile(file, neverAccept);

      expect(attachmentServiceMock.addSupportNamesIfAbsent).toHaveBeenCalledTimes(1);

      // Payload has 2 portees:
      // portee ordre=1: depart SUPPORT_IDR='Support_IDR_A' (SUPPORT_NUMERO='1')
      // portee ordre=2: depart SUPPORT_IDR='Support_IDR_A' (SUPPORT_NUMERO='2')
      // arrivee of last portee (ordre=2): SUPPORT_IDR='Support_IDR_A' (SUPPORT_NUMERO='3')
      // After sort by ordre: portee1 first, portee2 last
      const called = attachmentServiceMock.addSupportNamesIfAbsent.mock.calls[0][0] as SupportNameEntry[];
      expect(called.length).toBe(3);
      expect(called.every((e: SupportNameEntry) => e.supportName === 'Support_IDR_A')).toBe(true);
      expect(called.every((e: SupportNameEntry) => e.supportTower === 'TowerX')).toBe(true);
    });

    it('should not call addSupportNamesIfAbsent for legacy JSON import', async () => {
      const file = makeJsonFile(buildValidSectionPayload());
      await service.processFile(file, neverAccept);

      expect(attachmentServiceMock.addSupportNamesIfAbsent).not.toHaveBeenCalled();
    });

    it('should use SUPPORT_ADR as fallback when SUPPORT_IDR is empty string', async () => {
      // Override SUPPORT_IDR to empty string — ?? would not fall back, || does
      const payload = buildValidGeoLiaisonPayload();
      const portees = (payload.cantons as Record<string, unknown>[])[0]['portee unitaire'] as Record<string, unknown>[];
      portees.forEach((p) => {
        (p['accroche depart'] as Record<string, unknown>)['SUPPORT_IDR'] = '';
        (p['accroche arrivee'] as Record<string, unknown>)['SUPPORT_IDR'] = '';
      });

      const file = makeJsonFile(payload);
      await service.processFile(file, neverAccept);

      const called = attachmentServiceMock.addSupportNamesIfAbsent.mock.calls[0][0] as SupportNameEntry[];
      expect(called.length).toBe(3);
      expect(called.every((e: SupportNameEntry) => e.supportName === 'Support A')).toBe(true);
    });

    it('should filter out entries where both SUPPORT_IDR and SUPPORT_ADR are empty string', async () => {
      const payload = buildValidGeoLiaisonPayload();
      const portees = (payload.cantons as Record<string, unknown>[])[0]['portee unitaire'] as Record<string, unknown>[];
      portees.forEach((p) => {
        (p['accroche depart'] as Record<string, unknown>)['SUPPORT_IDR'] = '';
        (p['accroche depart'] as Record<string, unknown>)['SUPPORT_ADR'] = '';
        (p['accroche arrivee'] as Record<string, unknown>)['SUPPORT_IDR'] = '';
        (p['accroche arrivee'] as Record<string, unknown>)['SUPPORT_ADR'] = '';
      });

      const file = makeJsonFile(payload);
      await service.processFile(file, neverAccept);

      const called = attachmentServiceMock.addSupportNamesIfAbsent.mock.calls[0][0] as SupportNameEntry[];
      expect(called.length).toBe(0);
    });
  });
});
