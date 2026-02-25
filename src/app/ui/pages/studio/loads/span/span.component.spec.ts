import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SpanComponent } from './span.component';
import { PlotService, SpanOption } from '../../services/plot.service';
import { LoadFormsService } from '../loadForms.service';
import { ChargeData, LoadType, SpanLoad, SymmetryType } from '@core/domain/models/charge.model';

const mockSpanOptions: SpanOption[] = [
  { label: '1 - 2', value: 'support-1' },
  { label: '2 - 3', value: 'support-2' }
];

const mockSupportOptions = [
  { label: 1, value: 'LEFT' as const },
  { label: 2, value: 'RIGHT' as const }
];

const createTemporaryLoadData = (overrides: Partial<SpanLoad> = {}): ChargeData => ({
  climate: {
    windPressure: null,
    cableTemperature: null,
    symmetryType: SymmetryType.SYMMETRIC,
    iceThickness: null,
    frontierSupportNumber: null,
    iceThicknessBefore: null,
    iceThicknessAfter: null
  },
  spanLoads: [
    {
      supportUuid: 'support-1',
      referenceSupport: 'LEFT',
      type: LoadType.PUNCTUAL,
      loadWeight: 10,
      loadPosition: 2,
      ...overrides
    }
  ]
});

describe('SpanComponent', () => {
  let component: SpanComponent;
  let fixture: ComponentFixture<SpanComponent>;
  let mockPlotService: Record<string, unknown>;
  let mockLoadFormsService: Record<string, unknown>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    mockPlotService = {
      getSpanOptions: signal<SpanOption[]>(mockSpanOptions),
      getSupportIndex: jest.fn().mockReturnValue(0),
      getSupportOptions: jest.fn().mockReturnValue(mockSupportOptions),
      plotOptionsChange: jest.fn(),
      temporaryLoadData: null
    };

    mockLoadFormsService = {
      initTemporaryLoadData: jest.fn(),
      deleteLoad: jest.fn(),
      saveTemporaryLoadDataInSection: jest.fn().mockResolvedValue(undefined),
      calculateLoad: jest.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [SpanComponent],
      providers: [
        { provide: PlotService, useValue: mockPlotService },
        { provide: LoadFormsService, useValue: mockLoadFormsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SpanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates with default form state', () => {
    expect(component).toBeTruthy();
    expect(component.form.controls.spanSelect.value).toBeNull();
    expect(component.form.controls.referenceSupport.disabled).toBe(true);
    expect(component.form.controls.type.value).toBe(LoadType.PUNCTUAL);
    expect(component.form.controls.loadPosition.value).toBe(0);
    expect(component.form.controls.loadWeight.value).toBe(0);
  });

  it('computes span options from plot service', () => {
    const spans = component.spansOptions();
    expect(spans).toEqual(mockSpanOptions);
  });

  describe('Span selection', () => {
    it('updates supports options and plot options when span is selected', () => {
      component.form.controls.spanSelect.setValue('support-1');
      fixture.detectChanges();

      expect(mockPlotService['getSupportOptions']).toHaveBeenCalledWith('support-1');
      expect(component.supportsOptions()).toEqual(mockSupportOptions);
      expect(component.form.controls.referenceSupport.enabled).toBe(true);
      expect(mockPlotService['plotOptionsChange']).toHaveBeenCalledWith({
        startSupport: 0,
        endSupport: 1
      });
    });

    it('resets supports and disables referenceSupport when span is cleared', () => {
      component.form.controls.spanSelect.setValue('support-1');
      fixture.detectChanges();

      component.form.controls.spanSelect.setValue(null);
      fixture.detectChanges();

      expect(component.supportsOptions()).toEqual([]);
      expect(component.form.controls.referenceSupport.disabled).toBe(true);
    });

    it('applies existing load values when span is selected', () => {
      mockPlotService['temporaryLoadData'] = createTemporaryLoadData({
        referenceSupport: 'RIGHT',
        type: LoadType.MARKING,
        loadWeight: 12,
        loadPosition: 5
      });

      component.form.controls.spanSelect.setValue('support-1');
      fixture.detectChanges();

      expect(component.form.controls.referenceSupport.value).toBe('RIGHT');
      expect(component.form.controls.type.value).toBe(LoadType.MARKING);
      expect(component.form.controls.loadWeight.value).toBe(12);
      expect(component.form.controls.loadPosition.value).toBe(5);
    });
  });

  describe('resetForm', () => {
    it('resets form values and disables referenceSupport', () => {
      component.form.controls.spanSelect.setValue('support-1');
      fixture.detectChanges();
      component.form.controls.referenceSupport.setValue('LEFT');

      component.resetForm();
      fixture.detectChanges();

      expect(component.form.get('spanSelect')?.value).toBeNull();
      expect(component.form.get('referenceSupport')?.disabled).toBe(true);
      expect(mockLoadFormsService['initTemporaryLoadData']).toHaveBeenCalled();
    });
  });

  describe('deleteCharge', () => {
    it('resets form and calls deleteLoad', () => {
      component.form.controls.spanSelect.setValue('support-1');
      fixture.detectChanges();

      component.deleteCharge();
      fixture.detectChanges();

      expect(mockLoadFormsService['deleteLoad']).toHaveBeenCalled();
      expect(component.form.controls.spanSelect.value).toBeNull();
    });
  });

  describe('saveLoadCase', () => {
    it('does not save when form is invalid', () => {
      component.saveLoadCase();

      expect(mockLoadFormsService['saveTemporaryLoadDataInSection']).not.toHaveBeenCalled();
    });

    it('saves when form is valid', () => {
      component.form.controls.spanSelect.setValue('support-1');
      component.form.controls.referenceSupport.enable();
      component.form.controls.referenceSupport.setValue('LEFT');
      fixture.detectChanges();

      component.saveLoadCase();

      expect(mockLoadFormsService['saveTemporaryLoadDataInSection']).toHaveBeenCalled();
    });
  });

  describe('calculateLoadCase', () => {
    it('does not calculate when form is invalid', () => {
      component.calculateLoadCase();

      expect(mockLoadFormsService['calculateLoad']).not.toHaveBeenCalled();
    });

    it('calculates when form is valid', () => {
      component.form.controls.spanSelect.setValue('support-1');
      component.form.controls.referenceSupport.enable();
      component.form.controls.referenceSupport.setValue('LEFT');
      fixture.detectChanges();

      component.calculateLoadCase();

      expect(mockLoadFormsService['calculateLoad']).toHaveBeenCalled();
    });
  });

  describe('Load control changes', () => {
    it('updates temporary load data when loadWeight changes', () => {
      const temporaryLoadData = createTemporaryLoadData();
      mockPlotService['temporaryLoadData'] = temporaryLoadData;

      component.form.controls.spanSelect.setValue('support-1');
      fixture.detectChanges();

      component.form.controls.loadWeight.setValue(50);
      fixture.detectChanges();

      expect(temporaryLoadData.spanLoads[0].loadWeight).toBe(50);
    });

    it('resets loadWeight to 0 when type changes to marking', () => {
      const temporaryLoadData = createTemporaryLoadData();
      mockPlotService['temporaryLoadData'] = temporaryLoadData;

      component.form.controls.spanSelect.setValue('support-1');
      fixture.detectChanges();

      component.form.controls.type.setValue(LoadType.MARKING);
      fixture.detectChanges();

      expect(temporaryLoadData.spanLoads[0].loadWeight).toBe(0);
      expect(component.form.controls.loadWeight.value).toBe(0);
    });
  });

  describe('UI state', () => {
    it('disables save and calculate buttons when form is invalid', () => {
      const saveButton = getByTestId('save-load') as HTMLButtonElement;
      const calculateButton = getByTestId('calculate-load') as HTMLButtonElement;

      expect(saveButton.disabled).toBe(true);
      expect(calculateButton.disabled).toBe(true);
    });

    it('shows load weight input for punctual type', () => {
      component.form.controls.type.setValue(LoadType.PUNCTUAL);
      fixture.detectChanges();

      expect(getByTestId('load-weight')).toBeTruthy();
    });

    it('hides load weight input for marking type', () => {
      component.form.controls.type.setValue(LoadType.MARKING);
      fixture.detectChanges();

      expect(getByTestId('load-weight')).toBeNull();
    });
  });
});
