import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InitialConditionModalComponent } from './initialConditionModal.component';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { InitialCondition } from '@src/app/core/data/database/interfaces/initialCondition';

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
    supports: [],
    initial_conditions: []
  };

  const mockInitialCondition: InitialCondition = {
    uuid: 'ic-1',
    name: 'Cond 1',
    base_parameters: 'Params',
    base_temperature: 20
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InitialConditionModalComponent]
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
});
