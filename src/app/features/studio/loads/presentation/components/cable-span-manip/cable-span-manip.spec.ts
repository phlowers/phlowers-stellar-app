import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { signal } from '@angular/core';
import { CableSpanManipComponent } from './cable-span-manip';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { CableSpanManipService } from '../../services/cableSpanManip.service';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { Section } from '@shared/domain';

function createSignalMock<T>(initialValue: T) {
  let value = initialValue;
  const fn = vi.fn(() => value) as vi.Mock & { set: vi.Mock };
  fn.set = vi.fn((v: T) => {
    value = v;
  });
  return fn;
}

const mockSection: Partial<Section> = {
  uuid: 'section-uuid-1',
  supports: [
    { uuid: 'support-uuid-1', number: 'PA1', armLength: 2, spanLength: 100 } as Section['supports'][0],
    { uuid: 'support-uuid-2', number: 'PA2', armLength: 3, spanLength: null } as Section['supports'][0]
  ],
  cable_span_manipulations: [],
  selected_cable_span_manipulation_uuid: null
};

describe('CableSpanManipComponent', () => {
  let component: CableSpanManipComponent;
  let fixture: ComponentFixture<CableSpanManipComponent>;
  let mockPlotService: vi.Mocked<PlotService>;
  let mockPlotSpanService: vi.Mocked<PlotSpanService>;
  let mockCableSpanManipService: vi.Mocked<CableSpanManipService>;
  let mockChainsService: { getChains: vi.Mock };

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    mockPlotService = {
      study: createSignalMock(null),
      loading: signal(false),
      plotOptions: createSignalMock({ startSupport: 0, endSupport: 1 }),
      plotOptionsChange: vi.fn()
    } as unknown as vi.Mocked<PlotService>;

    mockPlotSpanService = {
      section: createSignalMock<Partial<Section> | null>(mockSection),
      getSupportIndex: vi.fn().mockReturnValue(0),
      getSupportOptions: vi.fn().mockReturnValue([
        { label: 'PA1', value: 'LEFT' },
        { label: 'PA2', value: 'RIGHT' }
      ]),
      getSpanOptions: signal([{ label: 'PA1 - PA2', value: 'support-uuid-1' }])
    } as unknown as vi.Mocked<PlotSpanService>;

    mockCableSpanManipService = {
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clearPersistedFormData: vi.fn(),
      reloadSection: vi.fn().mockResolvedValue(undefined)
    } as unknown as vi.Mocked<CableSpanManipService>;

    mockChainsService = {
      getChains: vi.fn().mockResolvedValue([])
    };

    await TestBed.configureTestingModule({
      imports: [CableSpanManipComponent],
      providers: [
        provideNoopAnimations(),
        { provide: PlotService, useValue: mockPlotService },
        { provide: PlotSpanService, useValue: mockPlotSpanService },
        { provide: CableSpanManipService, useValue: mockCableSpanManipService },
        { provide: ChainsService, useValue: mockChainsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CableSpanManipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('isCalculating computed', () => {
    it('should reflect plotService.loading() as false by default', () => {
      expect(component.isCalculating()).toBe(false);
    });

    it('should be true when plotService.loading() is true', () => {
      mockPlotService.loading.set(true);
      expect(component.isCalculating()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // HTML rendering — form structure
  // ---------------------------------------------------------------------------
  describe('HTML rendering - form structure', () => {
    it('should render the form', () => {
      const form = getByTestId('cable-span-manip-form');
      expect(form).toBeTruthy();
      expect(form?.tagName).toBe('FORM');
    });

    it('should render the zoom button', () => {
      const btn = getByTestId('cable-span-manip-zoom');
      expect(btn).toBeTruthy();
      expect(btn?.tagName).toBe('BUTTON');
    });

    it('should render the reset button', () => {
      const btn = getByTestId('cable-span-manip-reset');
      expect(btn).toBeTruthy();
      expect(btn?.tagName).toBe('BUTTON');
    });

    it('should render the span select', () => {
      const select = getByTestId('cable-span-manip-scope');
      expect(select).toBeTruthy();
    });

    it('should render the reference support select', () => {
      const select = getByTestId('cable-span-manip-reference-support');
      expect(select).toBeTruthy();
    });

    it('should render the distance to ref support input', () => {
      const input = getByTestId('cable-span-manip-dist-ref-support') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input?.tagName).toBe('INPUT');
    });

    it('should render the cable manip type select', () => {
      const select = getByTestId('cable-span-manip-type');
      expect(select).toBeTruthy();
    });

    it('should render the cable manip method select', () => {
      const select = getByTestId('cable-span-manip-method');
      expect(select).toBeTruthy();
    });

    it('should render the lateral distance input', () => {
      const input = getByTestId('cable-span-manip-lateral-dist') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input?.tagName).toBe('INPUT');
    });

    it('should render the altitude input', () => {
      const input = getByTestId('cable-span-manip-altitude') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input?.tagName).toBe('INPUT');
    });

    it('should render the distance calculation button as disabled', () => {
      const btn = getByTestId('cable-span-manip-dist-calc-btn') as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(btn.disabled).toBe(true);
    });

    it('should render the distance result read-only field', () => {
      const dd = getByTestId('cable-span-manip-dist-result');
      expect(dd).toBeTruthy();
      expect(dd?.textContent?.trim()).toBe('- m');
    });

    it('should render the anchoring select', () => {
      const select = getByTestId('cable-span-manip-anchoring');
      expect(select).toBeTruthy();
    });

    it('should render the save button', () => {
      const btn = getByTestId('cable-span-manip-save');
      expect(btn).toBeTruthy();
      expect(btn?.tagName).toBe('BUTTON');
    });

    it('should render the delete button', () => {
      const btn = getByTestId('cable-span-manip-delete');
      expect(btn).toBeTruthy();
      expect(btn?.tagName).toBe('BUTTON');
    });

    it('should render the calculate button', () => {
      const btn = getByTestId('cable-span-manip-calculate');
      expect(btn).toBeTruthy();
      expect(btn?.tagName).toBe('BUTTON');
    });
  });

  // ---------------------------------------------------------------------------
  // HTML rendering — conditional sections
  // ---------------------------------------------------------------------------
  describe('HTML rendering - conditional anchoring sections', () => {
    it('should render sling length when anchoring is with_sling', () => {
      expect(getByTestId('cable-span-manip-sling-length')).toBeTruthy();
    });

    it('should not render chain fields when anchoring is with_sling', () => {
      expect(getByTestId('cable-span-manip-chain-name')).toBeNull();
      expect(getByTestId('cable-span-manip-chain-length')).toBeNull();
    });
  });

  describe('HTML rendering - isWithCrane conditional', () => {
    it('should render the longitudinal distance input when cableManipType is with_a_crane', () => {
      expect(getByTestId('cable-span-manip-longitudinal-dist')).toBeTruthy();
      expect(getByTestId('cable-span-manip-longitudinal-dist-readonly')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // HTML rendering — button states
  // ---------------------------------------------------------------------------
  describe('HTML rendering - button states', () => {
    it('should disable save button when form is invalid', () => {
      const btn = getByTestId('cable-span-manip-save') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should disable calculate button when form is invalid', () => {
      component.form.controls.scope.setValue(null);
      component.form.controls.referenceSupport.setValue(null);
      fixture.detectChanges();
      const btn = getByTestId('cable-span-manip-calculate') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should disable save button when form is valid but not dirty', () => {
      component.form.patchValue({
        scope: 'support-uuid-1',
        distanceToRefSupport: 0,
        lateralDistance: 0,
        altitude: 0,
        slingLength: 5
      });
      component.form.controls.referenceSupport.enable();
      component.form.controls.referenceSupport.setValue('LEFT');
      component.isDirtySinceLastSave.set(false);
      fixture.detectChanges();
      const btn = getByTestId('cable-span-manip-save') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should enable save button when form is valid and dirty', () => {
      component.form.patchValue({
        scope: 'support-uuid-1',
        distanceToRefSupport: 0,
        lateralDistance: 0,
        altitude: 0,
        slingLength: 5
      });
      component.form.controls.referenceSupport.enable();
      component.form.controls.referenceSupport.setValue('LEFT');
      component.isDirtySinceLastSave.set(true);
      fixture.detectChanges();
      const btn = getByTestId('cable-span-manip-save') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it('should disable delete button when no manipulation is saved for the span', () => {
      const btn = getByTestId('cable-span-manip-delete') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('should enable delete button when a manipulation is saved', () => {
      component.hasSavedManipulation.set(true);
      fixture.detectChanges();
      const btn = getByTestId('cable-span-manip-delete') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it('should disable buttons when isLoading is true', () => {
      component.form.patchValue({
        scope: 'support-uuid-1',
        distanceToRefSupport: 0,
        lateralDistance: 0,
        altitude: 0,
        slingLength: 5
      });
      component.form.controls.referenceSupport.enable();
      component.form.controls.referenceSupport.setValue('LEFT');
      component.isDirtySinceLastSave.set(true);
      component.isLoading.set(true);
      fixture.detectChanges();

      const save = getByTestId('cable-span-manip-save') as HTMLButtonElement;
      const calculate = getByTestId('cable-span-manip-calculate') as HTMLButtonElement;
      const reset = getByTestId('cable-span-manip-reset') as HTMLButtonElement;
      const zoom = getByTestId('cable-span-manip-zoom') as HTMLButtonElement;

      expect(save.disabled).toBe(true);
      expect(calculate.disabled).toBe(true);
      expect(reset.disabled).toBe(true);
      expect(zoom.disabled).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // HTML rendering — accessibility
  // ---------------------------------------------------------------------------
  describe('HTML rendering - accessibility', () => {
    it('should not set aria-busy when not loading', () => {
      const form = getByTestId('cable-span-manip-form');
      expect(form?.getAttribute('aria-busy')).toBe('false');
    });

    it('should set aria-busy when loading', () => {
      component.isLoading.set(true);
      fixture.detectChanges();
      const form = getByTestId('cable-span-manip-form');
      expect(form?.getAttribute('aria-busy')).toBe('true');
    });
  });
  // ---------------------------------------------------------------------------
  // onScopeChange()
  // ---------------------------------------------------------------------------
  describe('onScopeChange()', () => {
    it('should disable referenceSupport and clear options when uuid is null', () => {
      component.form.controls.referenceSupport.enable();
      component.onScopeChange(null);
      expect(component.form.controls.referenceSupport.disabled).toBe(true);
      expect(component.supportRefOptions()).toHaveLength(0);
    });

    it('should enable referenceSupport and set options when valid uuid is given', () => {
      component.onScopeChange('support-uuid-1');
      expect(component.form.controls.referenceSupport.enabled).toBe(true);
      expect(component.supportRefOptions().length).toBeGreaterThan(0);
    });

    it('should update distRefSupportMin and distRefSupportMax from support data', () => {
      // distRefSupportMin/Max are computed from the scope form control value and section signal,
      // so both must be updated (as the real p-select does via formControlName + onChange).
      component.form.controls.scope.setValue('support-uuid-1');
      component.onScopeChange('support-uuid-1');
      // armLength = 2, spanLength = 100 → min = -2, max = 102
      expect(component.distRefSupportMin()).toBe(-2);
      expect(component.distRefSupportMax()).toBe(102);
    });

    it('should not call plotOptionsChange when scope changes (zoom is explicit)', () => {
      vi.clearAllMocks();
      component.onScopeChange('support-uuid-1');
      expect(mockPlotService.plotOptionsChange).not.toHaveBeenCalled();
    });

    it('should set isDirtySinceLastSave to true for a new manipulation (no saved data)', () => {
      component.isDirtySinceLastSave.set(false);
      component.onScopeChange('support-uuid-1');
      expect(component.isDirtySinceLastSave()).toBe(true);
    });

    it('should set isDirtySinceLastSave to false when loading an existing manipulation', () => {
      mockPlotSpanService.section.set({
        ...mockSection,
        cable_span_manipulations: [
          {
            uuid: 'manip-uuid-1',
            spanUuid: 'support-uuid-1',
            referenceSupport: 'LEFT',
            distanceToRefSupport: 0,
            cableManipType: 'with_a_crane',
            cableManipMethod: 'clamp',
            longitudinalDistance: 5,
            lateralDistance: 0,
            altitude: 0,
            anchoring: 'with_sling',
            chainName: null,
            chainLength: null,
            chainWeight: null,
            chainSurface: null,
            counterWeight: null,
            slingLength: 5
          }
        ]
      } as unknown as Section);
      component.isDirtySinceLastSave.set(true);
      component.onScopeChange('support-uuid-1');
      expect(component.isDirtySinceLastSave()).toBe(false);
    });

    it('should load saved manipulation values when one exists for the span', () => {
      mockPlotSpanService.section.set({
        ...mockSection,
        cable_span_manipulations: [
          {
            uuid: 'manip-uuid-1',
            spanUuid: 'support-uuid-1',
            referenceSupport: 'RIGHT',
            distanceToRefSupport: 10,
            cableManipType: 'with_a_crane',
            cableManipMethod: 'clamp',
            longitudinalDistance: 5,
            lateralDistance: 2,
            altitude: 100,
            anchoring: 'with_sling',
            chainName: null,
            chainLength: null,
            chainWeight: null,
            chainSurface: null,
            counterWeight: null,
            slingLength: 3
          }
        ]
      } as unknown as Section);

      component.onScopeChange('support-uuid-1');

      expect(component.form.controls.referenceSupport.value).toBe('RIGHT');
      expect(component.form.controls.distanceToRefSupport.value).toBe(10);
      expect(component.form.controls.slingLength.value).toBe(3);
      expect(component.hasSavedManipulation()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // resetForm()
  // ---------------------------------------------------------------------------
  describe('resetForm()', () => {
    it('should reset content fields to defaults', () => {
      component.form.controls.lateralDistance.setValue(50);
      component.form.controls.altitude.setValue(200);
      component.form.controls.slingLength.setValue(10);
      component.resetForm();
      expect(component.form.controls.lateralDistance.value).toBe(0);
      expect(component.form.controls.altitude.value).toBe(0);
      expect(component.form.controls.slingLength.value).toBe(5);
    });

    it('should reset isDirtySinceLastSave to false', () => {
      component.isDirtySinceLastSave.set(true);
      component.resetForm();
      expect(component.isDirtySinceLastSave()).toBe(false);
    });

    it('should preserve the current scope', () => {
      component.form.controls.scope.setValue('support-uuid-1', { emitEvent: false });
      component.resetForm();
      expect(component.form.controls.scope.value).toBe('support-uuid-1');
    });
  });

  // ---------------------------------------------------------------------------
  // zoomToSpan()
  // ---------------------------------------------------------------------------
  describe('zoomToSpan()', () => {
    it('should not call plotOptionsChange when no scope is selected', () => {
      component.form.controls.scope.setValue(null);
      vi.clearAllMocks();
      component.zoomToSpan();
      expect(mockPlotService.plotOptionsChange).not.toHaveBeenCalled();
    });

    it('should call plotOptionsChange with span index when scope is selected', () => {
      component.form.controls.scope.setValue('support-uuid-1');
      component.zoomToSpan();
      expect(mockPlotService.plotOptionsChange).toHaveBeenCalledWith({ startSupport: 0, endSupport: 1 });
    });
  });

  // ---------------------------------------------------------------------------
  // saveForm()
  // ---------------------------------------------------------------------------
  describe('saveForm()', () => {
    beforeEach(() => {
      component.form.patchValue({
        scope: 'support-uuid-1',
        distanceToRefSupport: 5,
        lateralDistance: 0,
        altitude: 0,
        slingLength: 5
      });
      component.form.controls.referenceSupport.enable();
      component.form.controls.referenceSupport.setValue('LEFT');
      component.form.controls.distanceToRefSupport.setValidators([]);
      component.form.controls.distanceToRefSupport.updateValueAndValidity({ emitEvent: false });
    });

    it('should not call save service if form is invalid', async () => {
      component.form.controls.scope.setValue(null);
      await component.saveForm();
      expect(mockCableSpanManipService.save).not.toHaveBeenCalled();
    });

    it('should call cableSpanManipService.save with form values', async () => {
      await component.saveForm();
      expect(mockCableSpanManipService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          spanUuid: 'support-uuid-1',
          referenceSupport: 'LEFT',
          distanceToRefSupport: 5,
          lateralDistance: 0,
          altitude: 0,
          slingLength: 5
        })
      );
    });

    it('should reset isDirtySinceLastSave after save', async () => {
      component.isDirtySinceLastSave.set(true);
      await component.saveForm();
      expect(component.isDirtySinceLastSave()).toBe(false);
    });

    it('should set hasSavedManipulation to true after save', async () => {
      await component.saveForm();
      expect(component.hasSavedManipulation()).toBe(true);
    });

    it('should not set hasSavedManipulation to true when save rejects', async () => {
      mockCableSpanManipService.save.mockRejectedValue(new Error('save failed'));
      component.hasSavedManipulation.set(false);
      await component.saveForm().catch((_err: unknown) => undefined);
      expect(component.hasSavedManipulation()).toBe(false);
    });

    it('should always clear isLoading even when save rejects', async () => {
      mockCableSpanManipService.save.mockRejectedValue(new Error('save failed'));
      await component.saveForm().catch((_err: unknown) => undefined);
      expect(component.isLoading()).toBe(false);
    });

    it('should not reset isDirtySinceLastSave when save rejects', async () => {
      mockCableSpanManipService.save.mockRejectedValue(new Error('save failed'));
      component.isDirtySinceLastSave.set(true);
      await component.saveForm().catch((_err: unknown) => undefined);
      expect(component.isDirtySinceLastSave()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteForm()
  // ---------------------------------------------------------------------------
  describe('deleteForm()', () => {
    it('should call delete service when a manipulation exists for the selected span', () => {
      component.form.controls.scope.setValue('support-uuid-1');
      mockPlotSpanService.section.set({
        ...mockSection,
        cable_span_manipulations: [
          {
            uuid: 'manip-uuid-1',
            spanUuid: 'support-uuid-1',
            referenceSupport: 'LEFT',
            distanceToRefSupport: 0,
            cableManipType: 'with_a_crane',
            cableManipMethod: 'clamp',
            longitudinalDistance: null,
            lateralDistance: 0,
            altitude: 0,
            anchoring: 'with_sling',
            chainName: null,
            chainLength: null,
            chainWeight: null,
            chainSurface: null,
            counterWeight: null,
            slingLength: 5
          }
        ]
      } as unknown as Section);

      component.deleteForm();

      expect(mockCableSpanManipService.delete).toHaveBeenCalledWith('manip-uuid-1');
    });

    it('should not call delete when no manipulation exists for the selected span', () => {
      component.form.controls.scope.setValue('support-uuid-1');
      mockPlotSpanService.section.set({ ...mockSection, cable_span_manipulations: [] } as unknown as Section);

      component.deleteForm();

      expect(mockCableSpanManipService.delete).not.toHaveBeenCalled();
    });

    it('should set hasSavedManipulation to false after deletion', () => {
      component.hasSavedManipulation.set(true);
      component.deleteForm();
      expect(component.hasSavedManipulation()).toBe(false);
    });

    it('should reset form fields to defaults after deletion', () => {
      component.form.controls.lateralDistance.setValue(50);
      component.form.controls.slingLength.setValue(10);
      component.deleteForm();
      expect(component.form.controls.lateralDistance.value).toBe(0);
      expect(component.form.controls.slingLength.value).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // isFormInvalid()
  // ---------------------------------------------------------------------------
  describe('isFormInvalid()', () => {
    it('should return true when scope is null', () => {
      component.form.controls.scope.setValue(null);
      expect(component.isFormInvalid()).toBe(true);
    });

    it('should return false when all required fields are valid', () => {
      component.form.patchValue({
        scope: 'support-uuid-1',
        distanceToRefSupport: 0,
        lateralDistance: 0,
        altitude: 0,
        slingLength: 5
      });
      component.form.controls.referenceSupport.enable();
      component.form.controls.referenceSupport.setValue('LEFT');
      component.form.controls.distanceToRefSupport.setValidators([]);
      component.form.controls.distanceToRefSupport.updateValueAndValidity({ emitEvent: false });
      expect(component.isFormInvalid()).toBe(false);
    });
  });
});
