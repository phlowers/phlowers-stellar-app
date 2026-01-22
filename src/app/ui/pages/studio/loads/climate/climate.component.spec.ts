import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ClimateComponent } from './climate.component';
import { ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { PlotService } from '../../services/plot.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { MessageService } from 'primeng/api';
import { ChargesService } from '@services/charges/charges.service';
import { LoadFormsService } from '../loadForms.service';
import { signal } from '@angular/core';
import { Charge } from '@core/domain';

describe('ClimateComponent (Jest)', () => {
  let component: ClimateComponent;
  let fixture: ComponentFixture<ClimateComponent>;

  const mockCharge: Charge = {
    uuid: 'test-charge-uuid',
    name: 'Test Charge',
    personnelPresence: false,
    description: 'Test description',
    data: {
      climate: {
        windPressure: 0,
        cableTemperature: 15,
        symmetryType: 'symmetric',
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
      section: signal({ uuid: 'section-uuid-1' }),
      calculateCharge: jest.fn(),
      refreshCamera: jest.fn(),
      loading: signal(false),
      temporaryLoadData: {
        climate: {
          windPressure: 0,
          cableTemperature: 15,
          symmetryType: 'symmetric',
          iceThickness: 0,
          frontierSupportNumber: null,
          iceThicknessBefore: null,
          iceThicknessAfter: null
        },
        spanLoads: []
      }
    } as unknown as PlotService;
    const messageServiceMock = {
      add: jest.fn()
    } as unknown as MessageService;
    const workerPythonServiceMock = {} as unknown as WorkerPythonService;
    const chargesServiceMock = {
      getCharge: jest.fn().mockResolvedValue(mockCharge),
      createOrUpdateCharge: jest.fn().mockResolvedValue(undefined),
      deleteCharge: jest.fn().mockResolvedValue(undefined),
      getSelectedChargeCase: jest.fn().mockResolvedValue(mockCharge)
    } as unknown as ChargesService;

    const loadFormsServiceMock = {
      calculateLoad: jest.fn().mockResolvedValue(undefined),
      saveTemporaryLoadDataInSection: jest.fn().mockResolvedValue(undefined),
      initTemporaryLoadData: jest.fn(),
      deleteLoad: jest.fn()
    } as unknown as LoadFormsService;

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        SelectModule,
        InputText,
        ButtonComponent,
        IconComponent,
        ClimateComponent
      ],
      providers: [
        { provide: PlotService, useValue: plotServiceMock },
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

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default values', () => {
    expect(component.form.value).toEqual({
      windPressure: 0,
      cableTemperature: 15,
      symmetryType: 'symmetric',
      iceThickness: 0,
      frontierSupportNumber: null,
      iceThicknessBefore: null,
      iceThicknessAfter: null
    });
  });

  it('should reset form to default values', () => {
    component.form.patchValue({
      windPressure: 50,
      cableTemperature: 25,
      symmetryType: 'dis_symmetric',
      iceThickness: 10,
      frontierSupportNumber: null,
      iceThicknessBefore: null,
      iceThicknessAfter: null
    });

    component.resetForm();

    expect(component.form.value).toEqual({
      windPressure: 0,
      cableTemperature: 15,
      symmetryType: 'symmetric',
      iceThickness: 0,
      frontierSupportNumber: null,
      iceThicknessBefore: null,
      iceThicknessAfter: null
    });
  });

  describe('button actions', () => {
    it('should call submitForm when submit button is clicked', () => {
      const spy = jest.spyOn(component, 'saveForm');
      const submitButton = fixture.nativeElement.querySelector(
        'button[type="submit"]'
      );
      submitButton.click();
      expect(spy).toHaveBeenCalled();
    });

    it('should call calculForm when calculate button is clicked', () => {
      const spy = jest.spyOn(component, 'calculateForm');
      const buttons = [
        ...fixture.nativeElement.querySelectorAll('button')
      ] as HTMLElement[];
      const calcButton = buttons.find((b) =>
        b.textContent?.includes('Calculate')
      );
      calcButton?.click();
      expect(spy).toHaveBeenCalled();
    });

    it('should call resetForm when erase button is clicked', () => {
      const spy = jest.spyOn(component, 'resetForm');
      const resetButton =
        fixture.nativeElement.querySelector('.climate__reset');
      resetButton.click();
      expect(spy).toHaveBeenCalled();
    });
  });
});
