import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ClimateComponent } from './climate.component';
import { getBaseClimate, DEFAULT_BASE_TEMPERATURE } from '@shared/domain/helpers/climate.helpers';
import { ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { MessageService } from 'primeng/api';
import { ChargesService } from '@services/charges/charges.service';
import { LoadFormsService } from '../../services/loadForms.service';
import { signal } from '@angular/core';
import { Charge, SymmetryType } from '@shared/domain';

import { TranslocoTestingModule } from '@jsverse/transloco';
describe('getBaseClimate', () => {
  it('should return base climate with temperature from selected initial condition', () => {
    const section = {
      initial_conditions: [
        { uuid: 'ic-1', base_temperature: 25 },
        { uuid: 'ic-2', base_temperature: 30 }
      ],
      selected_initial_condition_uuid: 'ic-1'
    };

    const result = getBaseClimate(section);

    expect(result.cableTemperature).toBe(25);
    expect(result.windPressure).toBe(0);
    expect(result.iceThickness).toBe(0);
    expect(result.symmetryType).toBe(SymmetryType.SYMMETRIC);
  });

  it('should return default temperature when no initial condition is selected', () => {
    const section = {
      initial_conditions: [{ uuid: 'ic-1', base_temperature: 25 }],
      selected_initial_condition_uuid: undefined
    };

    const result = getBaseClimate(section);

    expect(result.cableTemperature).toBe(DEFAULT_BASE_TEMPERATURE);
  });

  it('should return default temperature when initial_conditions is empty', () => {
    const section = {
      initial_conditions: [],
      selected_initial_condition_uuid: 'ic-1'
    };

    const result = getBaseClimate(section);

    expect(result.cableTemperature).toBe(DEFAULT_BASE_TEMPERATURE);
  });

  it('should return default temperature when section is null', () => {
    const result = getBaseClimate(null);

    expect(result.cableTemperature).toBe(DEFAULT_BASE_TEMPERATURE);
  });

  it('should return base climate values that match Python base_engine state', () => {
    // This test verifies that the base climate values match what the Python
    // base_engine uses: no wind, no ice, and the base_temperature from initial condition
    const section = {
      initial_conditions: [{ uuid: 'ic-1', base_temperature: 20 }],
      selected_initial_condition_uuid: 'ic-1'
    };

    const result = getBaseClimate(section);

    // These values should produce the same result as base_engine.solve_change_state()
    // which is called without parameters (defaults to no wind, no ice, base temperature)
    expect(result.windPressure).toBe(0);
    expect(result.iceThickness).toBe(0);
    expect(result.cableTemperature).toBe(20);
    expect(result.frontierSupportNumber).toBeNull();
    expect(result.iceThicknessBefore).toBe(0);
    expect(result.iceThicknessAfter).toBe(0);
  });
});

const mockCharge: Charge = {
  uuid: 'test-charge-uuid',
  name: 'Test Charge',
  personnelPresence: false,
  description: 'Test description',
  data: {
    climate: {
      windPressure: 0,
      cableTemperature: 15,
      symmetryType: SymmetryType.SYMMETRIC,
      iceThickness: 0,
      frontierSupportNumber: null,
      iceThicknessBefore: null,
      iceThicknessAfter: null
    },
    spanLoads: []
  }
};

describe('ClimateComponent effect edge cases', () => {
  it('should return early when studyUuid is missing', async () => {
    const plotServiceMock = {
      study: signal(null),
      workerReady: signal(false),
      litData: signal(null)
    } as unknown as PlotService;
    const spanServiceMock = {
      section: signal({ uuid: 'section-uuid-1', supports: [] })
    };
    const chargesServiceMock = {
      getCharge: vi.fn().mockResolvedValue(mockCharge),
      createOrUpdateCharge: vi.fn(),
      deleteCharge: vi.fn()
    } as unknown as ChargesService;

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'loads.climate.cable-temperature-label': 'Cable Temperature',
              'loads.climate.dis-symmetric-option': 'Dis Symmetric',
              'loads.climate.frontier-support-label': 'Frontier support',
              'loads.climate.ice-indicator-label': 'Ice indicator',
              'loads.climate.ice-thickness-after-label': 'Ice thickness after support frontier',
              'loads.climate.ice-thickness-before-label': 'Ice thickness before support frontier',
              'loads.climate.ice-thickness-label': 'Ice thickness',
              'loads.climate.symmetric-option': 'Symmetric',
              'loads.climate.whole-number-required': 'Whole number required',
              'loads.climate.wind-pressure-label': 'Wind Pressure',
              'common.calculate': 'Calculate',
              'loads.shared.erase-load-case-aria-label': 'erase load case',
              'common.max-value': 'Maximum value:',
              'common.min-value': 'Minimum value:',
              'common.reset': 'Reset',
              'common.save': 'Save'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        ReactiveFormsModule,
        SelectModule,
        InputText,
        ButtonComponent,
        IconComponent,
        ClimateComponent
      ],
      providers: [
        { provide: PlotService, useValue: plotServiceMock },
        { provide: PlotSpanService, useValue: spanServiceMock },
        { provide: WorkerPythonService, useValue: {} },
        { provide: MessageService, useValue: { add: vi.fn() } },
        { provide: ChargesService, useValue: chargesServiceMock }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ClimateComponent);
    fixture.componentRef.setInput('chargeUuid', 'test-charge-uuid');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(chargesServiceMock.getCharge).not.toHaveBeenCalled();
    TestBed.resetTestingModule();
  });

  it('should return early when charge has no data', async () => {
    const chargeWithoutData = { uuid: 'test', data: null } as unknown as Charge;
    const plotServiceMock = {
      study: signal({ uuid: 'study-uuid-1' }),
      workerReady: signal(false),
      litData: signal(null)
    } as unknown as PlotService;
    const spanServiceMock = {
      section: signal({ uuid: 'section-uuid-1', supports: [] })
    };
    const chargesServiceMock = {
      getCharge: vi.fn().mockResolvedValue(chargeWithoutData),
      createOrUpdateCharge: vi.fn(),
      deleteCharge: vi.fn()
    } as unknown as ChargesService;

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'loads.climate.cable-temperature-label': 'Cable Temperature',
              'loads.climate.dis-symmetric-option': 'Dis Symmetric',
              'loads.climate.frontier-support-label': 'Frontier support',
              'loads.climate.ice-indicator-label': 'Ice indicator',
              'loads.climate.ice-thickness-after-label': 'Ice thickness after support frontier',
              'loads.climate.ice-thickness-before-label': 'Ice thickness before support frontier',
              'loads.climate.ice-thickness-label': 'Ice thickness',
              'loads.climate.symmetric-option': 'Symmetric',
              'loads.climate.whole-number-required': 'Whole number required',
              'loads.climate.wind-pressure-label': 'Wind Pressure',
              'common.calculate': 'Calculate',
              'loads.shared.erase-load-case-aria-label': 'erase load case',
              'common.max-value': 'Maximum value:',
              'common.min-value': 'Minimum value:',
              'common.reset': 'Reset',
              'common.save': 'Save'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        ReactiveFormsModule,
        SelectModule,
        InputText,
        ButtonComponent,
        IconComponent,
        ClimateComponent
      ],
      providers: [
        { provide: PlotService, useValue: plotServiceMock },
        { provide: PlotSpanService, useValue: spanServiceMock },
        { provide: WorkerPythonService, useValue: {} },
        { provide: MessageService, useValue: { add: vi.fn() } },
        { provide: ChargesService, useValue: chargesServiceMock }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ClimateComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('chargeUuid', 'test-charge-uuid');
    fixture.detectChanges();
    await fixture.whenStable();

    // Form should still have default values since charge data was null
    expect(component.form.value.windPressure).toBe(0);
    expect(component.form.value.cableTemperature).toBe(15);
    TestBed.resetTestingModule();
  });
});

describe('ClimateComponent', () => {
  let component: ClimateComponent;
  let fixture: ComponentFixture<ClimateComponent>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const mockCharge: Charge = {
    uuid: 'test-charge-uuid',
    name: 'Test Charge',
    personnelPresence: false,
    description: 'Test description',
    data: {
      climate: {
        windPressure: 0,
        cableTemperature: 15,
        symmetryType: SymmetryType.SYMMETRIC,
        iceThickness: 0,
        frontierSupportNumber: null,
        iceThicknessBefore: null,
        iceThicknessAfter: null
      },
      spanLoads: []
    }
  };

  beforeEach(async () => {
    const plotServiceMock = {
      study: signal({ uuid: 'study-uuid-1' }),
      loading: signal(false),
      temporaryLoadData: {
        climate: {
          windPressure: 0,
          cableTemperature: 15,
          symmetryType: SymmetryType.SYMMETRIC,
          iceThickness: 0,
          frontierSupportNumber: null,
          iceThicknessBefore: null,
          iceThicknessAfter: null
        },
        spanLoads: []
      }
    } as unknown as PlotService;
    const spanServiceMock = {
      section: signal({ uuid: 'section-uuid-1' })
    };
    const plotOptionsServiceMock = {
      refreshCamera: vi.fn()
    };
    const messageServiceMock = {
      add: vi.fn()
    } as unknown as MessageService;
    const workerPythonServiceMock = {} as unknown as WorkerPythonService;
    const chargesServiceMock = {
      getCharge: vi.fn().mockResolvedValue(mockCharge),
      createOrUpdateCharge: vi.fn().mockResolvedValue(undefined),
      deleteCharge: vi.fn().mockResolvedValue(undefined),
      getSelectedChargeCase: vi.fn().mockResolvedValue(mockCharge)
    } as unknown as ChargesService;

    const loadFormsServiceMock = {
      calculateLoad: vi.fn().mockResolvedValue(undefined),
      saveTemporaryLoadDataInSection: vi.fn().mockResolvedValue(undefined),
      initTemporaryLoadData: vi.fn(),
      deleteLoad: vi.fn()
    } as unknown as LoadFormsService;

    await TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'loads.climate.cable-temperature-label': 'Cable Temperature',
              'loads.climate.dis-symmetric-option': 'Dis Symmetric',
              'loads.climate.frontier-support-label': 'Frontier support',
              'loads.climate.ice-indicator-label': 'Ice indicator',
              'loads.climate.ice-thickness-after-label': 'Ice thickness after support frontier',
              'loads.climate.ice-thickness-before-label': 'Ice thickness before support frontier',
              'loads.climate.ice-thickness-label': 'Ice thickness',
              'loads.climate.symmetric-option': 'Symmetric',
              'loads.climate.whole-number-required': 'Whole number required',
              'loads.climate.wind-pressure-label': 'Wind Pressure',
              'common.calculate': 'Calculate',
              'loads.shared.erase-load-case-aria-label': 'erase load case',
              'common.max-value': 'Maximum value:',
              'common.min-value': 'Minimum value:',
              'common.reset': 'Reset',
              'common.save': 'Save'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true
        }),
        ReactiveFormsModule,
        SelectModule,
        InputText,
        ButtonComponent,
        IconComponent,
        ClimateComponent
      ],
      providers: [
        { provide: PlotService, useValue: plotServiceMock },
        { provide: PlotSpanService, useValue: spanServiceMock },
        { provide: PlotOptionsService, useValue: plotOptionsServiceMock },
        { provide: WorkerPythonService, useValue: workerPythonServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: ChargesService, useValue: chargesServiceMock },
        { provide: LoadFormsService, useValue: loadFormsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClimateComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('chargeUuid', 'test-charge-uuid');
    fixture.detectChanges();
  });

  it('should initialize form with default values', () => {
    expect(component.form.value).toEqual({
      windPressure: 0,
      cableTemperature: 15,
      symmetryType: SymmetryType.SYMMETRIC,
      iceThickness: 0,
      frontierSupportNumber: null,
      iceThicknessBefore: null,
      iceThicknessAfter: null
    });
  });

  it('should reset form to default values', () => {
    component.frontierSupportOptions.set([{ label: '2', value: 2 }]);
    component.form.patchValue({
      windPressure: 50,
      cableTemperature: 25,
      symmetryType: SymmetryType.DIS_SYMMETRIC,
      iceThickness: 10,
      frontierSupportNumber: null,
      iceThicknessBefore: null,
      iceThicknessAfter: null
    });

    component.resetForm();

    expect(component.form.value).toEqual({
      windPressure: 0,
      cableTemperature: 15,
      symmetryType: SymmetryType.SYMMETRIC,
      iceThickness: 0,
      frontierSupportNumber: 2,
      iceThicknessBefore: 0,
      iceThicknessAfter: 0
    });
  });

  it('should reset frontierSupportNumber to null when no support options are available', () => {
    component.resetForm();

    expect(component.form.value.frontierSupportNumber).toBeNull();
  });

  describe('button actions', () => {
    it('should call submitForm when submit button is clicked', () => {
      const spy = vi.spyOn(component, 'saveForm');
      const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');
      submitButton.click();
      expect(spy).toHaveBeenCalled();
    });

    it('should call calculForm when calculate button is clicked', () => {
      const spy = vi.spyOn(component, 'calculateForm');
      const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLElement[];
      const calcButton = buttons.find((b) => b.textContent?.includes('Calculate'));
      calcButton?.click();
      expect(spy).toHaveBeenCalled();
    });

    it('should call resetForm when erase button is clicked', () => {
      const spy = vi.spyOn(component, 'resetForm');
      const resetButton = fixture.nativeElement.querySelector('.climate__reset');
      resetButton.click();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('deleteCharge', () => {
    it('should call loadFormsService.deleteLoad then chargesService.deleteCharge', async () => {
      const loadFormsService = TestBed.inject(LoadFormsService);
      const chargesService = TestBed.inject(ChargesService);
      await component.deleteCharge();
      expect(loadFormsService.deleteLoad).toHaveBeenCalled();
      expect(chargesService.deleteCharge).toHaveBeenCalledWith('study-uuid-1', 'section-uuid-1', 'test-charge-uuid');
    });

    it('should throw error when study is not found', async () => {
      const plotService = TestBed.inject(PlotService);
      (plotService.study as ReturnType<typeof signal>).set(null);
      await expect(component.deleteCharge()).rejects.toThrow('Study or section not found');
    });

    it('should throw error when section is not found', async () => {
      const spanService = TestBed.inject(PlotSpanService);
      (spanService.section as ReturnType<typeof signal>).set(null);
      await expect(component.deleteCharge()).rejects.toThrow('Study or section not found');
    });
  });

  describe('getErrorIds', () => {
    it('should return null when control has no errors', () => {
      const result = component.getErrorIds('windPressure', ['required', 'min']);
      expect(result).toBeNull();
    });

    it('should return error ids when control has matching errors', () => {
      component.form.controls.windPressure.setValue(null);
      component.form.controls.windPressure.markAsTouched();
      component.form.controls.windPressure.updateValueAndValidity();

      const result = component.getErrorIds('windPressure', ['required', 'min', 'max']);
      expect(result).toBe('windPressure-error-required');
    });

    it('should return multiple error ids joined by space', () => {
      component.form.controls.windPressure.setErrors({
        required: true,
        min: true
      });

      const result = component.getErrorIds('windPressure', ['required', 'min']);
      expect(result).toBe('windPressure-error-required windPressure-error-min');
    });

    it('should return null when no matching error types', () => {
      component.form.controls.windPressure.setErrors({ custom: true });

      const result = component.getErrorIds('windPressure', ['required', 'min']);
      expect(result).toBeNull();
    });
  });

  describe('noDecimalValidator', () => {
    it('should return null for null values', () => {
      component.form.controls.windPressure.setValue(null);
      // The validator allows null (line 25 coverage)
      const errors = component.form.controls.windPressure.errors;
      // required error will be present, but not noDecimal error
      expect(errors?.['noDecimal']).toBeUndefined();
    });

    it('should return noDecimal error for non-integer values', () => {
      component.form.controls.windPressure.setValue(10.5);
      component.form.controls.windPressure.updateValueAndValidity();

      const errors = component.form.controls.windPressure.errors;
      expect(errors?.['noDecimal']).toBe(true);
    });

    it('should return null for valid integer values', () => {
      component.form.controls.windPressure.setValue(10);
      component.form.controls.windPressure.updateValueAndValidity();

      const errors = component.form.controls.windPressure.errors;
      expect(errors?.['noDecimal']).toBeUndefined();
    });
  });

  describe('isFormValid', () => {
    it('should return true when form is valid', () => {
      component.form.patchValue({
        windPressure: 100,
        cableTemperature: 20,
        symmetryType: SymmetryType.SYMMETRIC,
        iceThickness: 5
      });

      expect(component.isFormValid()).toBe(true);
    });

    it('should return false when form is invalid', () => {
      component.form.controls.windPressure.setValue(null);

      expect(component.isFormValid()).toBe(false);
    });
  });

  describe('resetForm with initial condition', () => {
    it('should reset form to base climate values from initial condition', () => {
      const spanService = TestBed.inject(PlotSpanService);
      (spanService.section as ReturnType<typeof signal>).set({
        uuid: 'section-uuid-1',
        initial_conditions: [{ uuid: 'ic-1', base_temperature: 25 }],
        selected_initial_condition_uuid: 'ic-1'
      });

      // Set some non-default values
      component.form.patchValue({
        windPressure: 500,
        cableTemperature: 40,
        iceThickness: 10
      });

      component.resetForm();

      // Should use base_temperature from initial condition
      expect(component.form.value.cableTemperature).toBe(25);
      expect(component.form.value.windPressure).toBe(0);
      expect(component.form.value.iceThickness).toBe(0);
    });

    it('should reset to default temperature 15 when no initial condition', () => {
      const spanService = TestBed.inject(PlotSpanService);
      (spanService.section as ReturnType<typeof signal>).set({
        uuid: 'section-uuid-1',
        initial_conditions: [],
        selected_initial_condition_uuid: undefined
      });

      component.form.patchValue({
        cableTemperature: 40
      });

      component.resetForm();

      expect(component.form.value.cableTemperature).toBe(15);
    });

    it('should update temporaryLoadData with base climate values', () => {
      const plotService = TestBed.inject(PlotService);
      const spanService = TestBed.inject(PlotSpanService);
      (spanService.section as ReturnType<typeof signal>).set({
        uuid: 'section-uuid-1',
        initial_conditions: [{ uuid: 'ic-1', base_temperature: 20 }],
        selected_initial_condition_uuid: 'ic-1'
      });

      component.resetForm();

      expect(plotService.temporaryLoadData?.climate.cableTemperature).toBe(20);
      expect(plotService.temporaryLoadData?.climate.windPressure).toBe(0);
      expect(plotService.temporaryLoadData?.climate.iceThickness).toBe(0);
    });
  });

  describe('saveForm', () => {
    it('should call saveTemporaryLoadDataInSection when study and section exist', async () => {
      const loadFormsService = TestBed.inject(LoadFormsService);
      vi.spyOn(loadFormsService, 'saveTemporaryLoadDataInSection').mockResolvedValue(undefined);

      await component.saveForm();

      expect(loadFormsService.saveTemporaryLoadDataInSection).toHaveBeenCalled();
    });

    it('should return early when study is missing', async () => {
      const plotService = TestBed.inject(PlotService);
      (plotService.study as ReturnType<typeof signal<{ uuid: string } | null>>).set(null);
      const loadFormsService = TestBed.inject(LoadFormsService);
      const saveSpy = vi.spyOn(loadFormsService, 'saveTemporaryLoadDataInSection');

      await component.saveForm();

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('should return early when section is missing', async () => {
      const spanService = TestBed.inject(PlotSpanService);
      (spanService.section as ReturnType<typeof signal<{ uuid: string } | null>>).set(null);
      const loadFormsService = TestBed.inject(LoadFormsService);
      const saveSpy = vi.spyOn(loadFormsService, 'saveTemporaryLoadDataInSection');

      await component.saveForm();

      expect(saveSpy).not.toHaveBeenCalled();
    });
  });

  describe('isSaving signal', () => {
    it('should be false by default', () => {
      expect(component.isSaving()).toBe(false);
    });

    it('should be true during saveForm then false after', async () => {
      const loadFormsService = TestBed.inject(LoadFormsService);
      let resolveTask!: () => void;
      vi.spyOn(loadFormsService, 'saveTemporaryLoadDataInSection').mockImplementation(
        () =>
          new Promise<void>((res) => {
            resolveTask = res;
          })
      );

      const promise = component.saveForm();
      expect(component.isSaving()).toBe(true);
      resolveTask();
      await promise;
      expect(component.isSaving()).toBe(false);
    });
  });

  describe('isCalculatingLoad signal', () => {
    it('should be false by default', () => {
      expect(component.isCalculatingLoad()).toBe(false);
    });

    it('should be true during calculateForm then false after', async () => {
      const loadFormsService = TestBed.inject(LoadFormsService);
      let resolveTask!: () => void;
      vi.spyOn(loadFormsService, 'calculateLoad').mockImplementation(
        () =>
          new Promise<void>((res) => {
            resolveTask = res;
          })
      );

      const promise = component.calculateForm();
      expect(component.isCalculatingLoad()).toBe(true);
      resolveTask();
      await promise;
      expect(component.isCalculatingLoad()).toBe(false);
    });
  });

  describe('UC: climate form rendering', () => {
    it('UC-LC1: should render the climate form', () => {
      const form = getByTestId('climate-form');
      expect(form).toBeTruthy();
      expect(form!.tagName).toBe('FORM');
    });

    it('UC-LC2: should render wind pressure input', () => {
      const input = getByTestId('wind-pressure-input');
      expect(input).toBeTruthy();
    });

    it('UC-LC3: should render save and calculate buttons', () => {
      expect(getByTestId('save-btn')).toBeTruthy();
      expect(getByTestId('calculate-btn')).toBeTruthy();
    });

    it('UC-LC4: should render reset button', () => {
      const resetBtn = getByTestId('reset-btn');
      expect(resetBtn).toBeTruthy();
    });

    it('UC-LC5: should disable save and calculate buttons when form is invalid', () => {
      component.form.controls.windPressure.setValue(null);
      fixture.detectChanges();

      const saveBtn = getByTestId('save-btn') as HTMLButtonElement;
      const calcBtn = getByTestId('calculate-btn') as HTMLButtonElement;
      expect(saveBtn.disabled).toBe(true);
      expect(calcBtn.disabled).toBe(true);
    });
  });

  describe('initForm', () => {
    it('should build frontierSupportOptions when section has supports', async () => {
      const spanService = TestBed.inject(PlotSpanService);
      (spanService.section as ReturnType<typeof signal>).set({
        uuid: 'section-uuid-1',
        supports: [{ uuid: 's1' }, { uuid: 's2' }, { uuid: 's3' }]
      });

      await component.initForm();

      // shift removes first, pop removes last → 1 option remains from 3 supports
      expect(component.frontierSupportOptions().length).toBe(1);
      // frontierSupportNumber defaults to the first available option
      expect(component.form.value.frontierSupportNumber).toBe(component.frontierSupportOptions()[0].value);
    });

    it('should build no frontierSupportOptions when section has fewer than 3 supports', async () => {
      const spanService = TestBed.inject(PlotSpanService);
      (spanService.section as ReturnType<typeof signal>).set({
        uuid: 'section-uuid-1',
        supports: [{ uuid: 's1' }, { uuid: 's2' }]
      });

      await component.initForm();

      // shift removes first, pop removes last → 0 options remain from 2 supports
      expect(component.frontierSupportOptions().length).toBe(0);
    });
  });
});
