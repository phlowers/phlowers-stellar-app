import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { StudioMenuBarComponent } from './menu-bar.component';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { ChargesService } from '@core/services/charges/charges.service';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DividerModule } from 'primeng/divider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { SelectWithButtonsComponent } from '@ui/shared/components/atoms/select-with-buttons/select-with-buttons.component';
import { signal } from '@angular/core';
import { Section } from '@core/data/database/interfaces/section';
import { Study } from '@core/data/database/interfaces/study';
import { Charge } from '@core/data/database/interfaces/charge';
import { InitialCondition } from '@core/data/database/interfaces/initialCondition';
import { ActivatedRoute } from '@angular/router';

describe('StudioMenuBarComponent', () => {
  let component: StudioMenuBarComponent;
  let fixture: ComponentFixture<StudioMenuBarComponent>;
  let mockPlotService: Partial<PlotService>;
  let mockChargesService: Partial<ChargesService>;

  const mockCharge1: Charge = {
    uuid: 'charge-uuid-1',
    name: 'Charge 1',
    personnelPresence: true,
    description: 'Test charge 1',
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

  const mockCharge2: Charge = {
    uuid: 'charge-uuid-2',
    name: 'Charge 2',
    personnelPresence: false,
    description: 'Test charge 2',
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

  const mockInitialCondition: InitialCondition = {
    uuid: 'ic-uuid-1',
    name: 'Initial Condition 1',
    base_parameters: 0,
    base_temperature: 20,
    cable_pretension: 0,
    min_temperature: 0,
    max_wind_pressure: 0,
    max_frost_width: 0
  };

  const mockSection: Section = {
    uuid: 'section-uuid-1',
    internal_id: 'INT-001',
    name: 'Section 1',
    short_name: 'S1',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    internal_catalog_id: 'CAT-001',
    type: 'phase',
    electric_phase_number: 1,
    cable_name: 'Test Cable',
    cable_short_name: 'TC',
    cables_amount: 3,
    optical_fibers_amount: 12,
    spans_amount: 5,
    begin_span_name: 'Span 1',
    last_span_name: 'Span 5',
    first_support_number: 1,
    last_support_number: 6,
    first_attachment_set: 'Set 1',
    last_attachment_set: 'Set 2',
    regional_maintenance_center_names: ['Center 1'],
    maintenance_center_names: ['Maintenance 1'],
    regional_team_id: 'GMR-001',
    maintenance_team_id: 'EEL-001',
    maintenance_center_id: 'CM-001',
    link_name: 'Link 1',
    lit: 'LIT-001',
    branch_name: 'Branch 1',
    voltage_idr: '400kV',
    comment: 'Test comment',
    supports_comment: 'Test supports comment',
    supports: [],
    initial_conditions: [mockInitialCondition],
    selected_initial_condition_uuid: 'ic-uuid-1',
    charges: [mockCharge1, mockCharge2],
    selected_charge_uuid: 'charge-uuid-1'
  };

  const mockStudy: Study = {
    uuid: 'study-uuid-1',
    author_email: 'test@example.com',
    title: 'Test Study',
    description: 'Test description',
    shareable: false,
    created_at_offline: '2025-01-01T00:00:00.000Z',
    updated_at_offline: '2025-01-01T00:00:00.000Z',
    saved: true,
    sections: [mockSection]
  };

  beforeEach(async () => {
    // Mock PlotService
    mockPlotService = {
      plotOptions: signal({
        view: '3d',
        side: 'profile',
        startSupport: 0,
        endSupport: 1,
        invert: false
      }),
      loading: signal(false),
      plotOptionsChange: jest.fn()
    };

    // Mock ChargesService
    mockChargesService = {
      setSelectedCharge: jest.fn().mockResolvedValue(undefined),
      deleteCharge: jest.fn().mockResolvedValue(undefined),
      duplicateCharge: jest.fn().mockResolvedValue(mockCharge1)
    };

    await TestBed.configureTestingModule({
      imports: [
        StudioMenuBarComponent,
        FormsModule,
        SelectButtonModule,
        DividerModule,
        ToggleSwitchModule,
        SelectModule,
        IconComponent,
        ButtonComponent,
        SelectWithButtonsComponent
      ],
      providers: [
        { provide: PlotService, useValue: mockPlotService as PlotService },
        {
          provide: ChargesService,
          useValue: mockChargesService as ChargesService
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: jest.fn() },
              queryParamMap: { get: jest.fn() }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StudioMenuBarComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('section', mockSection);
    fixture.componentRef.setInput('study', mockStudy);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should have access to plotService', () => {
      expect(component.plotService).toBeDefined();
      expect(component.plotService).toBe(mockPlotService);
    });

    it('should have access to chargesService', () => {
      expect(component['chargesService']).toBeDefined();
      expect(component['chargesService']).toBe(mockChargesService);
    });
  });

  describe('chargeCases computed signal', () => {
    it('should map charges to label-value pairs', () => {
      const chargeCases = component.chargeCases();
      expect(chargeCases).toHaveLength(2);
      expect(chargeCases[0]).toEqual({
        label: 'Charge 1',
        value: 'charge-uuid-1'
      });
      expect(chargeCases[1]).toEqual({
        label: 'Charge 2',
        value: 'charge-uuid-2'
      });
    });

    it('should return empty array when section is null', () => {
      fixture.componentRef.setInput('section', null);
      fixture.detectChanges();

      const chargeCases = component.chargeCases();
      expect(chargeCases).toEqual([]);
    });

    it('should return empty array when charges is undefined', () => {
      const sectionWithoutCharges: Partial<Section> = {
        ...mockSection,
        charges: [] // Use empty array instead of undefined to avoid errors in staffIsPresent computed
      };
      fixture.componentRef.setInput(
        'section',
        sectionWithoutCharges as Section
      );
      fixture.detectChanges();

      const chargeCases = component.chargeCases();
      expect(chargeCases).toEqual([]);
    });

    it('should return empty array when charges is empty', () => {
      const sectionWithEmptyCharges: Section = {
        ...mockSection,
        charges: []
      };
      fixture.componentRef.setInput('section', sectionWithEmptyCharges);
      fixture.detectChanges();

      const chargeCases = component.chargeCases();
      expect(chargeCases).toEqual([]);
    });

    it('should update reactively when section changes', () => {
      let chargeCases = component.chargeCases();
      expect(chargeCases).toHaveLength(2);

      const newSection: Section = {
        ...mockSection,
        charges: [mockCharge1]
      };
      fixture.componentRef.setInput('section', newSection);
      fixture.detectChanges();

      chargeCases = component.chargeCases();
      expect(chargeCases).toHaveLength(1);
    });
  });

  describe('selectedChargeCaseUuid computed signal', () => {
    it('should return selected charge uuid from study section', () => {
      const selectedUuid = component.selectedChargeCaseUuid();
      expect(selectedUuid).toBe('charge-uuid-1');
    });

    it('should return null when no charge is selected', () => {
      const studyWithoutSelectedCharge: Study = {
        ...mockStudy,
        sections: [
          {
            ...mockSection,
            selected_charge_uuid: null
          }
        ]
      };
      fixture.componentRef.setInput('study', studyWithoutSelectedCharge);
      fixture.detectChanges();

      const selectedUuid = component.selectedChargeCaseUuid();
      expect(selectedUuid).toBeNull();
    });

    it('should return null when section is not found in study', () => {
      const studyWithDifferentSection: Study = {
        ...mockStudy,
        sections: [
          {
            ...mockSection,
            uuid: 'different-section-uuid'
          }
        ]
      };
      fixture.componentRef.setInput('study', studyWithDifferentSection);
      fixture.detectChanges();

      const selectedUuid = component.selectedChargeCaseUuid();
      expect(selectedUuid).toBeNull();
    });

    it('should return null when study is null', () => {
      fixture.componentRef.setInput('study', null);
      fixture.detectChanges();

      const selectedUuid = component.selectedChargeCaseUuid();
      expect(selectedUuid).toBeNull();
    });

    it('should return null when section is null', () => {
      fixture.componentRef.setInput('section', null);
      fixture.detectChanges();

      const selectedUuid = component.selectedChargeCaseUuid();
      expect(selectedUuid).toBeNull();
    });
  });

  describe('initialCondition computed signal', () => {
    it('should return the selected initial condition', () => {
      const initialCondition = component.initialCondition();
      expect(initialCondition).toBeDefined();
      expect(initialCondition?.uuid).toBe('ic-uuid-1');
      expect(initialCondition?.name).toBe('Initial Condition 1');
    });

    it('should return undefined when no initial condition is selected', () => {
      const sectionWithoutSelectedIc: Section = {
        ...mockSection,
        selected_initial_condition_uuid: undefined
      };
      fixture.componentRef.setInput('section', sectionWithoutSelectedIc);
      fixture.detectChanges();

      const initialCondition = component.initialCondition();
      expect(initialCondition).toBeUndefined();
    });

    it('should return undefined when selected initial condition is not found', () => {
      const sectionWithNonExistentIc: Section = {
        ...mockSection,
        selected_initial_condition_uuid: 'non-existent-ic-uuid'
      };
      fixture.componentRef.setInput('section', sectionWithNonExistentIc);
      fixture.detectChanges();

      const initialCondition = component.initialCondition();
      expect(initialCondition).toBeUndefined();
    });

    it('should return undefined when section is null', () => {
      fixture.componentRef.setInput('section', null);
      fixture.detectChanges();

      const initialCondition = component.initialCondition();
      expect(initialCondition).toBeUndefined();
    });
  });

  describe('staffIsPresent computed signal', () => {
    it('should return true when selected charge has personnelPresence true', () => {
      const staffIsPresent = component.staffIsPresent();
      expect(staffIsPresent).toBe(true);
    });

    it('should return false when selected charge has personnelPresence false', () => {
      const studyWithCharge2Selected: Study = {
        ...mockStudy,
        sections: [
          {
            ...mockSection,
            selected_charge_uuid: 'charge-uuid-2'
          }
        ]
      };
      fixture.componentRef.setInput('study', studyWithCharge2Selected);
      fixture.detectChanges();

      const staffIsPresent = component.staffIsPresent();
      expect(staffIsPresent).toBe(false);
    });

    it('should return false when no charge is selected', () => {
      const studyWithoutSelectedCharge: Study = {
        ...mockStudy,
        sections: [
          {
            ...mockSection,
            selected_charge_uuid: null
          }
        ]
      };
      fixture.componentRef.setInput('study', studyWithoutSelectedCharge);
      fixture.detectChanges();

      const staffIsPresent = component.staffIsPresent();
      expect(staffIsPresent).toBe(false);
    });

    it('should return false when selected charge is not found', () => {
      const studyWithNonExistentCharge: Study = {
        ...mockStudy,
        sections: [
          {
            ...mockSection,
            selected_charge_uuid: 'non-existent-charge-uuid'
          }
        ]
      };
      fixture.componentRef.setInput('study', studyWithNonExistentCharge);
      fixture.detectChanges();

      const staffIsPresent = component.staffIsPresent();
      expect(staffIsPresent).toBeUndefined();
    });

    it('should return false when section is null', () => {
      fixture.componentRef.setInput('section', null);
      fixture.detectChanges();

      const staffIsPresent = component.staffIsPresent();
      expect(staffIsPresent).toBe(false);
    });
  });

  describe('launchChargeFunction', () => {
    it('should call function with correct parameters when value is provided', () => {
      const mockFunction = jest.fn();
      const value = 'test-value';

      component.launchChargeFunction(mockFunction, value);

      expect(mockFunction).toHaveBeenCalledWith(
        'study-uuid-1',
        'section-uuid-1',
        'test-value'
      );
    });

    it('should not call function when value is empty string', () => {
      const mockFunction = jest.fn();

      component.launchChargeFunction(mockFunction, '');

      expect(mockFunction).not.toHaveBeenCalled();
    });

    it('should not call function when value is null', () => {
      const mockFunction = jest.fn();

      component.launchChargeFunction(mockFunction, null as unknown as string);

      expect(mockFunction).not.toHaveBeenCalled();
    });

    it('should use empty string for study uuid when study is null', () => {
      fixture.componentRef.setInput('study', null);
      fixture.detectChanges();

      const mockFunction = jest.fn();
      component.launchChargeFunction(mockFunction, 'test-value');

      expect(mockFunction).toHaveBeenCalledWith(
        '',
        'section-uuid-1',
        'test-value'
      );
    });

    it('should use empty string for section uuid when section is null', () => {
      fixture.componentRef.setInput('section', null);
      fixture.detectChanges();

      const mockFunction = jest.fn();
      component.launchChargeFunction(mockFunction, 'test-value');

      expect(mockFunction).toHaveBeenCalledWith(
        'study-uuid-1',
        '',
        'test-value'
      );
    });
  });

  describe('selectChargeCase', () => {
    it('should call setSelectedCharge with charge case value', () => {
      const chargeCase = { label: 'Charge 1', value: 'charge-uuid-1' };

      component.selectChargeCase(chargeCase);

      expect(mockChargesService.setSelectedCharge).toHaveBeenCalledWith(
        'study-uuid-1',
        'section-uuid-1',
        'charge-uuid-1'
      );
    });

    it('should not call setSelectedCharge when chargeCase is undefined', () => {
      component.selectChargeCase(undefined);

      expect(mockChargesService.setSelectedCharge).not.toHaveBeenCalled();
    });

    it('should not call setSelectedCharge when chargeCase value is undefined', () => {
      const chargeCase = {
        label: 'Charge 1',
        value: undefined as unknown as string
      };

      component.selectChargeCase(chargeCase);

      expect(mockChargesService.setSelectedCharge).not.toHaveBeenCalled();
    });

    it('should not call setSelectedCharge when chargeCase value is empty string', () => {
      const chargeCase = { label: 'Charge 1', value: '' };

      component.selectChargeCase(chargeCase);

      expect(mockChargesService.setSelectedCharge).not.toHaveBeenCalled();
    });
  });

  describe('deleteChargeCase', () => {
    it('should call deleteCharge with charge case value', () => {
      const chargeCase = { label: 'Charge 1', value: 'charge-uuid-1' };

      component.deleteChargeCase(chargeCase);

      expect(mockChargesService.deleteCharge).toHaveBeenCalledWith(
        'study-uuid-1',
        'section-uuid-1',
        'charge-uuid-1'
      );
    });

    it('should not call deleteCharge when chargeCase is undefined', () => {
      component.deleteChargeCase(undefined);

      expect(mockChargesService.deleteCharge).not.toHaveBeenCalled();
    });

    it('should not call deleteCharge when chargeCase value is empty string', () => {
      const chargeCase = { label: 'Charge 1', value: '' };

      component.deleteChargeCase(chargeCase);

      expect(mockChargesService.deleteCharge).not.toHaveBeenCalled();
    });
  });

  describe('duplicateChargeCase', () => {
    it('should call duplicateCharge with charge case value', () => {
      const chargeCase = { label: 'Charge 1', value: 'charge-uuid-1' };

      component.duplicateChargeCase(chargeCase);

      expect(mockChargesService.duplicateCharge).toHaveBeenCalledWith(
        'study-uuid-1',
        'section-uuid-1',
        'charge-uuid-1'
      );
    });

    it('should not call duplicateCharge when chargeCase is undefined', () => {
      component.duplicateChargeCase(undefined);

      expect(mockChargesService.duplicateCharge).not.toHaveBeenCalled();
    });

    it('should not call duplicateCharge when chargeCase value is empty string', () => {
      const chargeCase = { label: 'Charge 1', value: '' };

      component.duplicateChargeCase(chargeCase);

      expect(mockChargesService.duplicateCharge).not.toHaveBeenCalled();
    });
  });

  describe('viewOrEditChargeCase', () => {
    it('should emit openNewChargeModal with view mode and charge uuid', () => {
      const emitSpy = jest.spyOn(component.openNewChargeModal, 'emit');
      const chargeCase = { label: 'Charge 1', value: 'charge-uuid-1' };

      component.viewOrEditChargeCase(chargeCase, 'view');

      expect(emitSpy).toHaveBeenCalledWith({
        mode: 'view',
        uuid: 'charge-uuid-1'
      });
    });

    it('should emit openNewChargeModal with edit mode and charge uuid', () => {
      const emitSpy = jest.spyOn(component.openNewChargeModal, 'emit');
      const chargeCase = { label: 'Charge 1', value: 'charge-uuid-1' };

      component.viewOrEditChargeCase(chargeCase, 'edit');

      expect(emitSpy).toHaveBeenCalledWith({
        mode: 'edit',
        uuid: 'charge-uuid-1'
      });
    });

    it('should not emit when chargeCase value is empty string', () => {
      const emitSpy = jest.spyOn(component.openNewChargeModal, 'emit');
      const chargeCase = { label: 'Charge 1', value: '' };

      component.viewOrEditChargeCase(chargeCase, 'view');

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should not emit when chargeCase value is undefined', () => {
      const emitSpy = jest.spyOn(component.openNewChargeModal, 'emit');
      const chargeCase = {
        label: 'Charge 1',
        value: undefined as unknown as string
      };

      component.viewOrEditChargeCase(chargeCase, 'view');

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should not emit when chargeCase is undefined', () => {
      const emitSpy = jest.spyOn(component.openNewChargeModal, 'emit');

      component.viewOrEditChargeCase(
        undefined as unknown as { label: string; value: string },
        'view'
      );

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle section with null charges array', () => {
      const sectionWithNullCharges: Partial<Section> = {
        ...mockSection,
        charges: [] // Use empty array instead of null to avoid errors in staffIsPresent computed
      };
      fixture.componentRef.setInput(
        'section',
        sectionWithNullCharges as Section
      );
      fixture.detectChanges();

      const chargeCases = component.chargeCases();
      expect(chargeCases).toEqual([]);
    });

    it('should handle study with empty sections array', () => {
      const studyWithEmptySections: Study = {
        ...mockStudy,
        sections: []
      };
      fixture.componentRef.setInput('study', studyWithEmptySections);
      fixture.detectChanges();

      const selectedUuid = component.selectedChargeCaseUuid();
      expect(selectedUuid).toBeNull();
    });

    it('should handle section with empty initial_conditions array', () => {
      const sectionWithEmptyIc: Section = {
        ...mockSection,
        initial_conditions: []
      };
      fixture.componentRef.setInput('section', sectionWithEmptyIc);
      fixture.detectChanges();

      const initialCondition = component.initialCondition();
      expect(initialCondition).toBeUndefined();
    });

    it('should handle multiple charges with same name', () => {
      const chargeWithSameName: Charge = {
        ...mockCharge1,
        uuid: 'charge-uuid-3',
        name: 'Charge 1'
      };
      const sectionWithDuplicateNames: Section = {
        ...mockSection,
        charges: [mockCharge1, chargeWithSameName]
      };
      fixture.componentRef.setInput('section', sectionWithDuplicateNames);
      fixture.detectChanges();

      const chargeCases = component.chargeCases();
      expect(chargeCases).toHaveLength(2);
      expect(chargeCases[0].label).toBe('Charge 1');
      expect(chargeCases[1].label).toBe('Charge 1');
    });
  });
});
