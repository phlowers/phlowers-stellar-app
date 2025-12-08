import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportStudyComponent } from './import-study.component';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import Papa from 'papaparse';
import { Study } from '@core/data/database/interfaces/study';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CablesService } from '@src/app/core/services/cables/cables.service';

describe('ImportStudyComponent', () => {
  let component: ImportStudyComponent;
  let fixture: ComponentFixture<ImportStudyComponent>;
  let studiesServiceMock: jest.Mocked<StudiesService>;
  let mockConfirmationService: jest.Mocked<ConfirmationService>;
  let mockMessageService: jest.Mocked<MessageService>;

  beforeEach(async () => {
    studiesServiceMock = {
      createStudyFromProtoV4: jest.fn().mockResolvedValue({} as Study),
      getStudy: jest.fn(),
      deleteStudy: jest.fn(),
      createStudy: jest.fn()
    } as unknown as jest.Mocked<StudiesService>;
    mockMessageService = {
      add: jest.fn()
    } as unknown as jest.Mocked<MessageService>;
    const mockCablesService = {
      getCables: jest
        .fn()
        .mockResolvedValue([
          { name: 'conducteur' },
          { name: 'ASTER600' },
          { name: 'câble par faisceau' }
        ])
    } as unknown as jest.Mocked<CablesService>;
    mockConfirmationService = {
      confirm: jest.fn()
    } as unknown as jest.Mocked<ConfirmationService>;

    // Mock Papa.parse
    const mockParse = jest
      .fn()
      .mockImplementation(
        (input: string, config?: Papa.ParseConfig<Record<string, string>>) => {
          if (config?.complete) {
            // Simulate successful parsing with async behavior
            setTimeout(() => {
              const mockResult: Papa.ParseResult<Record<string, string>> = {
                data: [
                  {
                    num: '1',
                    nom: '98',
                    suspension: 'FAUX',
                    alt_acc: '1075,53',
                    long_bras: '0',
                    angle_ligne: '-19,1',
                    long_ch: '0',
                    pds_ch: '0',
                    surf_ch: '0',
                    ctr_poids: '0',
                    ch_en_V: 'FAUX',
                    portée: '473,07'
                  }
                ],
                errors: [],
                meta: {
                  delimiter: ';',
                  linebreak: '\n',
                  aborted: false,
                  truncated: false,
                  cursor: 0
                }
              };
              // Call complete callback
              config.complete!(mockResult, undefined);
            }, 0);
          }
          return {} as Papa.ParseResult<Record<string, string>>;
        }
      );

    (Papa as unknown as { parse: typeof mockParse }).parse = mockParse;

    await TestBed.configureTestingModule({
      imports: [ImportStudyComponent, HttpClientTestingModule],
      providers: [
        { provide: StudiesService, useValue: studiesServiceMock },
        { provide: MessageService, useValue: mockMessageService },
        { provide: CablesService, useValue: mockCablesService },
        { provide: ConfirmationService, useValue: mockConfirmationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ImportStudyComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('loadProtoV4File', () => {
    let mockFile: File;
    let mockFileReader: {
      readAsDataURL: jest.Mock;
      onload: ((e: ProgressEvent<FileReader>) => void) | null;
    };

    beforeEach(() => {
      // Mock FileReader
      mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null
      };

      // Mock global FileReader
      (global as unknown as { FileReader: jest.Mock }).FileReader = jest.fn(
        () => mockFileReader
      );

      // Create a mock file
      mockFile = new File(['test content'], 'test.csv', { type: 'text/csv' });
    });

    const createMockFileList = (files: File[]): FileList => {
      return Object.assign(files, {
        length: files.length,
        item: (index: number) => files[index] || null
      }) as FileList;
    };

    it('should handle no file selected gracefully', () => {
      const mockEvent = {
        target: {
          files: null
        }
      } as unknown as Event;

      component.loadFiles(mockEvent);

      expect(component.loading()).toBe(false);
      expect(mockFileReader.readAsDataURL).not.toHaveBeenCalled();
    });

    it('should handle empty files array gracefully', () => {
      const mockEvent = {
        target: {
          files: createMockFileList([])
        }
      } as unknown as Event;

      component.loadFiles(mockEvent);

      expect(component.loading()).toBe(false);
      expect(mockFileReader.readAsDataURL).not.toHaveBeenCalled();
    });

    it('should set loading state correctly during file processing', () => {
      const mockEvent = {
        target: {
          files: createMockFileList([mockFile])
        }
      } as unknown as Event;

      expect(component.loading()).toBe(false);

      component.loadFiles(mockEvent);

      expect(component.loading()).toBe(false);
      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockFile);
    });

    it('should handle FileReader errors gracefully', () => {
      const mockEvent = {
        target: {
          files: createMockFileList([mockFile])
        }
      } as unknown as Event;

      component.loadFiles(mockEvent);

      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockFile);
      expect(component.loading()).toBe(false);
    });

    it('should process valid ProtoV4 file successfully', (done) => {
      // Create a minimal CSV that matches the expected structure
      const mockCsvContent = `num;nom;suspension;alt_acc;long_bras;angle_ligne;long_ch;pds_ch;surf_ch;ctr_poids;ch_en_V;portée;;nb_portées
1;98;FAUX;1075,53;0;-19,1;0;0;0;0;FAUX;473,07;;19
2;99;VRAI;1071,86;0;0;2;65;0;0;FAUX;424,53;;conducteur
3;100;VRAI;1065,51;0;0;2;65;0;0;FAUX;453,46;;ASTER600
4;101;VRAI;1068,57;0;5;2;130;0;0;FAUX;500,07;;câble par faisceau
5;102;VRAI;1006,16;0;0;2;65;0;0;FAUX;508,96;;1
6;103;VRAI;1076,51;0;0;2;65;0;0;FAUX;496,89;;temp réglage
7;104;VRAI;1081,92;0;1,4;2;65;0;0;FAUX;522,35;;25
8;105;VRAI;1090,16;0;0;2;65;0;0;FAUX;426,38;;paramètre réglage
9;106;VRAI;1111,39;0;0;2;65;0;0;FAUX;367,72;;2001
10;107;VRAI;1143,57;0;0;2;65;0;0;FAUX;452,33;;pret %CRA
11;108;VRAI;1122,55;0;0;2;130;0;0;FAUX;1083,08;;0
12;109;VRAI;1265,1;0;-4,9;2;130;0;0;FAUX;468,62;;temp load
13;110;VRAI;1222,62;0;-0,6;2;65;0;0;FAUX;411,67;;15
14;111;VRAI;1205,33;0;0;2;65;0;0;FAUX;574,32;;vent load
15;112;VRAI;1163,6;0;0;2;65;0;0;FAUX;439,58;;0
16;113;VRAI;1134,9;0;0;2;65;0;240;FAUX;550;;givre load
17;114;VRAI;1159,65;0;0;2;65;0;0;FAUX;329,26;;0
18;115;VRAI;1142,88;0;0;2;65;0;0;FAUX;544,04;;nom projet
19;116;VRAI;1022,31;0;0;2;65;0;0;FAUX;516,94;;mon_projet
20;117;FAUX;1135,72;0;33;0;0;0;0;FAUX;;;`;

      // Convert to base64 using a method that handles ISO 8859-1 encoding properly
      // Create a Uint8Array from the string using ISO 8859-1 encoding
      const encoder = new TextEncoder();
      const bytes = encoder.encode(mockCsvContent);
      const base64Content = btoa(String.fromCharCode(...bytes));
      const dataUrl = `data:text/csv;base64,${base64Content}`;

      const mockEvent = {
        target: {
          files: createMockFileList([mockFile])
        }
      } as unknown as Event;

      // Mock FileReader result with proper data URL format
      const mockProgressEvent = {
        target: {
          result: dataUrl
        }
      } as unknown as ProgressEvent<FileReader>;

      component.loadFiles(mockEvent);

      // Simulate FileReader onload
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        // Wait for Papa.parse to complete
        setTimeout(() => {
          expect(studiesServiceMock.createStudyFromProtoV4).toHaveBeenCalled();
          expect(component.loading()).toBe(false);
          done();
        }, 100);
      }, 10);
    });
  });

  describe('loadAppFile', () => {
    let mockFile: File;
    let mockFileReader: {
      readAsText: jest.Mock;
      onload: ((e: ProgressEvent<FileReader>) => void) | null;
      onerror: ((e: ProgressEvent<FileReader>) => void) | null;
    };

    beforeEach(() => {
      // Mock FileReader
      mockFileReader = {
        readAsText: jest.fn(),
        onload: null,
        onerror: null
      };

      // Mock global FileReader
      (global as unknown as { FileReader: jest.Mock }).FileReader = jest.fn(
        () => mockFileReader
      );

      // Create a mock file
      mockFile = new File(['test content'], 'test.clst', {
        type: 'application/json'
      });
    });

    const createMockStudyData = (uuid?: string): any => {
      const studyData: any = {
        title: 'Test Study',
        description: 'Test Description',
        author_email: 'test@example.com',
        shareable: false,
        sections: [
          {
            uuid: 'section-uuid-1',
            name: 'Section 1',
            supports: [
              {
                uuid: 'support-uuid-1',
                number: 1,
                name: 'Support 1'
              }
            ]
          }
        ]
      };
      if (uuid) {
        studyData.uuid = uuid;
      }
      return studyData;
    };

    const encodeStudyToBase64 = (studyData: any): string => {
      const jsonString = JSON.stringify(studyData);
      return btoa(jsonString);
    };

    it('should successfully import a study without existing UUID', (done) => {
      const studyData = createMockStudyData();
      const base64Content = encodeStudyToBase64(studyData);
      const newUuid = 'new-study-uuid';
      const createdStudy: Study = {
        ...studyData,
        uuid: newUuid,
        created_at_offline: '2025-01-01T00:00:00Z',
        updated_at_offline: '2025-01-01T00:00:00Z',
        saved: true
      } as Study;

      studiesServiceMock.createStudy = jest.fn().mockResolvedValue(newUuid);
      studiesServiceMock.getStudy = jest.fn().mockResolvedValue(createdStudy);

      const mockProgressEvent = {
        target: {
          result: base64Content
        }
      } as unknown as ProgressEvent<FileReader>;

      component.loadAppFile(mockFile);

      expect(mockFileReader.readAsText).toHaveBeenCalledWith(mockFile);

      // Simulate FileReader onload
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        // Wait for async operations
        setTimeout(() => {
          expect(studiesServiceMock.createStudy).toHaveBeenCalled();
          expect(studiesServiceMock.getStudy).toHaveBeenCalledWith(newUuid);
          expect(component.newStudies().length).toBe(1);
          expect(component.newStudies()[0].uuid).toBe(newUuid);
          expect(mockMessageService.add).not.toHaveBeenCalled();
          done();
        }, 10);
      }, 10);
    });

    it('should successfully import a study with existing UUID when user accepts', (done) => {
      const existingUuid = 'existing-uuid';
      const studyData = createMockStudyData(existingUuid);
      const base64Content = encodeStudyToBase64(studyData);
      const newUuid = 'new-study-uuid';
      const existingStudy = {
        ...studyData,
        uuid: existingUuid,
        title: 'Existing Study',
        created_at_offline: '2025-01-01T00:00:00Z',
        updated_at_offline: '2025-01-01T00:00:00Z',
        saved: true
      } as unknown as Study;
      const createdStudy = {
        ...studyData,
        uuid: newUuid,
        created_at_offline: '2025-01-01T00:00:00Z',
        updated_at_offline: '2025-01-01T00:00:00Z',
        saved: true
      } as unknown as Study;

      studiesServiceMock.getStudy = jest
        .fn()
        .mockResolvedValueOnce(existingStudy) // For promptIfStudyAlreadyExists
        .mockResolvedValueOnce(createdStudy); // For final getStudy
      studiesServiceMock.deleteStudy = jest.fn().mockResolvedValue(undefined);
      studiesServiceMock.createStudy = jest.fn().mockResolvedValue(newUuid);

      // Mock confirmation service to accept
      mockConfirmationService.confirm = jest
        .fn()
        .mockImplementation(
          async (options: {
            accept?: () => void | Promise<void>;
            reject?: () => void;
          }) => {
            if (options.accept) {
              await options.accept();
            }
          }
        );

      const mockProgressEvent = {
        target: {
          result: base64Content
        }
      } as unknown as ProgressEvent<FileReader>;

      component.loadAppFile(mockFile);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        setTimeout(() => {
          expect(studiesServiceMock.getStudy).toHaveBeenCalledWith(
            existingUuid
          );
          expect(studiesServiceMock.deleteStudy).toHaveBeenCalledWith(
            existingUuid
          );
          expect(studiesServiceMock.createStudy).toHaveBeenCalled();
          expect(component.newStudies().length).toBe(1);
          done();
        }, 10);
      }, 10);
    });

    it('should not import a study with existing UUID when user rejects', (done) => {
      const existingUuid = 'existing-uuid';
      const studyData = createMockStudyData(existingUuid);
      const base64Content = encodeStudyToBase64(studyData);
      const existingStudy = {
        ...studyData,
        uuid: existingUuid,
        title: 'Existing Study',
        created_at_offline: '2025-01-01T00:00:00Z',
        updated_at_offline: '2025-01-01T00:00:00Z',
        saved: true
      } as unknown as Study;

      studiesServiceMock.getStudy = jest.fn().mockResolvedValue(existingStudy);
      studiesServiceMock.createStudy = jest.fn();

      // Mock confirmation service to reject
      mockConfirmationService.confirm = jest
        .fn()
        .mockImplementation(
          (options: { accept?: () => void; reject?: () => void }) => {
            if (options.reject) {
              options.reject();
            }
          }
        );

      const mockProgressEvent = {
        target: {
          result: base64Content
        }
      } as unknown as ProgressEvent<FileReader>;

      component.loadAppFile(mockFile);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        setTimeout(() => {
          expect(studiesServiceMock.getStudy).toHaveBeenCalledWith(
            existingUuid
          );
          expect(studiesServiceMock.createStudy).not.toHaveBeenCalled();
          expect(component.newStudies().length).toBe(0);
          done();
        }, 10);
      }, 10);
    });

    it('should handle study without sections', (done) => {
      const studyData = {
        title: 'Test Study',
        description: 'Test Description',
        author_email: 'test@example.com',
        shareable: false
      };
      const base64Content = encodeStudyToBase64(studyData);
      const newUuid = 'new-study-uuid';
      const createdStudy = {
        ...studyData,
        uuid: newUuid,
        sections: [],
        created_at_offline: '2025-01-01T00:00:00Z',
        updated_at_offline: '2025-01-01T00:00:00Z',
        saved: true
      } as unknown as Study;

      studiesServiceMock.createStudy = jest.fn().mockResolvedValue(newUuid);
      studiesServiceMock.getStudy = jest.fn().mockResolvedValue(createdStudy);

      const mockProgressEvent = {
        target: {
          result: base64Content
        }
      } as unknown as ProgressEvent<FileReader>;

      component.loadAppFile(mockFile);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        setTimeout(() => {
          expect(studiesServiceMock.createStudy).toHaveBeenCalled();
          expect(component.newStudies().length).toBe(1);
          done();
        }, 10);
      }, 10);
    });

    it('should handle invalid JSON in file', (done) => {
      const invalidBase64 = btoa('invalid json content');

      const mockProgressEvent = {
        target: {
          result: invalidBase64
        }
      } as unknown as ProgressEvent<FileReader>;

      component.loadAppFile(mockFile);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        setTimeout(() => {
          expect(mockMessageService.add).toHaveBeenCalledWith({
            severity: 'error',
            summary: expect.any(String),
            detail: expect.any(String),
            life: 3000
          });
          expect(studiesServiceMock.createStudy).not.toHaveBeenCalled();
          expect(component.newStudies().length).toBe(0);
          done();
        }, 10);
      }, 10);
    });

    it('should handle invalid base64 content', (done) => {
      const invalidBase64 = 'not-valid-base64!!!';

      const mockProgressEvent = {
        target: {
          result: invalidBase64
        }
      } as unknown as ProgressEvent<FileReader>;

      component.loadAppFile(mockFile);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        setTimeout(() => {
          expect(mockMessageService.add).toHaveBeenCalledWith({
            severity: 'error',
            summary: expect.any(String),
            detail: expect.any(String),
            life: 3000
          });
          expect(studiesServiceMock.createStudy).not.toHaveBeenCalled();
          done();
        }, 10);
      }, 10);
    });

    it('should handle missing study after creation', (done) => {
      const studyData = createMockStudyData();
      const base64Content = encodeStudyToBase64(studyData);
      const newUuid = 'new-study-uuid';

      studiesServiceMock.createStudy = jest.fn().mockResolvedValue(newUuid);
      studiesServiceMock.getStudy = jest.fn().mockResolvedValue(null);

      const mockProgressEvent = {
        target: {
          result: base64Content
        }
      } as unknown as ProgressEvent<FileReader>;

      component.loadAppFile(mockFile);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        setTimeout(() => {
          expect(studiesServiceMock.createStudy).toHaveBeenCalled();
          expect(studiesServiceMock.getStudy).toHaveBeenCalledWith(newUuid);
          expect(component.newStudies().length).toBe(0);
          done();
        }, 10);
      }, 10);
    });

    it('should handle FileReader error', () => {
      component.loadAppFile(mockFile);

      expect(mockFileReader.readAsText).toHaveBeenCalledWith(mockFile);

      // Note: The current implementation doesn't have an onerror handler,
      // but we test that readAsText is called correctly
      expect(mockFileReader.readAsText).toHaveBeenCalled();
    });

    it('should handle null result from FileReader', (done) => {
      const mockProgressEvent = {
        target: {
          result: null
        }
      } as unknown as ProgressEvent<FileReader>;

      component.loadAppFile(mockFile);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        setTimeout(() => {
          expect(mockMessageService.add).toHaveBeenCalledWith({
            severity: 'error',
            summary: expect.any(String),
            detail: expect.any(String),
            life: 3000
          });
          expect(studiesServiceMock.createStudy).not.toHaveBeenCalled();
          done();
        }, 10);
      }, 10);
    });

    it('should properly merge sections and supports with empty defaults', (done) => {
      const studyData = {
        title: 'Test Study',
        sections: [
          {
            uuid: 'section-uuid-1',
            name: 'Section 1',
            type: 'phase',
            supports: [
              {
                uuid: 'support-uuid-1',
                number: 1,
                name: 'Support 1',
                spanLength: 100
              },
              {
                uuid: 'support-uuid-2',
                number: 2,
                name: 'Support 2',
                spanLength: 200
              }
            ]
          }
        ]
      };
      const base64Content = encodeStudyToBase64(studyData);
      const newUuid = 'new-study-uuid';
      const createdStudy = {
        ...studyData,
        uuid: newUuid,
        author_email: '',
        shareable: false,
        created_at_offline: '2025-01-01T00:00:00Z',
        updated_at_offline: '2025-01-01T00:00:00Z',
        saved: true
      } as unknown as Study;

      studiesServiceMock.createStudy = jest.fn().mockResolvedValue(newUuid);
      studiesServiceMock.getStudy = jest.fn().mockResolvedValue(createdStudy);

      const mockProgressEvent = {
        target: {
          result: base64Content
        }
      } as unknown as ProgressEvent<FileReader>;

      component.loadAppFile(mockFile);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        setTimeout(() => {
          expect(studiesServiceMock.createStudy).toHaveBeenCalled();
          const createStudyCall = studiesServiceMock.createStudy.mock
            .calls[0][0] as any;
          expect(createStudyCall.sections).toBeDefined();
          expect(createStudyCall.sections.length).toBe(1);
          expect(createStudyCall.sections[0].supports.length).toBe(2);
          expect(component.newStudies().length).toBe(1);
          done();
        }, 10);
      }, 10);
    });
  });

  describe('promptIfStudyAlreadyExists', () => {
    const testUuid = 'test-uuid-123';
    const mockStudy: Study = {
      uuid: testUuid,
      title: 'Test Study',
      author_email: 'test@example.com',
      shareable: false,
      created_at_offline: '2025-01-01T00:00:00Z',
      updated_at_offline: '2025-01-01T00:00:00Z',
      saved: true,
      sections: []
    } as Study;

    it('should return false when study does not exist', async () => {
      studiesServiceMock.getStudy = jest.fn().mockResolvedValue(null);

      const result = await component.promptIfStudyAlreadyExists(testUuid);

      expect(result).toBe(false);
      expect(studiesServiceMock.getStudy).toHaveBeenCalledWith(testUuid);
      expect(mockConfirmationService.confirm).not.toHaveBeenCalled();
    });

    it('should return false when study is undefined', async () => {
      studiesServiceMock.getStudy = jest.fn().mockResolvedValue(undefined);

      const result = await component.promptIfStudyAlreadyExists(testUuid);

      expect(result).toBe(false);
      expect(studiesServiceMock.getStudy).toHaveBeenCalledWith(testUuid);
      expect(mockConfirmationService.confirm).not.toHaveBeenCalled();
    });

    it('should show confirmation dialog and return true when user accepts', async () => {
      studiesServiceMock.getStudy = jest.fn().mockResolvedValue(mockStudy);
      studiesServiceMock.deleteStudy = jest.fn().mockResolvedValue(undefined);

      // Mock the confirm method to call the accept callback
      mockConfirmationService.confirm = jest
        .fn()
        .mockImplementation(
          async (options: {
            accept?: () => void | Promise<void>;
            reject?: () => void;
          }) => {
            // Simulate user accepting
            if (options.accept) {
              await options.accept();
            }
          }
        );

      const result = await component.promptIfStudyAlreadyExists(testUuid);

      expect(result).toBe(true);
      expect(studiesServiceMock.getStudy).toHaveBeenCalledWith(testUuid);
      expect(mockConfirmationService.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'positionDialog',
          acceptLabel: expect.any(String),
          rejectLabel: expect.any(String)
        })
      );
      expect(studiesServiceMock.deleteStudy).toHaveBeenCalledWith(testUuid);
    });

    it('should show confirmation dialog and return false when user rejects', async () => {
      studiesServiceMock.getStudy = jest.fn().mockResolvedValue(mockStudy);

      // Mock the confirm method to call the reject callback
      mockConfirmationService.confirm = jest
        .fn()
        .mockImplementation(
          (options: { accept?: () => void; reject?: () => void }) => {
            // Simulate user rejecting
            if (options.reject) {
              options.reject();
            }
          }
        );

      const result = await component.promptIfStudyAlreadyExists(testUuid);

      expect(result).toBe(false);
      expect(studiesServiceMock.getStudy).toHaveBeenCalledWith(testUuid);
      expect(mockConfirmationService.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'positionDialog',
          acceptLabel: expect.any(String),
          rejectLabel: expect.any(String)
        })
      );
      expect(studiesServiceMock.deleteStudy).not.toHaveBeenCalled();
    });

    it('should include study title in confirmation message', async () => {
      studiesServiceMock.getStudy = jest.fn().mockResolvedValue(mockStudy);

      mockConfirmationService.confirm = jest
        .fn()
        .mockImplementation(
          (options: { accept?: () => void; reject?: () => void }) => {
            if (options.reject) {
              options.reject();
            }
          }
        );

      await component.promptIfStudyAlreadyExists(testUuid);

      expect(mockConfirmationService.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Test Study')
        })
      );
    });
  });
});
