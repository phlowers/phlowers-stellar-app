import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, input, signal, WritableSignal } from '@angular/core';
import { StudioComponent } from './studio.component';
import { SectionPlotComponent } from './section/section-plot.component';
import { PlotService } from '@services/plot/plot.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { TaskError, DataError, GetSectionOutput, PythonErrorCode } from '@services/worker_python/tasks/types';
import { PythonDiagnostic } from '@services/worker_python/tasks/python-diagnostic.interfaces';
import { Section } from '@shared/domain';
import { formatStudioError } from './helpers/errors';
import { formatPythonError } from '@core/services/worker_python/tasks/python-error-messages';

// Stub child component to avoid pulling in its dependency tree
@Component({
  selector: 'app-section-plot',
  template: '',
  standalone: true
})
class SectionPlotStubComponent {
  litData = input<GetSectionOutput | null>();
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
  vtl_and_guying: undefined,
  cable_modifications: [],
  selected_cable_modification_uuid: null,
  cable_span_manipulations: [],
  selected_cable_span_manipulation_uuid: null,
  start_latitude: null,
  start_longitude: null,
  start_azimuth: null
};

const mockLitData: GetSectionOutput = {
  coords: {
    supports: [],
    insulators: [],
    spans: [],
    obstacles: null,
    distances: null,
    loads: {}
  },
  output_parameters: {
    line_angle: [],
    vtl_under_chain: [],
    vtl_under_console: [],
    r_under_chain: [],
    r_under_console: [],
    ground_altitude: [],
    load_angle: [],
    displacement: [],
    loads_coords: {},
    span_length: [],
    utilization_rate: [],
    elevation: [],
    parameter: [],
    tension_sup: [],
    tension_inf: [],
    L0: [],
    horizontal_distance: [],
    arc_length: [],
    T_h: [],
    slope_left: [],
    slope_right: [],
    sag: [],
    sag_s2: []
  }
};

describe('StudioComponent', () => {
  let component: StudioComponent;
  let fixture: ComponentFixture<StudioComponent>;
  let mockPlotService: {
    error: WritableSignal<TaskError | DataError | null>;
    diagnostics: WritableSignal<PythonDiagnostic[]>;
    litData: WritableSignal<GetSectionOutput | null>;
    loading: WritableSignal<boolean>;
    workerReady: WritableSignal<boolean>;
    refreshSection: ReturnType<typeof vi.fn>;
    initSectionStudio: ReturnType<typeof vi.fn>;
  };
  let mockNotificationService: { error: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };
  let mockSpanService: {
    section: WritableSignal<Section | null>;
  };

  beforeEach(async () => {
    mockPlotService = {
      error: signal<TaskError | DataError | null>(null),
      diagnostics: signal<PythonDiagnostic[]>([]),
      litData: signal<GetSectionOutput | null>(null),
      loading: signal<boolean>(false),
      workerReady: signal<boolean>(false),
      refreshSection: vi.fn(),
      initSectionStudio: vi.fn()
    };
    mockNotificationService = { error: vi.fn(), warning: vi.fn() };
    mockSpanService = {
      section: signal<Section | null>(null)
    };

    await TestBed.configureTestingModule({
      imports: [StudioComponent],
      providers: [
        { provide: PlotService, useValue: mockPlotService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: PlotSpanService, useValue: mockSpanService }
      ]
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

    it('should inject NotificationService', () => {
      expect(component['notificationService']).toBe(mockNotificationService);
    });

    it('should have isPreview input set to false', () => {
      expect(component.isPreview()).toBe(false);
    });
  });

  describe('Effect – error notification', () => {
    it('should not call notificationService.error when error is null', () => {
      mockPlotService.error.set(null);
      fixture.detectChanges();
      expect(mockNotificationService.error).not.toHaveBeenCalled();
    });

    it('should call notificationService.error with formatted message on CALCULATION_ERROR', () => {
      mockPlotService.error.set(TaskError.CALCULATION_ERROR);
      fixture.detectChanges();
      expect(mockNotificationService.error).toHaveBeenCalledWith(formatStudioError(TaskError.CALCULATION_ERROR));
    });

    it('should call notificationService.error with formatted message on NO_CABLE_FOUND', () => {
      mockPlotService.error.set(DataError.NO_CABLE_FOUND);
      fixture.detectChanges();
      expect(mockNotificationService.error).toHaveBeenCalledWith(formatStudioError(DataError.NO_CABLE_FOUND));
    });

    it('should call notificationService.error with formatted message on SOLVER_DID_NOT_CONVERGE', () => {
      mockPlotService.error.set(TaskError.SOLVER_DID_NOT_CONVERGE);
      fixture.detectChanges();
      expect(mockNotificationService.error).toHaveBeenCalledWith(formatStudioError(TaskError.SOLVER_DID_NOT_CONVERGE));
    });

    it('should call notificationService.error with formatted message on PYODIDE_LOAD_ERROR', () => {
      mockPlotService.error.set(TaskError.PYODIDE_LOAD_ERROR);
      fixture.detectChanges();
      expect(mockNotificationService.error).toHaveBeenCalledWith(formatStudioError(TaskError.PYODIDE_LOAD_ERROR));
    });

    it('should use pythonErrorCode message when a matching exception diagnostic is set', () => {
      mockPlotService.error.set(TaskError.CALCULATION_ERROR);
      mockPlotService.diagnostics.set([
        { code: PythonErrorCode.SolverError, severity: 'error', origin: 'exception', rawText: 'SolverError: boom' }
      ]);
      fixture.detectChanges();
      expect(mockNotificationService.error).toHaveBeenCalledWith(
        formatStudioError(TaskError.CALCULATION_ERROR, PythonErrorCode.SolverError)
      );
      expect(mockNotificationService.warning).not.toHaveBeenCalled();
    });

    it('should call notificationService.warning instead of error when the exception diagnostic is a warning (e.g. DataWarning)', () => {
      mockPlotService.error.set(TaskError.CALCULATION_ERROR);
      mockPlotService.diagnostics.set([
        { code: PythonErrorCode.DataWarning, severity: 'warning', origin: 'exception', rawText: 'DataWarning: boom' }
      ]);
      fixture.detectChanges();
      expect(mockNotificationService.warning).toHaveBeenCalledWith(
        formatStudioError(TaskError.CALCULATION_ERROR, PythonErrorCode.DataWarning)
      );
      expect(mockNotificationService.error).not.toHaveBeenCalled();
    });

    it('should call notificationService.warning for a BalanceEngineWarning exception diagnostic', () => {
      mockPlotService.error.set(TaskError.CALCULATION_ERROR);
      mockPlotService.diagnostics.set([
        {
          code: PythonErrorCode.BalanceEngineWarning,
          severity: 'warning',
          origin: 'exception',
          rawText: 'BalanceEngineWarning: boom'
        }
      ]);
      fixture.detectChanges();
      expect(mockNotificationService.warning).toHaveBeenCalledWith(
        formatStudioError(TaskError.CALCULATION_ERROR, PythonErrorCode.BalanceEngineWarning)
      );
      expect(mockNotificationService.error).not.toHaveBeenCalled();
    });
  });

  describe('Effect – warning notification', () => {
    it('should not call notificationService.warning when diagnostics is empty', () => {
      mockPlotService.diagnostics.set([]);
      fixture.detectChanges();
      expect(mockNotificationService.warning).not.toHaveBeenCalled();
    });

    it('should call notificationService.warning once for a captured warning diagnostic', () => {
      mockPlotService.diagnostics.set([
        { code: PythonErrorCode.UserWarning, severity: 'warning', origin: 'warning', rawText: 'UserWarning: boom' }
      ]);
      fixture.detectChanges();
      expect(mockNotificationService.warning).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.warning).toHaveBeenCalledWith(formatPythonError(PythonErrorCode.UserWarning));
    });

    it('should call notificationService.warning once per captured warning diagnostic', () => {
      mockPlotService.diagnostics.set([
        { code: PythonErrorCode.UserWarning, severity: 'warning', origin: 'warning', rawText: 'UserWarning: boom' },
        { code: PythonErrorCode.DataWarning, severity: 'warning', origin: 'warning', rawText: 'DataWarning: boom' }
      ]);
      fixture.detectChanges();
      expect(mockNotificationService.warning).toHaveBeenCalledTimes(2);
    });
  });

  describe('Effect – preview refresh', () => {
    it('should not call initSectionStudio when isPreview is false', () => {
      mockPlotService.workerReady.set(true);
      mockSpanService.section.set(mockSection);
      fixture.componentRef.setInput('isPreview', false);
      fixture.detectChanges();

      expect(mockPlotService.initSectionStudio).not.toHaveBeenCalled();
    });

    it('should not call initSectionStudio when worker is not ready', () => {
      mockPlotService.workerReady.set(false);
      mockSpanService.section.set(mockSection);
      fixture.componentRef.setInput('isPreview', true);
      fixture.detectChanges();

      expect(mockPlotService.initSectionStudio).not.toHaveBeenCalled();
    });

    it('should not call initSectionStudio when section is null', () => {
      mockPlotService.workerReady.set(true);
      mockSpanService.section.set(null);
      fixture.componentRef.setInput('isPreview', true);
      fixture.detectChanges();

      expect(mockPlotService.initSectionStudio).not.toHaveBeenCalled();
    });

    it('should call initSectionStudio when all conditions are met', () => {
      mockPlotService.workerReady.set(true);
      mockSpanService.section.set(mockSection);
      fixture.componentRef.setInput('isPreview', true);
      fixture.detectChanges();

      expect(mockPlotService.initSectionStudio).toHaveBeenCalledWith(mockSection);
    });

    it('should call initSectionStudio again when section changes', () => {
      mockPlotService.workerReady.set(true);
      mockSpanService.section.set(mockSection);
      fixture.componentRef.setInput('isPreview', true);
      fixture.detectChanges();

      mockPlotService.initSectionStudio.mockClear();

      const anotherSection = { ...mockSection, uuid: 'sec-2', name: 'Section 2' };
      mockSpanService.section.set(anotherSection);
      fixture.detectChanges();

      expect(mockPlotService.initSectionStudio).toHaveBeenCalledWith(anotherSection);
    });
  });

  describe('plotInitialized signal', () => {
    it('should start as false', () => {
      expect(component.plotInitialized()).toBe(false);
    });

    it('should become true when litData changes from null to a value', () => {
      expect(component.plotInitialized()).toBe(false);

      mockPlotService.litData.set(mockLitData);
      fixture.detectChanges();

      expect(component.plotInitialized()).toBe(true);
    });

    it('should remain true once set even if litData goes back to null', () => {
      mockPlotService.litData.set(mockLitData);
      fixture.detectChanges();
      expect(component.plotInitialized()).toBe(true);

      mockPlotService.litData.set(null);
      fixture.detectChanges();

      expect(component.plotInitialized()).toBe(true);
    });
  });

  describe('Template – loading state', () => {
    it('should show spinner when loading and not yet initialized', () => {
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

    it('should not show spinner when loading but already initialized', () => {
      mockPlotService.litData.set(mockLitData);
      fixture.detectChanges();
      expect(component.plotInitialized()).toBe(true);

      mockPlotService.loading.set(true);
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('p-progress-spinner');
      expect(spinner).toBeFalsy();
    });
  });

  describe('Template – error state', () => {
    it('should show rocket image when error is set', () => {
      mockPlotService.loading.set(false);
      mockPlotService.error.set(TaskError.CALCULATION_ERROR);
      fixture.detectChanges();

      const errorImg = fixture.nativeElement.querySelector('[data-testid="studio-error-image"]') as HTMLImageElement;
      expect(errorImg).toBeTruthy();
      expect(errorImg.tagName).toBe('IMG');
      expect(errorImg.src).toContain('rocket.webp');
    });

    it('should not show rocket image when no error', () => {
      mockPlotService.loading.set(false);
      mockPlotService.error.set(null);
      fixture.detectChanges();

      const errorImg = fixture.nativeElement.querySelector('[data-testid="studio-error-image"]');
      expect(errorImg).toBeFalsy();
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

  describe('ngOnDestroy', () => {
    it('should reset plotService.error to null on destroy', () => {
      mockPlotService.error.set(TaskError.CALCULATION_ERROR);
      fixture.detectChanges();

      fixture.destroy();

      expect(mockPlotService.error()).toBeNull();
    });
  });
});
