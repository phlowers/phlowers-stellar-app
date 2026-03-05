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

  describe('Regression: Bug #447 — App freeze when switching span', () => {
    /**
     * Helper creating two distinct span loads used across regression tests.
     * - support-1: referenceSupport LEFT, type PUNCTUAL, loadWeight 10, loadPosition 2
     * - support-2: referenceSupport LEFT, type PUNCTUAL, loadWeight 20, loadPosition 5
     */
    const createTemporaryLoadDataTwoSpans = (): ChargeData => ({
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
          referenceSupport: 'LEFT' as const,
          type: LoadType.PUNCTUAL,
          loadWeight: 10,
          loadPosition: 2
        },
        {
          supportUuid: 'support-2',
          referenceSupport: 'LEFT' as const,
          type: LoadType.PUNCTUAL,
          loadWeight: 20,
          loadPosition: 5
        }
      ]
    });

    beforeEach(() => {
      (mockPlotService['getSupportIndex'] as jest.Mock).mockImplementation((uuid: string) =>
        uuid === 'support-1' ? 0 : uuid === 'support-2' ? 1 : -1
      );
    });

    describe('Bug 1 — spanSelectEffect must not track section() as a reactive dependency', () => {
      it('should not call plotOptionsChange again when a signal read inside getSupportIndex changes', () => {
        // Simulate the real PlotService.getSupportIndex which reads section() internally.
        // Without untracked(), that read would register section() as a dependency of
        // spanSelectEffect, causing the effect to re-run on every Dexie emission.
        const internalSignal = signal(0);
        (mockPlotService['getSupportIndex'] as jest.Mock).mockImplementation(() => {
          internalSignal(); // reads a signal — simulates reading section()
          return 0;
        });

        component.form.controls.spanSelect.setValue('support-1');
        fixture.detectChanges();

        expect(mockPlotService['plotOptionsChange']).toHaveBeenCalledTimes(1);

        // Simulate a section() change (e.g. a new Dexie emission with a fresh object reference)
        internalSignal.set(1);
        fixture.detectChanges();

        // spanSelectEffect must NOT have re-run because getSupportIndex is wrapped in untracked()
        expect(mockPlotService['plotOptionsChange']).toHaveBeenCalledTimes(1);
      });
    });

    describe('Bug 2 — enable() must use { emitEvent: false } to avoid corrupting load data', () => {
      it('should preserve span A load data when switching back to span A after visiting span B', () => {
        // Scenario:
        // 1. Select span A, user sets referenceSupport to 'RIGHT' → signal = 'RIGHT'
        // 2. Switch to span B → applySelectedLoadValues sets form to 'LEFT' (emitEvent:false)
        //    signal stays 'RIGHT', but the form control value is now 'LEFT'
        // 3. Switch back to span A → enable() (already enabled) re-emits 'LEFT' (the current form value)
        //    Without emitEvent:false: signal 'RIGHT'→'LEFT' → referenceSupportEffect fires
        //    → onLoadControlChange('referenceSupport', 'LEFT') → span A data corrupted to 'LEFT'
        const temporaryLoadData = createTemporaryLoadDataTwoSpans();
        mockPlotService['temporaryLoadData'] = temporaryLoadData;

        // Step 1 — select span A and simulate the user choosing 'RIGHT'
        component.form.controls.spanSelect.setValue('support-1');
        fixture.detectChanges();
        component.form.controls.referenceSupport.setValue('RIGHT');
        fixture.detectChanges();
        expect(temporaryLoadData.spanLoads[0].referenceSupport).toBe('RIGHT');

        // Step 2 — switch to span B: form becomes 'LEFT' (span B data), signal stays 'RIGHT'
        component.form.controls.spanSelect.setValue('support-2');
        fixture.detectChanges();

        // Step 3 — switch back to span A: enable() would emit 'LEFT' (current form value)
        // if emitEvent:true, triggering the effect with a stale value
        component.form.controls.spanSelect.setValue('support-1');
        fixture.detectChanges();

        // Span A's referenceSupport must remain 'RIGHT', not be overwritten by span B's form value
        expect(temporaryLoadData.spanLoads[0].referenceSupport).toBe('RIGHT');
      });
    });

    describe('Bug 3 — individual effects must not overwrite fields of other controls with stale signal values', () => {
      it('should not overwrite type or loadWeight of span B when only loadPosition changes', () => {
        // Scenario:
        // 1. Select span A, set type to MARKING → type signal = 'marking'
        // 2. Switch to span B (PUNCTUAL, loadWeight 20) → applySelectedLoadValues sets form.type
        //    to 'punctual' with emitEvent:false → type signal stays 'marking'
        // 3. User changes loadPosition on span B
        //    Old bug (combined effect): type signal 'marking' → onLoadControlChange('type','marking')
        //    → span B type overwritten to 'marking' AND loadWeight reset to 0
        //    Fix (separate effects): only loadPositionEffect fires → only loadPosition updated
        const temporaryLoadData = createTemporaryLoadDataTwoSpans();
        mockPlotService['temporaryLoadData'] = temporaryLoadData;

        // Step 1 — select span A and set type to MARKING
        component.form.controls.spanSelect.setValue('support-1');
        fixture.detectChanges();
        component.form.controls.type.setValue(LoadType.MARKING);
        fixture.detectChanges();
        // type signal is now 'marking'

        // Step 2 — switch to span B: form.type → 'punctual' (emitEvent:false), signal stays 'marking'
        component.form.controls.spanSelect.setValue('support-2');
        fixture.detectChanges();

        // Step 3 — user changes only loadPosition on span B
        component.form.controls.loadPosition.setValue(99);
        fixture.detectChanges();

        expect(temporaryLoadData.spanLoads[1].type).toBe(LoadType.PUNCTUAL);
        expect(temporaryLoadData.spanLoads[1].loadWeight).toBe(20);
        expect(temporaryLoadData.spanLoads[1].loadPosition).toBe(99);
      });

      it('should not overwrite loadWeight of span B when only referenceSupport changes', () => {
        // Scenario:
        // 1. Select span A, user sets loadWeight to 999 → loadWeight signal = 999
        // 2. Switch to span B (loadWeight 20) → applySelectedLoadValues sets form.loadWeight
        //    to 20 with emitEvent:false → loadWeight signal stays 999
        // 3. User changes referenceSupport on span B
        //    Old bug (combined effect): loadWeight signal 999 → onLoadControlChange('loadWeight',999)
        //    → span B loadWeight overwritten to 999
        //    Fix (separate effects): only referenceSupportEffect fires → only referenceSupport updated
        const temporaryLoadData = createTemporaryLoadDataTwoSpans();
        mockPlotService['temporaryLoadData'] = temporaryLoadData;

        // Step 1 — select span A and set loadWeight to 999
        component.form.controls.spanSelect.setValue('support-1');
        fixture.detectChanges();
        component.form.controls.loadWeight.setValue(999);
        fixture.detectChanges();
        // loadWeight signal is now 999

        // Step 2 — switch to span B: form.loadWeight → 20 (emitEvent:false), signal stays 999
        component.form.controls.spanSelect.setValue('support-2');
        fixture.detectChanges();

        // Step 3 — user changes only referenceSupport on span B
        component.form.controls.referenceSupport.setValue('RIGHT');
        fixture.detectChanges();

        expect(temporaryLoadData.spanLoads[1].loadWeight).toBe(20);
        expect(temporaryLoadData.spanLoads[1].referenceSupport).toBe('RIGHT');
      });
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
