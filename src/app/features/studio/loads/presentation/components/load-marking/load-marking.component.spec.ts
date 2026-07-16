import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LoadMarkingComponent } from './load-marking.component';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { LoadFormsService } from '../../services/loadForms.service';
import { ChargeData, LoadType, SpanLoad, SymmetryType } from '@shared/domain/models/charge.model';
import { SpanOption } from '@src/app/shared/types/plot.types';

const mockSpanOptions: SpanOption[] = [
  { label: '1 - 2', value: 'support-1' },
  { label: '2 - 3', value: 'support-2' }
];

const mockSupportOptions = [
  { label: '1', value: 'LEFT' as const },
  { label: '2', value: 'RIGHT' as const }
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

describe('LoadMarkingComponent', () => {
  let component: LoadMarkingComponent;
  let fixture: ComponentFixture<LoadMarkingComponent>;
  let mockPlotService: Record<string, unknown>;
  let mockSpanService: Record<string, unknown>;
  let mockLoadFormsService: Record<string, unknown>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    mockPlotService = {
      plotOptionsChange: vi.fn(),
      temporaryLoadData: null,
      loading: signal(false)
    };

    mockSpanService = {
      getSpanOptions: signal<SpanOption[]>(mockSpanOptions),
      getSupportIndex: vi.fn().mockReturnValue(0),
      getSupportOptions: vi.fn().mockReturnValue(mockSupportOptions)
    };

    mockLoadFormsService = {
      initTemporaryLoadData: vi.fn(),
      deleteLoad: vi.fn(),
      deleteSpanLoad: vi.fn(),
      saveTemporaryLoadDataInSection: vi.fn().mockResolvedValue(undefined),
      calculateLoad: vi.fn().mockResolvedValue(undefined),
      activeLoadTab: signal('0'),
      selectedSpanSupportUuid: signal<string | null>(null)
    };

    await TestBed.configureTestingModule({
      imports: [LoadMarkingComponent],
      providers: [
        { provide: PlotService, useValue: mockPlotService },
        { provide: PlotSpanService, useValue: mockSpanService },
        { provide: LoadFormsService, useValue: mockLoadFormsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoadMarkingComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('chargeUuid', 'test-charge-uuid');
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
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
    it('updates supports options when span is selected', () => {
      component.form.controls.spanSelect.setValue('support-1');
      fixture.detectChanges();

      expect(mockSpanService['getSupportOptions']).toHaveBeenCalledWith('support-1');
      expect(component.supportsOptions()).toEqual(mockSupportOptions);
      expect(component.form.controls.referenceSupport.enabled).toBe(true);
      expect(mockPlotService['plotOptionsChange']).not.toHaveBeenCalled();
    });

    it('resets supports and disables referenceSupport when span is cleared', () => {
      component.form.controls.spanSelect.setValue('support-1');
      fixture.detectChanges();

      component.form.controls.spanSelect.setValue(null);
      fixture.detectChanges();

      expect(component.supportsOptions()).toEqual([]);
      expect(component.form.controls.referenceSupport.disabled).toBe(true);
    });

    it('does nothing when getSupportIndex returns -1 for selected span', () => {
      (mockSpanService['getSupportIndex'] as ReturnType<typeof vi.fn>).mockReturnValue(-1);

      component.form.controls.spanSelect.setValue('support-1');
      fixture.detectChanges();

      expect(component.supportsOptions()).toEqual([]);
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
    it('does nothing when no span is selected', async () => {
      component.form.controls.spanSelect.setValue(null);
      fixture.detectChanges();

      await component.deleteCharge();

      expect(mockLoadFormsService['deleteSpanLoad']).not.toHaveBeenCalled();
      expect(mockLoadFormsService['calculateLoad']).not.toHaveBeenCalled();
      expect(mockLoadFormsService['saveTemporaryLoadDataInSection']).not.toHaveBeenCalled();
    });

    it('calls deleteSpanLoad then saveTemporaryLoadDataInSection in order then resets form controls', async () => {
      component.form.controls.spanSelect.setValue('support-1');
      fixture.detectChanges();

      const callOrder: string[] = [];
      (mockLoadFormsService['deleteSpanLoad'] as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callOrder.push('deleteSpanLoad');
      });
      (mockLoadFormsService['saveTemporaryLoadDataInSection'] as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callOrder.push('save');
        return Promise.resolve();
      });

      await component.deleteCharge();
      fixture.detectChanges();

      expect(callOrder).toEqual(['deleteSpanLoad', 'save']);
      expect(mockLoadFormsService['deleteSpanLoad']).toHaveBeenCalledWith('support-1');
      expect(component.form.controls.spanSelect.value).toBeNull();
    });
  });

  describe('saveLoadCase', () => {
    it('does not save when form is invalid', async () => {
      await component.saveLoadCase();

      expect(mockLoadFormsService['calculateLoad']).not.toHaveBeenCalled();
      expect(mockLoadFormsService['saveTemporaryLoadDataInSection']).not.toHaveBeenCalled();
    });

    it('calls saveTemporaryLoadDataInSection when form is valid', async () => {
      component.form.controls.spanSelect.setValue('support-1');
      component.form.controls.referenceSupport.enable();
      component.form.controls.referenceSupport.setValue('LEFT');
      fixture.detectChanges();

      (mockLoadFormsService['saveTemporaryLoadDataInSection'] as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await component.saveLoadCase();

      expect(mockLoadFormsService['saveTemporaryLoadDataInSection']).toHaveBeenCalled();
    });

    it('sets isSaving to true during save and false after', async () => {
      component.form.controls.spanSelect.setValue('support-1');
      component.form.controls.referenceSupport.enable();
      component.form.controls.referenceSupport.setValue('LEFT');
      fixture.detectChanges();

      let savingDuring = false;
      (mockLoadFormsService['saveTemporaryLoadDataInSection'] as ReturnType<typeof vi.fn>).mockImplementation(() => {
        savingDuring = component.isSaving();
        return Promise.resolve();
      });

      await component.saveLoadCase();

      expect(savingDuring).toBe(true);
      expect(component.isSaving()).toBe(false);
    });
  });

  describe('calculateLoadCase', () => {
    it('does not calculate when form is invalid', async () => {
      await component.calculateLoadCase();

      expect(mockLoadFormsService['calculateLoad']).not.toHaveBeenCalled();
    });

    it('calculates when form is valid', async () => {
      component.form.controls.spanSelect.setValue('support-1');
      component.form.controls.referenceSupport.enable();
      component.form.controls.referenceSupport.setValue('LEFT');
      fixture.detectChanges();

      await component.calculateLoadCase();

      expect(mockLoadFormsService['calculateLoad']).toHaveBeenCalled();
    });

    it('sets isCalculatingLoad to true during calculation and false after', async () => {
      component.form.controls.spanSelect.setValue('support-1');
      component.form.controls.referenceSupport.enable();
      component.form.controls.referenceSupport.setValue('LEFT');
      fixture.detectChanges();

      let calculatingDuring = false;
      (mockLoadFormsService['calculateLoad'] as ReturnType<typeof vi.fn>).mockImplementation(() => {
        calculatingDuring = component.isCalculatingLoad();
        return Promise.resolve();
      });

      await component.calculateLoadCase();

      expect(calculatingDuring).toBe(true);
      expect(component.isCalculatingLoad()).toBe(false);
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

    it('resets referenceSupport to default when value is null', () => {
      const temporaryLoadData = createTemporaryLoadData({ referenceSupport: 'RIGHT' });
      mockPlotService['temporaryLoadData'] = temporaryLoadData;

      component.form.controls.spanSelect.setValue('support-1');
      fixture.detectChanges();

      // Emit 'RIGHT' first so the signal transitions from null → 'RIGHT'
      component.form.controls.referenceSupport.setValue('RIGHT');
      fixture.detectChanges();

      // Now emit null: signal transitions from 'RIGHT' → null, triggering the else branch
      component.form.controls.referenceSupport.setValue(null);
      fixture.detectChanges();

      expect(temporaryLoadData.spanLoads[0].referenceSupport).toBe('LEFT');
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
      (mockSpanService['getSupportIndex'] as vi.Mock).mockImplementation((uuid: unknown) =>
        uuid === 'support-1' ? 0 : uuid === 'support-2' ? 1 : -1
      );
    });

    describe('Bug 1 — spanSelectEffect must not track section() as a reactive dependency', () => {
      it('should not call plotOptionsChange when a signal read inside getSupportIndex changes', () => {
        // Simulate the real PlotService.getSupportIndex which reads section() internally.
        // Without untracked(), that read would register section() as a dependency of
        // spanSelectEffect, causing the effect to re-run on every Dexie emission.
        const internalSignal = signal(0);
        (mockSpanService['getSupportIndex'] as vi.Mock).mockImplementation(() => {
          internalSignal(); // reads a signal — simulates reading section()
          return 0;
        });

        component.form.controls.spanSelect.setValue('support-1');
        fixture.detectChanges();

        // Zoom is no longer triggered automatically on span selection — only via zoomToSpan()
        expect(mockPlotService['plotOptionsChange']).not.toHaveBeenCalled();

        // Simulate a section() change (e.g. a new Dexie emission with a fresh object reference)
        internalSignal.set(1);
        fixture.detectChanges();

        // Confirm no spurious plotOptionsChange call was triggered
        expect(mockPlotService['plotOptionsChange']).not.toHaveBeenCalled();
      });

      it('zoomToSpan() calls plotOptionsChange with the correct span index', () => {
        component.form.controls.spanSelect.setValue('support-1');
        fixture.detectChanges();

        component.zoomToSpan();

        expect(mockPlotService['plotOptionsChange']).toHaveBeenCalledTimes(1);
        expect(mockPlotService['plotOptionsChange']).toHaveBeenCalledWith({ startSupport: 0, endSupport: 1 });
      });

      it('zoomToSpan() does nothing when no span is selected', () => {
        component.zoomToSpan();

        expect(mockPlotService['plotOptionsChange']).not.toHaveBeenCalled();
      });
    });

    describe('Bug 2 — enable() must use { emitEvent: false } to avoid corrupting load data', () => {
      it('should preserve span A load data when switching back to span A after visiting span B', () => {
        // Scenario:
        // 1. Select span A, user sets referenceSupport to 'RIGHT' → signal = 'RIGHT'
        // 2. Switch to span B → applySelectedLoadValues sets form to 'LEFT' (emitEvent:false)
        //    signal stays 'RIGHT', but span B form value is 'LEFT'
        // 3. Switch back to span A → enable() would re-emit the current form value 'LEFT'
        //    Without enable({ emitEvent: false }): signal 'RIGHT'→'LEFT' → referenceSupportEffect fires
        //    → onLoadControlChange('referenceSupport', 'LEFT') → span A data corrupted to 'LEFT'
        //    Fix: enable({ emitEvent: false }) silences the re-emission.
        //    Then applySelectedLoadValues sets the form to 'RIGHT' (emitEvent:false), signal stays 'RIGHT'.
        const temporaryLoadData = createTemporaryLoadDataTwoSpans();
        mockPlotService['temporaryLoadData'] = temporaryLoadData;

        // Step 1 — select span A and simulate the user choosing 'RIGHT'
        component.form.controls.spanSelect.setValue('support-1');
        fixture.detectChanges();
        component.form.controls.referenceSupport.setValue('RIGHT');
        fixture.detectChanges();
        expect(temporaryLoadData.spanLoads[0].referenceSupport).toBe('RIGHT');

        // Step 2 — switch to span B: form and signal both update to 'LEFT' (span B data)
        component.form.controls.spanSelect.setValue('support-2');
        fixture.detectChanges();

        // Step 3 — switch back to span A: enable() is silent (emitEvent:false);
        // applySelectedLoadValues then sets form + signal to 'RIGHT'
        component.form.controls.spanSelect.setValue('support-1');
        fixture.detectChanges();

        // Span A's referenceSupport must remain 'RIGHT', not be overwritten
        expect(temporaryLoadData.spanLoads[0].referenceSupport).toBe('RIGHT');
      });
    });

    describe('Bug 3 — individual effects must not overwrite fields of other controls with stale signal values', () => {
      it('should not overwrite type or loadWeight of span B when only loadPosition changes', () => {
        // Scenario:
        // 1. Select span A, set type to MARKING → type signal = 'marking'
        // 2. Switch to span B (PUNCTUAL, loadWeight 20) → applySelectedLoadValues sets form.type
        //    to 'punctual' (emitEvent:false) → type signal stays 'marking', span B form value is 'punctual'
        // 3. User changes loadPosition on span B
        //    Old bug (combined effect): stale type signal → onLoadControlChange('type','marking')
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

        // Step 2 — switch to span B: form.loadWeight → 20 (emitEvent:false) → loadWeight signal stays 999
        component.form.controls.spanSelect.setValue('support-2');
        fixture.detectChanges();

        // Step 3 — user changes only referenceSupport on span B
        component.form.controls.referenceSupport.setValue('RIGHT');
        fixture.detectChanges();

        expect(temporaryLoadData.spanLoads[1].loadWeight).toBe(20);
        expect(temporaryLoadData.spanLoads[1].referenceSupport).toBe('RIGHT');
      });
    });

    describe('Bug 4 — selecting the same type/referenceSupport on a second span must update its data', () => {
      it('should update span B type to MARKING when span A was already set to MARKING', () => {
        // Root cause: applySelectedLoadValues previously used emitEvent:false for type/referenceSupport.
        // When switching from span A (MARKING) to span B, the type signal stayed 'marking'.
        // Selecting 'marking' on span B emitted 'marking' → signal 'marking'→'marking' (no change)
        // → typeEffect never fired → span B.type was never updated → only span A had a marking.
        const temporaryLoadData = createTemporaryLoadDataTwoSpans();
        mockPlotService['temporaryLoadData'] = temporaryLoadData;

        // Step 1 — select span A and set type to MARKING
        component.form.controls.spanSelect.setValue('support-1');
        fixture.detectChanges();
        component.form.controls.type.setValue(LoadType.MARKING);
        fixture.detectChanges();
        expect(temporaryLoadData.spanLoads[0].type).toBe(LoadType.MARKING);

        // Step 2 — switch to span B (PUNCTUAL): type signal must update to 'punctual'
        component.form.controls.spanSelect.setValue('support-2');
        fixture.detectChanges();

        // Step 3 — user selects MARKING for span B
        component.form.controls.type.setValue(LoadType.MARKING);
        fixture.detectChanges();

        // Both spans must now have MARKING type
        expect(temporaryLoadData.spanLoads[1].type).toBe(LoadType.MARKING);
      });

      it('should update span B referenceSupport to RIGHT when span A already had RIGHT', () => {
        const temporaryLoadData = createTemporaryLoadDataTwoSpans();
        mockPlotService['temporaryLoadData'] = temporaryLoadData;

        // Step 1 — select span A and set referenceSupport to RIGHT
        component.form.controls.spanSelect.setValue('support-1');
        fixture.detectChanges();
        component.form.controls.referenceSupport.setValue('RIGHT');
        fixture.detectChanges();
        expect(temporaryLoadData.spanLoads[0].referenceSupport).toBe('RIGHT');

        // Step 2 — switch to span B (LEFT): signal must update to 'LEFT'
        component.form.controls.spanSelect.setValue('support-2');
        fixture.detectChanges();

        // Step 3 — user selects RIGHT for span B
        component.form.controls.referenceSupport.setValue('RIGHT');
        fixture.detectChanges();

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

  describe('HTML rendering - zoom button', () => {
    it('should render the zoom button', () => {
      const btn = getByTestId('span-zoom');
      expect(btn).toBeTruthy();
      expect(btn?.tagName).toBe('BUTTON');
    });

    it('should call plotOptionsChange when zoom button is clicked with a selected span', () => {
      component.form.controls.spanSelect.setValue('support-1');
      fixture.detectChanges();

      const btn = getByTestId('span-zoom') as HTMLButtonElement;
      btn.click();

      expect(mockPlotService['plotOptionsChange']).toHaveBeenCalledTimes(1);
      expect(mockPlotService['plotOptionsChange']).toHaveBeenCalledWith({ startSupport: 0, endSupport: 1 });
    });

    it('should not call plotOptionsChange when zoom button is clicked with no span selected', () => {
      const btn = getByTestId('span-zoom') as HTMLButtonElement;
      btn.click();

      expect(mockPlotService['plotOptionsChange']).not.toHaveBeenCalled();
    });

    it('should disable zoom button when no span is selected', () => {
      component.form.controls.spanSelect.setValue(null);
      fixture.detectChanges();
      const btn = getByTestId('span-zoom') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should enable zoom button when a span is selected', () => {
      component.form.controls.spanSelect.setValue('support-1');
      fixture.detectChanges();
      const btn = getByTestId('span-zoom') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });
  });

  describe('externalSpanSelectionEffect', () => {
    it('should set spanSelect value and clear selectedSpanSupportUuid when a uuid is provided', async () => {
      (mockLoadFormsService['selectedSpanSupportUuid'] as ReturnType<typeof signal<string | null>>).set('support-2');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.form.controls.spanSelect.value).toBe('support-2');
      expect(
        (mockLoadFormsService['selectedSpanSupportUuid'] as ReturnType<typeof signal<string | null>>)()
      ).toBeNull();
    });
  });
});
