import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NewStudyModalComponent } from './new-study-modal.component';
import { MessageService } from 'primeng/api';
import { StudiesService } from '@services/studies/studies.service';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('NewStudyModalComponent', () => {
  let component: NewStudyModalComponent;
  let fixture: ComponentFixture<NewStudyModalComponent>;
  let studiesServiceMock: vi.Mocked<StudiesService>;
  let routerMock: { navigate: vi.Mock };

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    const messageServiceMock = {
      add: vi.fn(),
      clear: vi.fn(),
      messages: []
    };

    studiesServiceMock = {
      createStudy: vi.fn().mockResolvedValue('study-uuid-1'),
      createStudyFromProtoV4: vi.fn().mockReturnValue({
        sections: [],
        shareable: false
      }),
      getStudy: vi.fn().mockResolvedValue({
        uuid: 'study-uuid-1',
        author_email: 'author@test.com',
        title: 'Initial title',
        description: 'Initial description',
        sections: []
      }),
      updateStudy: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<StudiesService>;

    routerMock = {
      navigate: vi.fn().mockResolvedValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),NewStudyModalComponent, BrowserAnimationsModule],
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
        },
        {
          provide: Router,
          useValue: routerMock
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

  describe('state update helpers', () => {
    it('should update title signal', () => {
      component.updateTitle('New title');
      expect(component.title()).toBe('New title');
      expect(component.titleLength()).toBe('New title'.length);
    });

    it('should update description signal', () => {
      component.updateDescription('New description');
      expect(component.description()).toBe('New description');
      expect(component.descriptionLength()).toBe('New description'.length);
    });
  });

  describe('modify mode initialization effect', () => {
    it('should copy input title and description when modal opens in modify mode', () => {
      fixture.componentRef.setInput('titleInput', 'Existing title');
      fixture.componentRef.setInput('descriptionInput', 'Existing description');
      fixture.componentRef.setInput('mode', 'modify');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      expect(component.title()).toBe('Existing title');
      expect(component.description()).toBe('Existing description');
    });
  });

  describe('onSubmit in new mode', () => {
    it('should create study, navigate and close modal', async () => {
      fixture.componentRef.setInput('mode', 'new');
      component.updateTitle('My created study');
      component.updateDescription('My description');

      const isOpenChangeSpy = vi.spyOn(component.isOpenChange, 'emit');

      await component.onSubmit();

      expect(studiesServiceMock.createStudy).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/study', 'study-uuid-1']);
      expect(isOpenChangeSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('onSubmit in modify mode', () => {
    it('should update study, emit refreshStudy and close modal', async () => {
      fixture.componentRef.setInput('mode', 'modify');
      fixture.componentRef.setInput('studyUuid', 'study-uuid-1');
      component.updateTitle('Updated title');
      component.updateDescription('Updated description');

      const refreshSpy = vi.spyOn(component.refreshStudy, 'emit');
      const isOpenChangeSpy = vi.spyOn(component.isOpenChange, 'emit');

      await component.onSubmit();

      expect(studiesServiceMock.getStudy).toHaveBeenCalledWith('study-uuid-1');
      expect(studiesServiceMock.updateStudy).toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalledWith('study-uuid-1');
      expect(isOpenChangeSpy).toHaveBeenCalledWith(false);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('should do nothing when study cannot be found', async () => {
      fixture.componentRef.setInput('mode', 'modify');
      fixture.componentRef.setInput('studyUuid', 'missing-study');
      studiesServiceMock.getStudy.mockResolvedValueOnce(null as never);

      const isOpenChangeSpy = vi.spyOn(component.isOpenChange, 'emit');

      await component.onSubmit();

      expect(studiesServiceMock.updateStudy).not.toHaveBeenCalled();
      expect(isOpenChangeSpy).not.toHaveBeenCalled();
    });
  });
});
