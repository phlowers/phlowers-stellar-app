import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SpanComponent } from './span.component';
import { PlotService } from '../../services/plot.service';
import { LoadFormsService } from '../loadForms.service';
import { ChargeData, LoadType, SpanLoad, SymmetryType } from '@core/domain/models/charge.model';

describe('SpanComponent', () => {
  let component: SpanComponent;
  let fixture: ComponentFixture<SpanComponent>;
  let mockPlotService: jest.Mocked<PlotService>;
  let mockLoadFormsService: jest.Mocked<LoadFormsService>;

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    mockPlotService = {
      getSpanOptions: jest.fn().mockReturnValue([{ label: '1 - 2', value: 'support-1' }]),
      getSupportIndex: jest.fn().mockReturnValue(0),
      getSupportOptions: jest.fn().mockReturnValue([
        { label: 1, value: 'LEFT' },
        { label: 2, value: 'RIGHT' }
      ]),
      plotOptionsChange: jest.fn(),
      temporaryLoadData: null
    } as unknown as jest.Mocked<PlotService>;

    mockLoadFormsService = {
      initTemporaryLoadData: jest.fn(),
      deleteLoad: jest.fn(),
      saveTemporaryLoadDataInSection: jest.fn().mockResolvedValue(undefined),
      calculateLoad: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<LoadFormsService>;

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

  it('updates supports options and plot options when span is selected', () => {
    component.form.controls.spanSelect.setValue('support-1');
    fixture.detectChanges();

    expect(mockPlotService.getSupportOptions).toHaveBeenCalledWith('support-1');
    expect(component.supportsOptions()).toEqual([
      { label: 1, value: 'LEFT' },
      { label: 2, value: 'RIGHT' }
    ]);
    expect(component.form.controls.referenceSupport.enabled).toBe(true);
    expect(mockPlotService.plotOptionsChange).toHaveBeenCalledWith({
      startSupport: 0,
      endSupport: 1
    });
  });

  it('clears supports options when span is cleared', () => {
    component.form.controls.spanSelect.setValue('support-1');
    fixture.detectChanges();

    component.form.controls.spanSelect.setValue(null);
    fixture.detectChanges();

    expect(component.supportsOptions()).toEqual([]);
    expect(component.form.controls.referenceSupport.disabled).toBe(true);
  });

  it('applies selected load values when existing load is found', () => {
    const temporaryLoadData: ChargeData = {
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
          referenceSupport: 'RIGHT',
          type: LoadType.MARKING,
          loadWeight: 12,
          loadPosition: 5
        }
      ]
    };
    mockPlotService.temporaryLoadData = temporaryLoadData;

    component.form.controls.spanSelect.setValue('support-1');
    fixture.detectChanges();

    expect(component.form.controls.referenceSupport.value).toBe('RIGHT');
    expect(component.form.controls.type.value).toBe(LoadType.MARKING);
    expect(component.form.controls.loadWeight.value).toBe(12);
    expect(component.form.controls.loadPosition.value).toBe(5);
  });

  it('defaults missing load values to 0', () => {
    mockPlotService.temporaryLoadData = {
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
          type: LoadType.MARKING
        } as unknown as SpanLoad
      ]
    };

    component.form.controls.spanSelect.setValue('support-1');
    fixture.detectChanges();

    expect(component.form.controls.loadWeight.value).toBe(0);
    expect(component.form.controls.loadPosition.value).toBe(0);
  });

  it('updates load data when control values change', () => {
    const temporaryLoadData: ChargeData = {
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
          loadPosition: 2
        }
      ]
    };
    mockPlotService.temporaryLoadData = temporaryLoadData;

    component.form.controls.spanSelect.setValue('support-1');
    fixture.detectChanges();

    component.form.controls.loadPosition.setValue(8);
    component.form.controls.type.setValue(LoadType.MARKING);
    fixture.detectChanges();

    expect(temporaryLoadData.spanLoads[0].loadPosition).toBe(8);
    expect(temporaryLoadData.spanLoads[0].type).toBe(LoadType.MARKING);
    expect(temporaryLoadData.spanLoads[0].loadWeight).toBe(0);
    expect(component.form.controls.loadWeight.value).toBe(0);
  });

  it('resets form and reloads temporary data', () => {
    component.form.controls.spanSelect.setValue('support-1');
    component.form.controls.referenceSupport.setValue('LEFT');

    component.resetForm();
    fixture.detectChanges();

    expect(component.form.controls.spanSelect.value).toBeNull();
    expect(component.form.controls.referenceSupport.disabled).toBe(true);
    expect(mockLoadFormsService.initTemporaryLoadData).toHaveBeenCalled();
  });

  it('deletes load case and resets form', () => {
    component.form.controls.spanSelect.setValue('support-1');

    component.deleteCharge();
    fixture.detectChanges();

    expect(mockLoadFormsService.deleteLoad).toHaveBeenCalled();
    expect(component.form.controls.spanSelect.value).toBeNull();
  });

  it('saves and calculates only when form is valid', () => {
    component.saveLoadCase();
    component.calculateLoadCase();

    expect(mockLoadFormsService.saveTemporaryLoadDataInSection).not.toHaveBeenCalled();
    expect(mockLoadFormsService.calculateLoad).not.toHaveBeenCalled();

    component.form.controls.spanSelect.setValue('support-1');
    component.form.controls.referenceSupport.setValue('LEFT');
    fixture.detectChanges();

    component.saveLoadCase();
    component.calculateLoadCase();

    expect(mockLoadFormsService.saveTemporaryLoadDataInSection).toHaveBeenCalled();
    expect(mockLoadFormsService.calculateLoad).toHaveBeenCalled();
  });

  it('toggles load weight field based on load type', () => {
    const loadWeightInput = () => getByTestId('load-weight');

    expect(loadWeightInput()).toBeTruthy();

    component.form.controls.type.setValue(LoadType.MARKING);
    fixture.detectChanges();

    expect(loadWeightInput()).toBeNull();
  });

  it('disables save and calculate buttons when form is invalid', () => {
    const saveButton = getByTestId('save-load') as HTMLButtonElement;
    const calculateButton = getByTestId('calculate-load') as HTMLButtonElement;

    expect(saveButton.disabled).toBe(true);
    expect(calculateButton.disabled).toBe(true);

    component.form.controls.spanSelect.setValue('support-1');
    component.form.controls.referenceSupport.setValue('LEFT');
    fixture.detectChanges();

    expect(saveButton.disabled).toBe(false);
    expect(calculateButton.disabled).toBe(false);
  });
});
