import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { InitComponent } from './init.component';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { Section } from '@shared/domain';

describe('Init component', () => {
  let component: InitComponent;
  let fixture: ComponentFixture<InitComponent>;
  let mockPlotService: Partial<PlotService>;
  let mockSpanService: { section: ReturnType<typeof signal<Section | null>> };
  let mockPlotOptionsService: { plotOptions: ReturnType<typeof signal> };
  let toolbarDialogService: ToolbarDialogService;

  beforeAll(() => {
    // PrimeNG overlay rendering needs matchMedia
    Object.defineProperty(globalThis, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });
  });

  beforeEach(async () => {
    mockPlotService = {
      modifySection: vi.fn().mockResolvedValue(undefined)
    } as unknown as PlotService;
    mockSpanService = {
      section: signal<Section | null>(null)
    };
    mockPlotOptionsService = {
      plotOptions: signal({
        view: '3d',
        side: 'profile',
        startSupport: 0,
        endSupport: 10,
        invert: false
      })
    };

    await TestBed.configureTestingModule({
      imports: [InitComponent],
      providers: [
        ToolbarDialogService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PlotService, useValue: mockPlotService },
        { provide: PlotSpanService, useValue: mockSpanService },
        { provide: PlotOptionsService, useValue: mockPlotOptionsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InitComponent);
    component = fixture.componentInstance;
    toolbarDialogService = TestBed.inject(ToolbarDialogService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('createMeasure', () => {
    it('should create a measure and call modifySection with correct data', async () => {
      const mockSection: Partial<Section> = {
        uuid: 'test-section-uuid',
        field_measures: []
      };
      mockSpanService.section = signal<Section | null>(mockSection as Section);

      component.newMeasureNameControl.setValue('Test Measure');
      component.newMeasureNameControl.markAsTouched();

      await component.createMeasure();

      expect(mockPlotService.modifySection).toHaveBeenCalledWith(
        expect.objectContaining({
          field_measures: expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Measure'
            })
          ]),
          selected_field_measure_uuid: expect.any(String)
        })
      );
    });

    it('should call proceedToMainComponent when form control is valid', async () => {
      const mockSection: Partial<Section> = {
        uuid: 'test-section-uuid',
        field_measures: []
      };
      mockSpanService.section = signal<Section | null>(mockSection as Section);
      const proceedSpy = vi.spyOn(toolbarDialogService, 'proceedToMainComponent');

      component.newMeasureNameControl.setValue('Valid Measure');
      component.newMeasureNameControl.markAsTouched();

      await component.createMeasure();

      expect(proceedSpy).toHaveBeenCalled();
    });

    it('should not call proceedToMainComponent when form control is invalid', async () => {
      const mockSection: Partial<Section> = {
        uuid: 'test-section-uuid',
        field_measures: []
      };
      mockSpanService.section = signal<Section | null>(mockSection as Section);
      const proceedSpy = vi.spyOn(toolbarDialogService, 'proceedToMainComponent');

      component.newMeasureNameControl.setValue('');
      component.newMeasureNameControl.markAsTouched();

      await component.createMeasure();

      expect(proceedSpy).not.toHaveBeenCalled();
    });
  });

  describe('HTML rendering', () => {
    const getByTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    it('should render new-measure-name-input', () => {
      const el = getByTestId('new-measure-name-input');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('INPUT');
    });

    it('should render create-measure-btn', () => {
      const el = getByTestId('create-measure-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });

    it('should render choose-measure-select', () => {
      const el = getByTestId('choose-measure-select');
      expect(el).toBeTruthy();
    });

    it('should render choose-measure-btn', () => {
      const el = getByTestId('choose-measure-btn');
      expect(el).toBeTruthy();
      expect(el?.tagName).toBe('BUTTON');
    });
  });

  describe('onMeasureSelected', () => {
    it('should update chooseMeasureControl with the selected measure value', () => {
      component.onMeasureSelected({ label: 'Measure 1', value: 'uuid-1' });
      expect(component.chooseMeasureControl.value).toBe('uuid-1');
    });

    it('should reset chooseMeasureControl to null when called with undefined', () => {
      component.chooseMeasureControl.setValue('uuid-1');
      component.onMeasureSelected(undefined as unknown as { label: string; value: string });
      expect(component.chooseMeasureControl.value).toBeNull();
    });
  });

  describe('deleteMeasure', () => {
    const measure1 = {
      uuid: 'uuid-1',
      name: 'Measure 1'
    };
    const measure2 = {
      uuid: 'uuid-2',
      name: 'Measure 2'
    };

    beforeEach(() => {
      mockSpanService.section = signal<Section | null>({
        uuid: 'test-section-uuid',
        field_measures: [measure1, measure2],
        selected_field_measure_uuid: undefined
      } as unknown as Section);
    });

    it('should call modifySection with the measure filtered out', async () => {
      await component.deleteMeasure({ label: 'Measure 1', value: 'uuid-1' });

      expect(mockPlotService.modifySection).toHaveBeenCalledWith({
        field_measures: [measure2]
      });
    });

    it('should not reset chooseMeasureControl when deleting a non-selected measure', async () => {
      component.chooseMeasureControl.setValue('uuid-2');

      await component.deleteMeasure({ label: 'Measure 1', value: 'uuid-1' });

      expect(component.chooseMeasureControl.value).toBe('uuid-2');
    });

    it('should reset chooseMeasureControl when the selected measure is deleted', async () => {
      component.chooseMeasureControl.setValue('uuid-1');

      await component.deleteMeasure({ label: 'Measure 1', value: 'uuid-1' });

      expect(component.chooseMeasureControl.value).toBeNull();
    });

    it('should call modifySection with filtered measures when the selected measure is deleted', async () => {
      component.chooseMeasureControl.setValue('uuid-1');

      await component.deleteMeasure({ label: 'Measure 1', value: 'uuid-1' });

      expect(mockPlotService.modifySection).toHaveBeenCalledWith({
        field_measures: [measure2]
      });
    });

    it('should not call modifySection when section is null', async () => {
      mockSpanService.section = signal<Section | null>(null);

      await component.deleteMeasure({ label: 'Measure 1', value: 'uuid-1' });

      expect(mockPlotService.modifySection).not.toHaveBeenCalled();
    });
  });

  describe('isNameAlreadyTaken uniqueness check after deletion', () => {
    it('should be false when measures is updated before the name control value changes', () => {
      // Reproduces the bug: deleting TM 2 from [TM 1, TM 2] causes the default name
      // to recalculate to "TM 2". The measures list must already be [TM 1] when
      // valueChanges fires, otherwise "TM 2" is found in the stale list.
      component.measures.set([{ label: 'TM 1', value: 'tm-uuid-1' }]);
      component.newMeasureNameControl.setValue('TM 2');

      expect(component.isNameAlreadyTaken()).toBe(false);
    });

    it('should be true when the name matches an existing measure', () => {
      component.measures.set([{ label: 'TM 1', value: 'tm-uuid-1' }, { label: 'TM 2', value: 'tm-uuid-2' }]);
      component.newMeasureNameControl.setValue('TM 1');

      expect(component.isNameAlreadyTaken()).toBe(true);
    });
  });
});
