import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NewStudyModalComponent } from './new-study-modal.component';
import { MessageService } from 'primeng/api';
import { StudiesService } from '@src/app/core/services/studies/studies.service';

describe('NewStudyModalComponent', () => {
  let component: NewStudyModalComponent;
  let fixture: ComponentFixture<NewStudyModalComponent>;

  beforeEach(async () => {
    const messageServiceMock = {
      add: jest.fn(),
      clear: jest.fn(),
      messages: []
    };

    const studiesServiceMock = {
      createStudy: jest.fn().mockResolvedValue(undefined)
    };

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
});
