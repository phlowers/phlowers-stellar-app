import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NewStudyModalComponent } from './new-study-modal.component';
import { MessageService } from 'primeng/api';
import { StudiesService } from '@services/studies/studies.service';

describe('NewStudyModalComponent', () => {
  let component: NewStudyModalComponent;
  let fixture: ComponentFixture<NewStudyModalComponent>;
  let studiesServiceMock: jest.Mocked<StudiesService>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

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

  describe('UC: should open create modal, fill title, validate', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('isOpen', true);
      fixture.componentRef.setInput('mode', 'new');
      fixture.detectChanges();
    });

    it('UC-S5: should render modal with title input and validate button', () => {
      const modal = getByTestId('new-study-modal');
      expect(modal).toBeTruthy();

      const titleInput = getByTestId('study-title-input');
      expect(titleInput).toBeTruthy();
      expect(titleInput?.tagName).toBe('INPUT');

      const descInput = getByTestId('study-description-input');
      expect(descInput).toBeTruthy();
      expect(descInput?.tagName).toBe('TEXTAREA');
    });

    it('UC-S6: should disable validate when title is empty', () => {
      component.updateTitle('');
      fixture.detectChanges();

      const validateBtn = getByTestId('validate-btn') as HTMLButtonElement;
      expect(validateBtn).toBeTruthy();
      expect(validateBtn.disabled).toBe(true);

      // Fill title, should enable
      component.updateTitle('My Study');
      fixture.detectChanges();

      const validateBtnAfter = getByTestId('validate-btn') as HTMLButtonElement;
      expect(validateBtnAfter.disabled).toBe(false);
    });

    it('should render cancel button', () => {
      const cancelBtn = getByTestId('cancel-btn');
      expect(cancelBtn).toBeTruthy();
    });
  });
});
