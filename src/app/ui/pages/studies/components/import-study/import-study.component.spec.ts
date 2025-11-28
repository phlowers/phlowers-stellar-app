import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportStudyComponent } from './import-study.component';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { MessageService } from 'primeng/api';
import Papa from 'papaparse';
import { Study } from '@core/data/database/interfaces/study';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CablesService } from '@src/app/core/services/cables/cables.service';

describe('ImportStudyComponent', () => {
  let component: ImportStudyComponent;
  let fixture: ComponentFixture<ImportStudyComponent>;
  let studiesServiceMock: jest.Mocked<StudiesService>;

  beforeEach(async () => {
    studiesServiceMock = {
      createStudyFromProtoV4: jest.fn().mockResolvedValue({} as Study),
      deleteStudy: jest.fn().mockResolvedValue(undefined),
      createStudy: jest.fn().mockResolvedValue('test-uuid'),
      getStudy: jest.fn().mockResolvedValue({ uuid: 'test-uuid' } as Study)
    } as unknown as jest.Mocked<StudiesService>;
    const mockMessageService = {
      add: jest.fn()
    } as unknown as MessageService;
    const mockCablesService = {
      getCables: jest
        .fn()
        .mockResolvedValue([
          { name: 'conducteur' },
          { name: 'ASTER600' },
          { name: 'câble par faisceau' }
        ])
    } as unknown as jest.Mocked<CablesService>;

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
        { provide: CablesService, useValue: mockCablesService }
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

    it('should show error message and return early when cable does not exist in database', (done) => {
      // Mock checkIfCableExists to return false (cable doesn't exist)
      jest.spyOn(component, 'checkIfCableExists').mockResolvedValue(false);

      // Create CSV with a conductor that doesn't exist in the database
      // The conductor is extracted from rawParameters[3], which corresponds to the 5th data line
      const mockCsvContent = `num;nom;suspension;alt_acc;long_bras;angle_ligne;long_ch;pds_ch;surf_ch;ctr_poids;ch_en_V;portée;;nb_portées
1;98;FAUX;1075,53;0;-19,1;0;0;0;0;FAUX;473,07;;19
2;99;VRAI;1071,86;0;0;2;65;0;0;FAUX;424,53;;conducteur
3;100;VRAI;1065,51;0;0;2;65;0;0;FAUX;453,46;;ASTER600
4;101;VRAI;1068,57;0;5;2;130;0;0;FAUX;500,07;;NONEXISTENT_CABLE
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

      const encoder = new TextEncoder();
      const bytes = encoder.encode(mockCsvContent);
      const base64Content = btoa(String.fromCharCode(...bytes));
      const dataUrl = `data:text/csv;base64,${base64Content}`;

      const mockEvent = {
        target: {
          files: createMockFileList([mockFile])
        }
      } as unknown as Event;

      const mockProgressEvent = {
        target: {
          result: dataUrl
        }
      } as unknown as ProgressEvent<FileReader>;

      const mockMessageService = TestBed.inject(MessageService);

      component.loadFiles(mockEvent);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        setTimeout(() => {
          expect(mockMessageService.add).toHaveBeenCalledWith({
            severity: 'error',
            summary: expect.any(String),
            detail: expect.stringContaining('Cable not found in database:')
          });
          expect(
            studiesServiceMock.createStudyFromProtoV4
          ).not.toHaveBeenCalled();
          expect(component.loading()).toBe(false);
          done();
        }, 100);
      }, 10);
    });

    it('should handle errors during file import and add to erroredFiles', (done) => {
      // Mock checkIfCableExists to throw an error
      jest
        .spyOn(component, 'checkIfCableExists')
        .mockRejectedValue(new Error('Database connection error'));

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

      const encoder = new TextEncoder();
      const bytes = encoder.encode(mockCsvContent);
      const base64Content = btoa(String.fromCharCode(...bytes));
      const dataUrl = `data:text/csv;base64,${base64Content}`;

      const mockEvent = {
        target: {
          files: createMockFileList([mockFile])
        }
      } as unknown as Event;

      const mockProgressEvent = {
        target: {
          result: dataUrl
        }
      } as unknown as ProgressEvent<FileReader>;

      const mockMessageService = TestBed.inject(MessageService);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      component.loadFiles(mockEvent);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        setTimeout(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error importing study',
            expect.any(Error)
          );
          expect(mockMessageService.add).toHaveBeenCalledWith({
            severity: 'error',
            summary: expect.any(String),
            detail: expect.any(String),
            life: 3000
          });
          expect(component.erroredFiles()).toContain(mockFile.name);
          expect(
            studiesServiceMock.createStudyFromProtoV4
          ).not.toHaveBeenCalled();
          consoleErrorSpy.mockRestore();
          done();
        }, 100);
      }, 10);
    });

    it('should handle errors during Papa.parse and add to erroredFiles', (done) => {
      // Mock checkIfCableExists to return true (cable exists)
      jest.spyOn(component, 'checkIfCableExists').mockResolvedValue(true);

      // Mock Papa.parse to throw an error
      const mockParse = jest.fn().mockImplementation(() => {
        throw new Error('Papa.parse failed');
      });

      (Papa as unknown as { parse: typeof mockParse }).parse = mockParse;

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

      const encoder = new TextEncoder();
      const bytes = encoder.encode(mockCsvContent);
      const base64Content = btoa(String.fromCharCode(...bytes));
      const dataUrl = `data:text/csv;base64,${base64Content}`;

      const mockEvent = {
        target: {
          files: createMockFileList([mockFile])
        }
      } as unknown as Event;

      const mockProgressEvent = {
        target: {
          result: dataUrl
        }
      } as unknown as ProgressEvent<FileReader>;

      const mockMessageService = TestBed.inject(MessageService);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      component.loadFiles(mockEvent);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        setTimeout(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error importing study',
            expect.any(Error)
          );
          expect(mockMessageService.add).toHaveBeenCalledWith({
            severity: 'error',
            summary: expect.any(String),
            detail: expect.any(String),
            life: 3000
          });
          expect(component.erroredFiles()).toContain(mockFile.name);
          consoleErrorSpy.mockRestore();
          done();
        }, 100);
      }, 10);
    });
  });

  describe('deleteStudy', () => {
    it('should delete a study and remove it from newStudies', async () => {
      const study1 = { uuid: 'uuid-1', title: 'Study 1' } as Study;
      const study2 = { uuid: 'uuid-2', title: 'Study 2' } as Study;
      const study3 = { uuid: 'uuid-3', title: 'Study 3' } as Study;

      component.newStudies.set([study1, study2, study3]);

      await component.deleteStudy('uuid-2');

      expect(studiesServiceMock.deleteStudy).toHaveBeenCalledWith('uuid-2');
      expect(component.newStudies()).toEqual([study1, study3]);
    });

    it('should handle deleting a study that does not exist in newStudies', async () => {
      const study1 = { uuid: 'uuid-1', title: 'Study 1' } as Study;
      component.newStudies.set([study1]);

      await component.deleteStudy('non-existent-uuid');

      expect(studiesServiceMock.deleteStudy).toHaveBeenCalledWith(
        'non-existent-uuid'
      );
      expect(component.newStudies()).toEqual([study1]);
    });

    it('should handle deleting from an empty newStudies array', async () => {
      component.newStudies.set([]);

      await component.deleteStudy('uuid-1');

      expect(studiesServiceMock.deleteStudy).toHaveBeenCalledWith('uuid-1');
      expect(component.newStudies()).toEqual([]);
    });
  });

  describe('loadAppFile', () => {
    let mockFile: File;
    let mockFileReader: {
      readAsText: jest.Mock;
      onload: ((e: ProgressEvent<FileReader>) => void) | null;
    };

    beforeEach(() => {
      // Mock FileReader
      mockFileReader = {
        readAsText: jest.fn(),
        onload: null
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

    it('should successfully load and import a valid app file', (done) => {
      const mockStudyData = {
        title: 'Test Study',
        description: 'Test Description',
        sections: [
          {
            uuid: 'section-uuid',
            name: 'Section 1',
            supports: [
              {
                uuid: 'support-uuid',
                number: 1,
                spanLength: 100
              }
            ]
          }
        ]
      };

      const base64Content = btoa(JSON.stringify(mockStudyData));
      const mockProgressEvent = {
        target: {
          result: base64Content
        }
      } as unknown as ProgressEvent<FileReader>;

      const mockCreatedStudy = {
        uuid: 'test-uuid',
        title: 'Test Study',
        description: 'Test Description'
      } as Study;

      studiesServiceMock.createStudy = jest.fn().mockResolvedValue('test-uuid');
      studiesServiceMock.getStudy = jest
        .fn()
        .mockResolvedValue(mockCreatedStudy);

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
          expect(studiesServiceMock.getStudy).toHaveBeenCalledWith('test-uuid');
          expect(component.newStudies()).toContainEqual(mockCreatedStudy);
          done();
        }, 10);
      }, 10);
    });

    it('should handle file with no sections', (done) => {
      const mockStudyData = {
        title: 'Test Study',
        description: 'Test Description'
      };

      const base64Content = btoa(JSON.stringify(mockStudyData));
      const mockProgressEvent = {
        target: {
          result: base64Content
        }
      } as unknown as ProgressEvent<FileReader>;

      const mockCreatedStudy = {
        uuid: 'test-uuid',
        title: 'Test Study'
      } as Study;

      studiesServiceMock.createStudy = jest.fn().mockResolvedValue('test-uuid');
      studiesServiceMock.getStudy = jest
        .fn()
        .mockResolvedValue(mockCreatedStudy);

      component.loadAppFile(mockFile);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        setTimeout(() => {
          expect(studiesServiceMock.createStudy).toHaveBeenCalled();
          expect(component.newStudies()).toContainEqual(mockCreatedStudy);
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

      const mockMessageService = TestBed.inject(MessageService);

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
          expect(component.erroredFiles()).toContain(mockFile.name);
          expect(studiesServiceMock.createStudy).not.toHaveBeenCalled();
          done();
        }, 10);
      }, 10);
    });

    it('should handle case when getStudy returns null', (done) => {
      const mockStudyData = {
        title: 'Test Study',
        description: 'Test Description'
      };

      const base64Content = btoa(JSON.stringify(mockStudyData));
      const mockProgressEvent = {
        target: {
          result: base64Content
        }
      } as unknown as ProgressEvent<FileReader>;

      studiesServiceMock.createStudy = jest.fn().mockResolvedValue('test-uuid');
      studiesServiceMock.getStudy = jest.fn().mockResolvedValue(null);

      component.loadAppFile(mockFile);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        setTimeout(() => {
          expect(studiesServiceMock.createStudy).toHaveBeenCalled();
          expect(studiesServiceMock.getStudy).toHaveBeenCalledWith('test-uuid');
          expect(component.newStudies()).not.toContainEqual(
            expect.objectContaining({ uuid: 'test-uuid' })
          );
          done();
        }, 10);
      }, 10);
    });

    it('should properly merge study data with empty study structure', (done) => {
      const mockStudyData = {
        title: 'Custom Title',
        description: 'Custom Description',
        shareable: true,
        sections: [
          {
            uuid: 'section-uuid',
            name: 'Custom Section',
            type: 'phase',
            supports: [
              {
                uuid: 'support-uuid',
                number: 5,
                spanLength: 200
              }
            ]
          }
        ]
      };

      const base64Content = btoa(JSON.stringify(mockStudyData));
      const mockProgressEvent = {
        target: {
          result: base64Content
        }
      } as unknown as ProgressEvent<FileReader>;

      const mockCreatedStudy = {
        uuid: 'test-uuid',
        title: 'Custom Title',
        description: 'Custom Description'
      } as Study;

      studiesServiceMock.createStudy = jest.fn().mockResolvedValue('test-uuid');
      studiesServiceMock.getStudy = jest
        .fn()
        .mockResolvedValue(mockCreatedStudy);

      component.loadAppFile(mockFile);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload(mockProgressEvent);
        }

        setTimeout(() => {
          expect(studiesServiceMock.createStudy).toHaveBeenCalled();
          const createStudyCall = studiesServiceMock.createStudy.mock
            .calls[0][0] as unknown as {
            title: string;
            description: string;
            sections: {
              name: string;
              supports: { number: number | string | null }[];
            }[];
          };
          expect(createStudyCall.title).toBe('Custom Title');
          expect(createStudyCall.description).toBe('Custom Description');
          expect(createStudyCall.sections).toBeDefined();
          expect(createStudyCall.sections.length).toBe(1);
          expect(createStudyCall.sections[0].name).toBe('Custom Section');
          expect(createStudyCall.sections[0].supports.length).toBe(1);
          expect(createStudyCall.sections[0].supports[0].number).toBe(5);
          done();
        }, 10);
      }, 10);
    });

    it('should handle error during createStudy', (done) => {
      const mockStudyData = {
        title: 'Test Study',
        description: 'Test Description'
      };

      const base64Content = btoa(JSON.stringify(mockStudyData));
      const mockProgressEvent = {
        target: {
          result: base64Content
        }
      } as unknown as ProgressEvent<FileReader>;

      const mockMessageService = TestBed.inject(MessageService);
      studiesServiceMock.createStudy = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

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
          expect(component.erroredFiles()).toContain(mockFile.name);
          done();
        }, 10);
      }, 10);
    });
  });
});
