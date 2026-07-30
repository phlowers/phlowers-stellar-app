import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';

import { StudyHeaderComponent } from './study-header.component';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('StudyHeader', () => {
  let component: StudyHeaderComponent;
  let fixture: ComponentFixture<StudyHeaderComponent>;
  let mockMessageService: vi.Mocked<MessageService>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    mockMessageService = {
      add: vi.fn()
    } as unknown as vi.Mocked<MessageService>;
    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {} },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        StudyHeaderComponent
      ],
      providers: [provideNoopAnimations(), { provide: MessageService, useValue: mockMessageService }]
    }).compileComponents();

    fixture = TestBed.createComponent(StudyHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('study', null);
    fixture.detectChanges();
  });

  describe('toggleActiveDetail', () => {
    it('should open detail when initially closed', () => {
      expect(component.isDetailOpen()).toBe(false);
      expect(component.activeDetail()).toBe('');

      component.toggleActiveDetail();

      expect(component.isDetailOpen()).toBe(true);
      expect(component.activeDetail()).toBe('0');
    });

    it('should close detail when already open', () => {
      component.isDetailOpen.set(true);
      component.activeDetail.set('0');

      component.toggleActiveDetail();
      expect(component.isDetailOpen()).toBe(false);
      expect(component.activeDetail()).toBe('');
    });
  });

  describe('UC: display study title and action buttons', () => {
    it('UC-SH1: should display study title when study is provided', () => {
      fixture.componentRef.setInput('study', {
        uuid: 'u1',
        title: 'My Study',
        author_email: 'a@b.com',
        created_at_offline: '2025-01-01',
        updated_at_offline: '2025-01-01',
        shareable: false,
        saved: true,
        sections: []
      });
      fixture.detectChanges();

      const title = getByTestId('study-title');
      expect(title).toBeTruthy();
      expect(title!.textContent).toContain('My Study');
    });

    it('UC-SH2: should render modify, duplicate and export buttons', () => {
      fixture.componentRef.setInput('study', {
        uuid: 'u1',
        title: 'Study',
        author_email: 'a@b.com',
        created_at_offline: '2025-01-01',
        updated_at_offline: '2025-01-01',
        shareable: false,
        saved: true,
        sections: []
      });
      fixture.detectChanges();

      expect(getByTestId('modify-btn')).toBeTruthy();
      expect(getByTestId('duplicate-btn')).toBeTruthy();
      expect(getByTestId('export-btn')).toBeTruthy();
    });

    it('UC-SH3: should render details toggle button', () => {
      fixture.componentRef.setInput('study', {
        uuid: 'u1',
        title: 'Study',
        author_email: 'a@b.com',
        created_at_offline: '2025-01-01',
        updated_at_offline: '2025-01-01',
        shareable: false,
        saved: true,
        sections: []
      });
      fixture.detectChanges();

      const detailsToggle = getByTestId('details-toggle');
      expect(detailsToggle).toBeTruthy();
    });
  });
});
