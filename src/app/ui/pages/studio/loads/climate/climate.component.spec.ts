import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ClimateComponent } from './climate.component';
import { ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { PlotService } from '../../plot.service';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { MessageService } from 'primeng/api';
import { ChargesService } from '@core/services/charges/charges.service';
import { signal } from '@angular/core';
import { Charge } from '@core/data/database/interfaces/charge';

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
      }
    }
  };

  beforeEach(async () => {
    const plotServiceMock = {
      study: signal({ uuid: 'study-uuid-1' }),
      section: signal({ uuid: 'section-uuid-1' }),
      calculateCharge: jest.fn()
    } as unknown as PlotService;
    const messageServiceMock = {
      add: jest.fn()
    } as unknown as MessageService;
    const workerPythonServiceMock = {} as unknown as WorkerPythonService;
    const chargesServiceMock = {
      getCharge: jest.fn().mockResolvedValue(mockCharge),
      createOrUpdateCharge: jest.fn().mockResolvedValue(undefined),
      deleteCharge: jest.fn().mockResolvedValue(undefined)
    } as unknown as ChargesService;

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
        { provide: ChargesService, useValue: chargesServiceMock }
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

  describe('getVisibleFormValues', () => {
    it('should return only symmetric fields even if others are filled', () => {
      component.form.patchValue({
        symmetryType: 'symmetric',
        windPressure: 12,
        cableTemperature: 25,
        iceThickness: 6,
        frontierSupportNumber: null,
        iceThicknessBefore: null,
        iceThicknessAfter: null
      });

      const result = component.getVisibleFormValues();

      expect(result).toEqual({
        windPressure: 12,
        cableTemperature: 25,
        symmetryType: 'symmetric',
        iceThickness: 6
      });
      expect(result).not.toHaveProperty('frontierSupportNumber');
      expect(result).not.toHaveProperty('iceThicknessBefore');
      expect(result).not.toHaveProperty('iceThicknessAfter');
    });

    it('should return only dis_symmetric fields even if others are filled', () => {
      component.form.patchValue({
        symmetryType: 'dis_symmetric',
        windPressure: 15,
        cableTemperature: 30,
        frontierSupportNumber: null,
        iceThicknessBefore: null,
        iceThicknessAfter: null,
        iceThickness: 7
      });

      const result = component.getVisibleFormValues();

      expect(result).toEqual({
        windPressure: 15,
        cableTemperature: 30,
        symmetryType: 'dis_symmetric',
        frontierSupportNumber: null,
        iceThicknessBefore: null,
        iceThicknessAfter: null
      });
      expect(result).not.toHaveProperty('iceThickness');
    });
  });

  describe('isFormEmpty', () => {
    it('should return false when all visible fields are filled (symmetric)', () => {
      component.form.patchValue({
        symmetryType: 'symmetric',
        windPressure: 10,
        cableTemperature: 15,
        iceThickness: 5
      });

      expect(component.isFormEmpty()).toBeFalsy();
    });
  });

  describe('button actions', () => {
    it('should call submitForm when submit button is clicked', () => {
      const spy = jest.spyOn(component, 'submitForm');
      const submitButton = fixture.nativeElement.querySelector(
        'button[type="submit"]'
      );
      submitButton.click();
      expect(spy).toHaveBeenCalled();
    });

    it('should call calculForm when calculate button is clicked', () => {
      const spy = jest.spyOn(component, 'calculForm');
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
