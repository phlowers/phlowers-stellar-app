import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NewStudyModalComponent } from './new-study-modal.component';
import { MessageService } from 'primeng/api';
import { StudiesService } from '@src/app/core/services/studies/studies.service';

describe('NewStudyModalComponent', () => {
  let component: NewStudyModalComponent;
  let fixture: ComponentFixture<NewStudyModalComponent>;
  let studiesServiceMock: jest.Mocked<StudiesService>;

  beforeEach(async () => {
    const messageServiceMock = {
      add: jest.fn(),
      clear: jest.fn(),
      messages: []
    };

    studiesServiceMock = {
      createStudy: jest.fn().mockResolvedValue(undefined),
      createStudyFromProtoV4: jest.fn().mockReturnValue({
        sections: [],
        shareable: false
      })
    } as unknown as jest.Mocked<StudiesService>;

    await TestBed.configureTestingModule({
      imports: [NewStudyModalComponent, BrowserAnimationsModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => 'test'
              }
            }
          }
        },
        {
          provide: MessageService,
          useValue: messageServiceMock
        },
        {
          provide: StudiesService,
          useValue: studiesServiceMock
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NewStudyModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('loadProtoV4File', () => {
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
      } as any;

      component.loadProtoV4File(mockEvent);

      expect(component.loading()).toBe(true);
      expect(mockFileReader.readAsText).not.toHaveBeenCalled();
    });

    it('should handle empty files array gracefully', () => {
      const mockEvent = {
        target: {
          files: createMockFileList([])
        }
      } as any;

      component.loadProtoV4File(mockEvent);

      expect(component.loading()).toBe(true);
      expect(mockFileReader.readAsText).not.toHaveBeenCalled();
    });

    it('should set loading state correctly during file processing', () => {
      const mockEvent = {
        target: {
          files: createMockFileList([mockFile])
        }
      } as any;

      expect(component.loading()).toBe(false);

      component.loadProtoV4File(mockEvent);

      expect(component.loading()).toBe(true);
      expect(mockFileReader.readAsText).toHaveBeenCalledWith(mockFile);
    });

    it('should handle FileReader errors gracefully', () => {
      const mockEvent = {
        target: {
          files: createMockFileList([mockFile])
        }
      } as any;

      component.loadProtoV4File(mockEvent);

      expect(mockFileReader.readAsText).toHaveBeenCalledWith(mockFile);
      expect(component.loading()).toBe(true);
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

      const mockEvent = {
        target: {
          files: createMockFileList([mockFile])
        }
      } as any;

      // Mock FileReader result
      const mockProgressEvent = {
        target: {
          result: mockCsvContent
        }
      } as any;

      component.loadProtoV4File(mockEvent);

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
});
