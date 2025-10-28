import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InitialConditionModalComponent } from './initialConditionModal.component';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { InitialCondition } from '@src/app/core/data/database/interfaces/initialCondition';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CablesService } from '@core/services/cables/cables.service';
import { StorageService } from '@core/services/storage/storage.service';
import { StudiesService } from '@core/services/studies/studies.service';
import { BehaviorSubject } from 'rxjs';

describe('InitialConditionModalComponent', () => {
  let component: InitialConditionModalComponent;
  let fixture: ComponentFixture<InitialConditionModalComponent>;

  const mockSection: Section = {
    uuid: 'section-1',
    internal_id: 'int-1',
    name: 'Section 1',
    short_name: 'S1',
    created_at: '',
    updated_at: '',
    internal_catalog_id: '',
    type: 'phase',
    electric_phase_number: 1,
    cable_name: '',
    cable_short_name: '',
    cables_amount: 0,
    optical_fibers_amount: 0,
    spans_amount: 0,
    begin_span_name: '',
    last_span_name: '',
    first_support_number: 0,
    last_support_number: 0,
    first_attachment_set: '',
    last_attachment_set: '',
    regional_maintenance_center_names: [],
    maintenance_center_names: [],
    gmr: undefined,
    eel: undefined,
    cm: undefined,
    link_name: undefined,
    lit: undefined,
    branch_name: undefined,
    electric_tension_level: undefined,
    comment: undefined,
    supports_comment: undefined,
    supports: [],
    initial_conditions: [],
    selected_initial_condition_uuid: undefined
  };

  const mockInitialCondition: InitialCondition = {
    uuid: 'ic-1',
    name: 'Cond 1',
    base_parameters: 0,
    base_temperature: 20,
    cable_pretension: 0,
    min_temperature: 0,
    max_wind_pressure: 0,
    max_frost_width: 0
  };

  beforeEach(async () => {
    // Create mock StorageService
    const mockStorageService = {
      ready$: new BehaviorSubject<boolean>(true),
      db: {
        cables: {
          toArray: jest.fn().mockResolvedValue([])
        }
      }
    } as unknown as StorageService;

    // Create mock CablesService
    const mockCablesService = {
      getCables: jest.fn().mockResolvedValue([])
    } as unknown as CablesService;

    // Create mock StudiesService
    const mockStudiesService = {
      updateStudy: jest.fn().mockResolvedValue(undefined)
    } as unknown as StudiesService;

    await TestBed.configureTestingModule({
      imports: [InitialConditionModalComponent],
      providers: [
        provideHttpClientTesting(),
        { provide: StorageService, useValue: mockStorageService },
        { provide: CablesService, useValue: mockCablesService },
        { provide: StudiesService, useValue: mockStudiesService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InitialConditionModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('section', mockSection);
    fixture.componentRef.setInput('mode', 'create');
    fixture.componentRef.setInput(
      'initialConditionInput',
      mockInitialCondition
    );
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize initialCondition from input', () => {
    expect(component.initialCondition()).toEqual(mockInitialCondition);
  });

  describe('onVisibleChange', () => {
    it('should emit isOpenChange when visible is false', () => {
      const spy = jest.spyOn(component.isOpenChange, 'emit');
      component.onVisibleChange(false);
      expect(spy).toHaveBeenCalledWith(false);
    });

    it('should not emit when visible is true', () => {
      const spy = jest.spyOn(component.isOpenChange, 'emit');
      component.onVisibleChange(true);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('onSubmit', () => {
    it('should emit addInitialCondition when mode is create', () => {
      fixture.componentRef.setInput('mode', 'create');
      fixture.detectChanges();

      const spyAdd = jest.spyOn(component.addInitialCondition, 'emit');
      const spyOpen = jest.spyOn(component.isOpenChange, 'emit');

      component.onSubmit();

      expect(spyOpen).toHaveBeenCalledWith(false);
      expect(spyAdd).toHaveBeenCalledWith({
        section: mockSection,
        initialCondition: mockInitialCondition
      });
    });

    it('should emit updateInitialCondition when mode is edit', () => {
      fixture.componentRef.setInput('mode', 'edit');
      fixture.detectChanges();

      const spyUpdate = jest.spyOn(component.updateInitialCondition, 'emit');
      const spyOpen = jest.spyOn(component.isOpenChange, 'emit');

      component.onSubmit();

      expect(spyOpen).toHaveBeenCalledWith(false);
      expect(spyUpdate).toHaveBeenCalledWith({
        section: mockSection,
        initialCondition: mockInitialCondition
      });
    });

    it('should do nothing when mode is view', () => {
      fixture.componentRef.setInput('mode', 'view');
      fixture.detectChanges();

      const spyAdd = jest.spyOn(component.addInitialCondition, 'emit');
      const spyUpdate = jest.spyOn(component.updateInitialCondition, 'emit');
      const spyOpen = jest.spyOn(component.isOpenChange, 'emit');

      component.onSubmit();

      expect(spyOpen).toHaveBeenCalledWith(false);
      expect(spyAdd).not.toHaveBeenCalled();
      expect(spyUpdate).not.toHaveBeenCalled();
    });
  });

  describe('isNumber', () => {
    it('should return true for a number', () => {
      expect(component.isNumber(5)).toBe(true);
    });

    it('should return true for zero', () => {
      expect(component.isNumber(0)).toBe(true);
    });

    it('should return true for negative numbers', () => {
      expect(component.isNumber(-5)).toBe(true);
    });

    it('should return true for floating point numbers', () => {
      expect(component.isNumber(3.14)).toBe(true);
    });
  });

  describe('onModify', () => {
    it('should emit changeMode with edit', () => {
      const spy = jest.spyOn(component.changeMode, 'emit');
      component.onModify();
      expect(spy).toHaveBeenCalledWith('edit');
    });
  });

  describe('onNameChange', () => {
    beforeEach(() => {
      const initialConditions: InitialCondition[] = [
        mockInitialCondition,
        {
          uuid: 'ic-2',
          name: 'Existing Condition',
          base_parameters: 0,
          base_temperature: 25,
          cable_pretension: 0,
          min_temperature: 0,
          max_wind_pressure: 0,
          max_frost_width: 0
        }
      ];
      fixture.componentRef.setInput('initialConditions', initialConditions);
      fixture.detectChanges();
    });

    it('should set isNameUnique to true for unique names', () => {
      component.onNameChange('New Unique Name');
      expect(component.isNameUnique()).toBe(true);
    });

    it('should set isNameUnique to false for duplicate names', () => {
      component.onNameChange('Existing Condition');
      expect(component.isNameUnique()).toBe(false);
    });

    it('should allow same name for the same initial condition (editing)', () => {
      component.initialCondition.set(mockInitialCondition);
      component.onNameChange('Cond 1');
      expect(component.isNameUnique()).toBe(true);
    });
  });

  describe('onDelete', () => {
    it('should call deleteInitialCondition and close modal', () => {
      const mockStudy = {
        uuid: 'study-1',
        title: 'Test Study',
        description: '',
        author_email: 'test@example.com',
        sections: [mockSection],
        shareable: true,
        saved: true,
        created_at_offline: '2025-01-01T00:00:00.000Z',
        updated_at_offline: '2025-01-01T00:00:00.000Z'
      };
      fixture.componentRef.setInput('study', mockStudy);
      fixture.detectChanges();

      const deleteServiceSpy = jest.spyOn(
        component['initialConditionService'],
        'deleteInitialCondition'
      );
      const closeModalSpy = jest.spyOn(component.isOpenChange, 'emit');

      component.onDelete();

      expect(deleteServiceSpy).toHaveBeenCalledWith(
        mockStudy,
        mockSection,
        mockInitialCondition
      );
      expect(closeModalSpy).toHaveBeenCalledWith(false);
    });
  });
});
