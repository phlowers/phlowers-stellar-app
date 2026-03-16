import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input, signal, WritableSignal } from '@angular/core';
import { StudioComponent } from './studio.component';
import { SectionPlotComponent } from './section/section-plot.component';
import { PlotService } from '@features/studio/core/services/plot.service';
import { TaskError, DataError, GetSectionOutput } from '@services/worker_python/tasks/types';
import { Section } from '@shared/domain';
import { formatStudioError } from './helpers/errors';

// Stub child component to avoid pulling in its dependency tree
@Component({
  selector: 'app-section-plot',
  template: '',
  standalone: true
})
class SectionPlotStubComponent {
  litData = input<any>();
}

const mockSection: Section = {
  uuid: 'sec-1',
  internal_id: '1',
  name: 'Section',
  short_name: 'S1',
  created_at: '',
  updated_at: '',
  internal_catalog_id: '',
  type: '',
  electric_phase_number: 1,
  cable_name: 'cable',
  cable_short_name: 'c',
  cables_amount: 1,
  optical_fibers_amount: 1,
  spans_amount: 1,
  begin_span_name: '',
  last_span_name: '',
  first_support_number: 1,
  last_support_number: 2,
  first_attachment_set: '',
  last_attachment_set: '',
  regional_maintenance_center_names: [],
  maintenance_center_names: [],
  regional_team_id: undefined,
  maintenance_team_id: undefined,
  maintenance_center_id: undefined,
  link_name: undefined,
  lit_code: undefined,
  lit_name: undefined,
  branch_name: undefined,
  branch_idr: undefined,
  voltage_idr: undefined,
  comment: undefined,
  supports_comment: undefined,
  supports: [],
  obstacles: [],
  initial_conditions: [],
  selected_initial_condition_uuid: undefined,
  charges: [],
  selected_charge_uuid: null,
  field_measures: [],
  selected_field_measure_uuid: undefined,
  vtl_and_guying: undefined
};

const mockLitData: GetSectionOutput = {
  supports: [],
  insulators: [],
  spans: [],
  L0: [],
  elevation: [],
  line_angle: [],
  vtl_under_chain: [],
  vtl_under_console: [],
  r_under_chain: [],
  r_under_console: [],
  ground_altitude: [],
  load_angle: [],
  displacement: [],
  span_length: [],
  loads_coords: {},
  parameter: [],
  tension_sup: [],
  tension_inf: [],
  horizontal_distance: [],
  arc_length: [],
  T_h: []
};

describe('StudioComponent', () => {
  let component: StudioComponent;
  let fixture: ComponentFixture<StudioComponent>;
  let mockPlotService: {
    error: WritableSignal<TaskError | DataError | null>;
    litData: WritableSignal<GetSectionOutput | null>;
    loading: WritableSignal<boolean>;
    section: WritableSignal<Section | null>;
    workerReady: WritableSignal<boolean>;
    refreshSection: jest.Mock;
  };

  beforeEach(async () => {
    mockPlotService = {
      error: signal<TaskError | DataError | null>(null),
      litData: signal<GetSectionOutput | null>(null),
      loading: signal<boolean>(false),
      section: signal<Section | null>(null),
      workerReady: signal<boolean>(false),
      refreshSection: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [StudioComponent],
      providers: [{ provide: PlotService, useValue: mockPlotService }]
    })
      .overrideComponent(StudioComponent, {
        remove: { imports: [SectionPlotComponent] },
        add: { imports: [SectionPlotStubComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(StudioComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isPreview', false);
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should inject PlotService', () => {
      expect(component['plotService']).toBe(mockPlotService);
    });

    it('should have isPreview input set to false', () => {
      expect(component.isPreview()).toBe(false);
    });
  });

  describe('errorString computed', () => {
    it('should format null error', () => {
      mockPlotService.error.set(null);
      expect(component.errorString()).toBe(formatStudioError(null));
    });

    it('should format TaskError.CALCULATION_ERROR', () => {
      mockPlotService.error.set(TaskError.CALCULATION_ERROR);
      expect(component.errorString()).toBe(formatStudioError(TaskError.CALCULATION_ERROR));
    });

    it('should format DataError.NO_CABLE_FOUND', () => {
      mockPlotService.error.set(DataError.NO_CABLE_FOUND);
      expect(component.errorString()).toBe(formatStudioError(DataError.NO_CABLE_FOUND));
    });

    it('should format TaskError.SOLVER_DID_NOT_CONVERGE', () => {
      mockPlotService.error.set(TaskError.SOLVER_DID_NOT_CONVERGE);
      expect(component.errorString()).toBe(formatStudioError(TaskError.SOLVER_DID_NOT_CONVERGE));
    });

    it('should format TaskError.PYODIDE_LOAD_ERROR', () => {
      mockPlotService.error.set(TaskError.PYODIDE_LOAD_ERROR);
      expect(component.errorString()).toBe(formatStudioError(TaskError.PYODIDE_LOAD_ERROR));
    });
  });

  describe('Effect – preview refresh', () => {
    it('should not call refreshSection when isPreview is false', () => {
      mockPlotService.workerReady.set(true);
      mockPlotService.section.set(mockSection);
      fixture.componentRef.setInput('isPreview', false);
      fixture.detectChanges();

      expect(mockPlotService.refreshSection).not.toHaveBeenCalled();
    });

    it('should not call refreshSection when worker is not ready', () => {
      mockPlotService.workerReady.set(false);
      mockPlotService.section.set(mockSection);
      fixture.componentRef.setInput('isPreview', true);
      fixture.detectChanges();

      expect(mockPlotService.refreshSection).not.toHaveBeenCalled();
    });

    it('should not call refreshSection when section is null', () => {
      mockPlotService.workerReady.set(true);
      mockPlotService.section.set(null);
      fixture.componentRef.setInput('isPreview', true);
      fixture.detectChanges();

      expect(mockPlotService.refreshSection).not.toHaveBeenCalled();
    });

    it('should call refreshSection when all conditions are met', () => {
      mockPlotService.workerReady.set(true);
      mockPlotService.section.set(mockSection);
      fixture.componentRef.setInput('isPreview', true);
      fixture.detectChanges();

      expect(mockPlotService.refreshSection).toHaveBeenCalledWith(mockSection);
    });

    it('should call refreshSection again when section changes', () => {
      mockPlotService.workerReady.set(true);
      mockPlotService.section.set(mockSection);
      fixture.componentRef.setInput('isPreview', true);
      fixture.detectChanges();

      mockPlotService.refreshSection.mockClear();

      const anotherSection = { ...mockSection, uuid: 'sec-2', name: 'Section 2' };
      mockPlotService.section.set(anotherSection);
      fixture.detectChanges();

      expect(mockPlotService.refreshSection).toHaveBeenCalledWith(anotherSection);
    });
  });

  describe('Template – loading state', () => {
    it('should show spinner when loading', () => {
      mockPlotService.loading.set(true);
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('p-progress-spinner');
      expect(spinner).toBeTruthy();
    });

    it('should not show spinner when not loading', () => {
      mockPlotService.loading.set(false);
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('p-progress-spinner');
      expect(spinner).toBeFalsy();
    });
  });

  describe('Template – error state', () => {
    it('should show error message when error is set', () => {
      mockPlotService.loading.set(false);
      mockPlotService.error.set(TaskError.CALCULATION_ERROR);
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('.text-red-500');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toContain(formatStudioError(TaskError.CALCULATION_ERROR));
    });

    it('should not show error message when no error', () => {
      mockPlotService.loading.set(false);
      mockPlotService.error.set(null);
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('.text-red-500');
      expect(errorEl).toBeFalsy();
    });
  });

  describe('Template – plot state', () => {
    it('should show section-plot when not loading and no error', () => {
      mockPlotService.loading.set(false);
      mockPlotService.error.set(null);
      mockPlotService.litData.set(mockLitData);
      fixture.detectChanges();

      const plot = fixture.nativeElement.querySelector('app-section-plot');
      expect(plot).toBeTruthy();
    });

    it('should not show section-plot when loading', () => {
      mockPlotService.loading.set(true);
      fixture.detectChanges();

      const plot = fixture.nativeElement.querySelector('app-section-plot');
      expect(plot).toBeFalsy();
    });

    it('should not show section-plot when error is set', () => {
      mockPlotService.loading.set(false);
      mockPlotService.error.set(TaskError.CALCULATION_ERROR);
      fixture.detectChanges();

      const plot = fixture.nativeElement.querySelector('app-section-plot');
      expect(plot).toBeFalsy();
    });
  });
});
