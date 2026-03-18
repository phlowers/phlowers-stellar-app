/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { StudiesService } from './studies.service';
import { StorageService } from '@services/storage/storage.service';
import { ProtoV4Parameters, ProtoV4Support, Support } from '@shared/domain';
import { StudyEntity } from '@infrastructure/database';
import { liveQuery } from 'dexie';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123')
}));

vi.mock('dexie', () => {
  class Dexie {
    version() {
      return {
        stores: vi.fn()
      };
    }
  }

  return {
    __esModule: true,
    default: Dexie,
    liveQuery: vi.fn()
  };
});

interface MockDb {
  users: {
    toArray: vi.Mock<() => Promise<{ email: string }[]>>;
  };
  studies: {
    add: vi.Mock<(study: StudyEntity) => Promise<void>>;
    toArray: vi.Mock<() => Promise<StudyEntity[]>>;
    get: vi.Mock<(id: string) => Promise<StudyEntity | undefined>>;
    delete: vi.Mock<(id: string) => Promise<void>>;
    clear: vi.Mock<() => Promise<void>>;
    update: vi.Mock<(id: string, changes: Partial<StudyEntity>) => Promise<number>>;
    orderBy: vi.Mock;
  };
}

describe('StudiesService', () => {
  let service: StudiesService;
  let mockStorageService: vi.Mocked<StorageService>;
  let mockDb: MockDb;
  let readySubject: BehaviorSubject<boolean>;
  let messageService: MessageService;

  const mockUser = {
    email: 'test@example.com'
  };

  const mockStudy: Pick<StudyEntity, 'title' | 'description' | 'shareable' | 'sections' | 'author_email'> = {
    title: 'Test Study',
    description: 'Test Description',
    shareable: true,
    sections: [],
    author_email: 'test@example.com'
  };

  const mockStudyFromDb: StudyEntity = {
    ...mockStudy,
    uuid: 'existing-uuid-123',
    created_at_offline: '2025-01-01T00:00:00.000Z',
    updated_at_offline: '2025-01-01T00:00:00.000Z',
    saved: true
  };

  beforeEach(() => {
    readySubject = new BehaviorSubject<boolean>(false);

    mockDb = {
      users: {
        toArray: vi.fn().mockResolvedValue([mockUser])
      },
      studies: {
        add: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue(mockStudyFromDb),
        delete: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(1),
        orderBy: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue([mockStudyFromDb])
            })
          })
        })
      }
    };

    mockStorageService = {
      ready$: readySubject,
      db: mockDb
    } as unknown as vi.Mocked<StorageService>;

    TestBed.configureTestingModule({
      providers: [
        StudiesService,
        { provide: StorageService, useValue: mockStorageService },
        { provide: MessageService, useValue: { add: vi.fn() } }
      ]
    });

    service = TestBed.inject(StudiesService);
    messageService = TestBed.inject(MessageService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes ready and studies', () => {
    expect(service.ready.value).toBe(false);
    expect(service.studies.value).toEqual([]);

    readySubject.next(true);
    expect(service.ready.value).toBe(true);
  });

  it('creates a study and refreshes list', async () => {
    mockDb.studies.toArray.mockResolvedValue([mockStudyFromDb]);

    const uuid = await service.createStudy(mockStudy);

    expect(uuid).toBe('mock-uuid-123');
    expect(mockDb.studies.add).toHaveBeenCalledWith({
      ...mockStudy,
      author_email: 'test@example.com',
      uuid: 'mock-uuid-123',
      created_at_offline: expect.any(String),
      updated_at_offline: expect.any(String),
      saved: false
    });
    expect(service.studies.value).toEqual([mockStudyFromDb]);
  });

  it('uses user email when study author is missing', async () => {
    mockDb.studies.toArray.mockResolvedValue([]);

    await service.createStudy({
      title: 'No Author',
      description: '',
      shareable: false,
      sections: [],
      author_email: ''
    });

    expect(mockDb.studies.add).toHaveBeenCalledWith({
      title: 'No Author',
      description: '',
      shareable: false,
      sections: [],
      author_email: 'test@example.com',
      uuid: 'mock-uuid-123',
      created_at_offline: expect.any(String),
      updated_at_offline: expect.any(String),
      saved: false
    });
  });

  it('gets studies and latest studies', async () => {
    await service.getStudies();

    expect(mockDb.studies.toArray).toHaveBeenCalled();

    const latest = await service.getLatestStudies();
    expect(mockDb.studies.orderBy).toHaveBeenCalledWith('created_at_offline');
    expect(latest).toEqual([mockStudyFromDb]);
  });

  it('returns undefined when db is missing', async () => {
    (mockStorageService as unknown as { db: undefined }).db = undefined;

    const studies = await service.getStudies();
    const latest = await service.getLatestStudies();

    expect(studies).toBeUndefined();
    expect(latest).toBeUndefined();
  });

  it('refreshes studies to empty list when db is missing', async () => {
    (mockStorageService as unknown as { db: undefined }).db = undefined;

    const result = await (service as unknown as { refreshStudies: () => Promise<StudyEntity[]> }).refreshStudies();

    expect(result).toEqual([]);
    expect(service.studies.value).toEqual([]);
  });

  it('duplicates a study and refreshes list', async () => {
    mockDb.studies.toArray.mockResolvedValue([mockStudyFromDb]);

    const result = await service.duplicateStudy('existing-uuid-123');

    expect(result?.title).toContain('Test Study');
    expect(mockDb.studies.add).toHaveBeenCalledWith({
      ...mockStudyFromDb,
      title: 'Test Study (Copy 1)',
      author_email: 'test@example.com',
      uuid: 'mock-uuid-123',
      created_at_offline: expect.any(String),
      updated_at_offline: expect.any(String),
      saved: false
    });
    expect(service.studies.value).toEqual([mockStudyFromDb]);
  });

  it('uses empty list when duplicate study list is undefined', async () => {
    mockDb.studies.toArray.mockResolvedValue(undefined as unknown as StudyEntity[]);

    await service.duplicateStudy('existing-uuid-123');

    expect(mockDb.studies.add).toHaveBeenCalled();
  });

  it('uses study author email when user email is missing on duplicate', async () => {
    mockDb.users.toArray.mockResolvedValue([]);
    mockDb.studies.toArray.mockResolvedValue([mockStudyFromDb]);

    const result = await service.duplicateStudy('existing-uuid-123');

    expect(result?.author_email).toBe(mockStudyFromDb.author_email);
    expect(mockDb.studies.add).toHaveBeenCalledWith({
      ...mockStudyFromDb,
      title: 'Test Study (Copy 1)',
      author_email: mockStudyFromDb.author_email,
      uuid: 'mock-uuid-123',
      created_at_offline: expect.any(String),
      updated_at_offline: expect.any(String),
      saved: false
    });
  });

  it('returns null when duplicating missing study', async () => {
    mockDb.studies.get.mockResolvedValue(undefined);

    const result = await service.duplicateStudy('missing-uuid');

    expect(result).toBeNull();
    expect(mockDb.studies.add).not.toHaveBeenCalled();
  });

  it('deletes a study and refreshes list', async () => {
    mockDb.studies.toArray.mockResolvedValue([]);

    await service.deleteStudy('existing-uuid-123');

    expect(mockDb.studies.delete).toHaveBeenCalledWith('existing-uuid-123');
    expect(service.studies.value).toEqual([]);
  });

  it('deletes all studies and refreshes list', async () => {
    mockDb.studies.toArray.mockResolvedValue([]);

    await service.deleteAllStudies();

    expect(mockDb.studies.clear).toHaveBeenCalled();
    expect(service.studies.value).toEqual([]);
  });

  it('updates study when author matches', async () => {
    await service.updateStudy({
      uuid: 'existing-uuid-123',
      author_email: 'test@example.com',
      title: 'Updated'
    });

    expect(mockDb.studies.update).toHaveBeenCalledWith('existing-uuid-123', {
      uuid: 'existing-uuid-123',
      author_email: 'test@example.com',
      title: 'Updated',
      updated_at_offline: expect.any(String)
    });
  });

  it('allows update when overrideAuthorCheck is true', async () => {
    mockDb.users.toArray.mockResolvedValue([{ email: 'other@example.com' }]);

    await service.updateStudy(
      {
        uuid: 'existing-uuid-123',
        author_email: 'test@example.com',
        title: 'Updated'
      },
      true
    );

    expect(mockDb.studies.update).toHaveBeenCalled();
  });

  it('rejects update when author mismatches', async () => {
    mockDb.users.toArray.mockResolvedValue([{ email: 'other@example.com' }]);
    const addSpy = vi.spyOn(messageService, 'add');

    await expect(
      service.updateStudy({
        uuid: 'existing-uuid-123',
        author_email: 'test@example.com',
        title: 'Updated'
      })
    ).rejects.toThrow('You cannot update a study that you did not create, please duplicate it instead.');

    expect(addSpy).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Unauthorized',
      detail: 'You cannot update a study that you did not create, please duplicate it instead.'
    });
  });

  it('creates a study from proto v4 parameters', async () => {
    const parameters: ProtoV4Parameters = {
      conductor: 'ACSR-240',
      cable_amount: 3,
      temperature_reference: 20,
      parameter: 1.2,
      cra: 0.5,
      temp_load: 15,
      wind_load: 10,
      frost_load: 5,
      project_name: 'Test Project',
      section_name: 'Test Section'
    };

    const support: ProtoV4Support = {
      alt_acc: 12.5,
      angle_ligne: 45,
      ch_en_V: true,
      ctr_poids: 2.5,
      long_bras: 3.0,
      long_ch: 1.5,
      nom: 'Support 1',
      num: '1',
      pds_ch: 1.2,
      portée: 200,
      surf_ch: 0.8,
      suspension: true
    };

    const createStudySpy = vi.spyOn(service, 'createStudy').mockResolvedValue('mock-uuid-123');
    const getStudySpy = vi.spyOn(service, 'getStudy').mockResolvedValue(mockStudyFromDb);

    const result = await service.createStudyFromProtoV4([support], parameters);

    expect(createStudySpy).toHaveBeenCalled();
    const payload = createStudySpy.mock.calls[0][0];
    expect(payload.sections).toHaveLength(1);
    expect(payload.sections[0].supports).toHaveLength(1);
    expect(payload.sections[0].initial_conditions).toHaveLength(1);
    expect(payload.sections[0].selected_initial_condition_uuid).toBe(payload.sections[0].initial_conditions[0].uuid);
    expect(getStudySpy).toHaveBeenCalledWith('mock-uuid-123');
    expect(result).toEqual(mockStudyFromDb);
  });

  it('creates supports with non-negative foot altitude', async () => {
    const parameters: ProtoV4Parameters = {
      conductor: 'ACSR-240',
      cable_amount: 3,
      temperature_reference: 20,
      parameter: 1.2,
      cra: 0.5,
      temp_load: 15,
      wind_load: 10,
      frost_load: 5,
      project_name: 'Test Project',
      section_name: 'Test Section'
    };

    const support: ProtoV4Support = {
      alt_acc: 10,
      angle_ligne: 45,
      ch_en_V: true,
      ctr_poids: 2.5,
      long_bras: 3.0,
      long_ch: 1.5,
      nom: 'Support 1',
      num: '1',
      pds_ch: 1.2,
      portée: 200,
      surf_ch: 0.8,
      suspension: true
    };

    const createStudySpy = vi.spyOn(service, 'createStudy').mockResolvedValue('mock-uuid-123');
    vi.spyOn(service, 'getStudy').mockResolvedValue(mockStudyFromDb);

    await service.createStudyFromProtoV4([support], parameters);

    const payload = createStudySpy.mock.calls[0][0];
    expect(payload.sections[0].supports[0].supportFootAltitude).toBe(0);
  });

  it('builds supports with positive foot altitude when height allows', () => {
    const supports = (
      service as unknown as {
        buildSupportsFromProtoV4: (items: ProtoV4Support[], conductor: string) => Support[];
      }
    ).buildSupportsFromProtoV4(
      [
        {
          alt_acc: 40,
          angle_ligne: 0,
          ch_en_V: false,
          ctr_poids: 0,
          long_bras: 0,
          long_ch: 0,
          nom: 'Support 1',
          num: '1',
          pds_ch: 0,
          portée: 0,
          surf_ch: 0,
          suspension: false
        }
      ],
      'ACSR-240'
    );

    expect(supports[0].supportFootAltitude).toBe(10);
  });

  it('derives supportFootAltitude from validated attachmentHeight', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const supports = (
      service as unknown as {
        buildSupportsFromProtoV4: (items: ProtoV4Support[], conductor: string) => Support[];
      }
    ).buildSupportsFromProtoV4(
      [
        {
          alt_acc: 10000, // Out of bounds, will be clamped to 9000
          angle_ligne: 0,
          ch_en_V: false,
          ctr_poids: 0,
          long_bras: 0,
          long_ch: 0,
          nom: 'Support 1',
          num: '1',
          pds_ch: 0,
          portée: 100,
          surf_ch: 0,
          suspension: false
        },
        {
          alt_acc: 100,
          angle_ligne: 0,
          ch_en_V: false,
          ctr_poids: 0,
          long_bras: 0,
          long_ch: 0,
          nom: 'Support 2',
          num: '2',
          pds_ch: 0,
          portée: 0,
          surf_ch: 0,
          suspension: false
        }
      ],
      'ACSR-240'
    );

    // attachmentHeight clamped to 9000 → supportFootAltitude = 9000 - 30 = 8970
    expect(supports[0].attachmentHeight).toBe(9000);
    expect(supports[0].supportFootAltitude).toBe(8970);

    consoleWarnSpy.mockRestore();
  });

  it('clamps out of bounds values and logs warnings', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const supports = (
      service as unknown as {
        buildSupportsFromProtoV4: (items: ProtoV4Support[], conductor: string) => Support[];
      }
    ).buildSupportsFromProtoV4(
      [
        {
          alt_acc: 10000, // Out of bounds [−100, 9000]
          angle_ligne: 300, // Out of bounds [−200, 200]
          ch_en_V: false,
          ctr_poids: 0,
          long_bras: 100, // Out of bounds [−50, 50]
          long_ch: 20, // Out of bounds [0, 15]
          nom: 'Support 1',
          num: '1',
          pds_ch: 0,
          portée: 100,
          surf_ch: 15, // Out of bounds [0, 9.99]
          suspension: false
        },
        {
          alt_acc: 100,
          angle_ligne: 0,
          ch_en_V: false,
          ctr_poids: 0,
          long_bras: 0,
          long_ch: 0,
          nom: 'Support 2',
          num: '2',
          pds_ch: 0,
          portée: 0, // Last support
          surf_ch: 0,
          suspension: false
        }
      ],
      'ACSR-240'
    );

    // Verify values are clamped
    expect(supports[0].attachmentHeight).toBe(9000); // Clamped from 10000
    expect(supports[0].spanAngle).toBe(200); // Clamped from 300
    expect(supports[0].armLength).toBe(50); // Clamped from 100
    expect(supports[0].chainLength).toBe(15); // Clamped from 20
    expect(supports[0].chainSurface).toBe(9.99); // Clamped from 15

    // Verify console.warn was called
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('CSV Import Warning: Support 1'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('attachmentHeight'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('spanAngle'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('armLength'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('chainLength'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('chainSurface'));

    consoleWarnSpy.mockRestore();
  });

  it('handles invalid spanLength for non-last supports', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const supports = (
      service as unknown as {
        buildSupportsFromProtoV4: (items: ProtoV4Support[], conductor: string) => Support[];
      }
    ).buildSupportsFromProtoV4(
      [
        {
          alt_acc: 100,
          angle_ligne: 0,
          ch_en_V: false,
          ctr_poids: 0,
          long_bras: 0,
          long_ch: 0,
          nom: 'Support 1',
          num: '1',
          pds_ch: 0,
          portée: 0, // Invalid for non-last support
          surf_ch: 0,
          suspension: false
        },
        {
          alt_acc: 100,
          angle_ligne: 0,
          ch_en_V: false,
          ctr_poids: 0,
          long_bras: 0,
          long_ch: 0,
          nom: 'Support 2',
          num: '2',
          pds_ch: 0,
          portée: 3, // Below minimum of 5
          surf_ch: 0,
          suspension: false
        },
        {
          alt_acc: 100,
          angle_ligne: 0,
          ch_en_V: false,
          ctr_poids: 0,
          long_bras: 0,
          long_ch: 0,
          nom: 'Support 3',
          num: '3',
          pds_ch: 0,
          portée: 0, // Last support
          surf_ch: 0,
          suspension: false
        }
      ],
      'ACSR-240'
    );

    // Verify spanLength handling
    expect(supports[0].spanLength).toBeNull(); // Invalid value for non-last support
    expect(supports[1].spanLength).toBe(5); // Clamped from 3 to minimum of 5
    expect(supports[2].spanLength).toBeNull(); // Last support

    // Verify console.warn was called for invalid spanLength
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Support 1 (Support 1) has invalid spanLength')
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Support 2 (Support 2)'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('spanLength = 3'));

    // Should not log warning for last support
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Support 3'));

    consoleWarnSpy.mockRestore();
  });

  it('rejects NaN and Infinity values', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const supports = (
      service as unknown as {
        buildSupportsFromProtoV4: (items: ProtoV4Support[], conductor: string) => Support[];
      }
    ).buildSupportsFromProtoV4(
      [
        {
          alt_acc: NaN, // Not a finite number
          angle_ligne: Infinity, // Not a finite number
          ch_en_V: false,
          ctr_poids: -Infinity, // Not a finite number
          long_bras: 0,
          long_ch: 0,
          nom: 'Support 1',
          num: '1',
          pds_ch: 0,
          portée: 100,
          surf_ch: 0,
          suspension: false
        },
        {
          alt_acc: 100,
          angle_ligne: 0,
          ch_en_V: false,
          ctr_poids: 0,
          long_bras: 0,
          long_ch: 0,
          nom: 'Support 2',
          num: '2',
          pds_ch: 0,
          portée: 0,
          surf_ch: 0,
          suspension: false
        }
      ],
      'ACSR-240'
    );

    // Verify NaN/Infinity values are converted to null
    expect(supports[0].attachmentHeight).toBeNull();
    expect(supports[0].spanAngle).toBeNull();
    expect(supports[0].counterWeight).toBeNull();

    // Verify console.warn was called for non-finite values
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('not a finite number (NaN or Infinity)'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('attachmentHeight'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('spanAngle'));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('counterWeight'));

    // Verify supportFootAltitude defaults to 0 when attachmentHeight is null
    expect(supports[0].supportFootAltitude).toBe(0);

    consoleWarnSpy.mockRestore();
  });

  it('downloads a study when present', async () => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        value: vi.fn(),
        writable: true
      });
    }
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);

    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        element.click = clickSpy;
      }
      return element;
    });

    await service.downloadStudy('existing-uuid-123', 'file-name');

    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalled();

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
    createElementSpy.mockRestore();
  });

  it('returns early when downloading missing study', async () => {
    mockDb.studies.get.mockResolvedValue(undefined);
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL');

    await service.downloadStudy('missing-uuid', 'file-name');

    expect(createObjectUrlSpy).not.toHaveBeenCalled();

    createObjectUrlSpy.mockRestore();
  });

  it('returns live query observable for getStudyAsObservable', () => {
    const liveQueryMock = liveQuery as vi.MockedFunction<typeof liveQuery>;
    const fakeObservable = { subscribe: vi.fn() } as unknown as ReturnType<typeof liveQuery>;

    liveQueryMock.mockImplementation((query) => {
      query();
      return fakeObservable;
    });

    const result = service.getStudyAsObservable('existing-uuid-123');

    expect(liveQueryMock).toHaveBeenCalled();
    expect(mockDb.studies.get).toHaveBeenCalledWith('existing-uuid-123');
    expect(result).toBe(fakeObservable);
  });
});
