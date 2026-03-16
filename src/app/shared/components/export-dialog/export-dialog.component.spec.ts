import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { signal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ExportDialogComponent } from './export-dialog.component';
import { StudiesService } from '@services/studies/studies.service';

describe('ExportDialogComponent', () => {
  let component: ExportDialogComponent;
  let fixture: ComponentFixture<ExportDialogComponent>;
  let mockStudiesService: Partial<StudiesService>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    mockStudiesService = {
      exportDialogData: signal({ isOpen: true, uuid: 'test-uuid', title: 'Test Study' } as any),
      downloadStudy: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ExportDialogComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [{ provide: StudiesService, useValue: mockStudiesService }]
    }).compileComponents();

    fixture = TestBed.createComponent(ExportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('HTML rendering', () => {
    it('should render the export dialog', () => {
      const el = getByTestId('export-dialog');
      expect(el).toBeTruthy();
    });

    it('should render the export form', () => {
      const el = getByTestId('export-form');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('FORM');
    });

    it('should render the filename input', () => {
      const el = getByTestId('export-filename-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render the export format select', () => {
      const el = getByTestId('export-format-select');
      expect(el).toBeTruthy();
    });

    it('should render the cancel button', () => {
      const el = getByTestId('export-cancel-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    it('should render the export submit button', () => {
      const el = getByTestId('export-submit-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });
  });
});
