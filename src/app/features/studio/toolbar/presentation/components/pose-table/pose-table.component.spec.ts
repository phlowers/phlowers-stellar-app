import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PoseTableComponent } from './pose-table.component';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';
import { SectionService } from '@services/section/section.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { ToolbarDialogService } from '../../services/toolbar-dialog.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { Section } from '@shared/domain';
import { PoseTableData } from '@shared/domain/models/section.model';
import { InitialCondition } from '@shared/domain/models/initial-condition.model';

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    uuid: 'section-uuid',
    internal_id: 'SEC-001',
    name: 'Test Section',
    short_name: 'TS',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    type: 'phase',
    supports: [],
    obstacles: [],
    charges: [],
    field_measures: [],
    initial_conditions: [],
    selected_initial_condition_uuid: undefined,
    selected_charge_uuid: null,
    selected_field_measure_uuid: undefined,
    ...overrides
  } as Section;
}

function makeInitialCondition(overrides: Partial<InitialCondition> = {}): InitialCondition {
  return {
    uuid: 'ic-uuid',
    base_parameters: null,
    base_temperature: 15,
    ...overrides
  } as InitialCondition;
}

function makePoseResults() {
  return {
    temperatures: Array.from({ length: 8 }, () => -35),
    poseParams: Array.from({ length: 8 }, () => 2454),
    horizontalTensions: Array.from({ length: 8 }, () => 5636)
  };
}

describe('PoseTableComponent', () => {
  let component: PoseTableComponent;
  let fixture: ComponentFixture<PoseTableComponent>;

  let sectionSignal: WritableSignal<Section | null>;
  let studySignal: WritableSignal<unknown>;
  let mockSectionService: { createOrUpdateSection: ReturnType<typeof vi.fn> };
  let mockWorkerPythonService: { runTask: ReturnType<typeof vi.fn> };
  let mockToolbarDialogService: { setTemplates: ReturnType<typeof vi.fn> };
  let mockNotificationService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    sectionSignal = signal<Section | null>(null);
    studySignal = signal<unknown>(null);
    mockSectionService = { createOrUpdateSection: vi.fn().mockResolvedValue(undefined) };
    mockWorkerPythonService = {
      runTask: vi.fn().mockResolvedValue({ result: makePoseResults(), error: null, pythonErrorCode: null })
    };
    mockToolbarDialogService = { setTemplates: vi.fn() };
    mockNotificationService = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [PoseTableComponent, NoopAnimationsModule],
      providers: [
        { provide: PlotSpanService, useValue: { section: sectionSignal } },
        { provide: PlotService, useValue: { study: studySignal } },
        { provide: SectionService, useValue: mockSectionService },
        { provide: WorkerPythonService, useValue: mockWorkerPythonService },
        { provide: ToolbarDialogService, useValue: mockToolbarDialogService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PoseTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('registers header and footer templates with toolbar dialog service on init', () => {
    expect(mockToolbarDialogService.setTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ header: expect.anything(), footer: expect.anything() })
    );
  });

  // ─── Form initialization ──────────────────────────────────────────────────

  describe('form initialization', () => {
    it('has default lowestTemp of -10', () => {
      expect(component.form.controls.lowestTemp.value).toBe(component.LOWEST_TEMP_DEFAULT);
    });

    it('has default computingStep of 5', () => {
      expect(component.form.controls.computingStep.value).toBe(component.COMPUTING_STEP_DEFAULT);
    });

    it('is valid with default values', () => {
      expect(component.form.valid).toBe(true);
    });

    it('starts with no results', () => {
      expect(component.results()).toBeNull();
    });
  });

  // ─── Form validation – lowestTemp ─────────────────────────────────────────

  describe('lowestTemp validation', () => {
    it('is invalid when null', () => {
      component.form.controls.lowestTemp.setValue(null as unknown as number);
      expect(component.form.controls.lowestTemp.hasError('required')).toBe(true);
    });

    it('is invalid when below -50', () => {
      component.form.controls.lowestTemp.setValue(component.LOWEST_TEMP_MIN - 1);
      expect(component.form.controls.lowestTemp.hasError('min')).toBe(true);
    });

    it('is invalid when above 250', () => {
      component.form.controls.lowestTemp.setValue(component.LOWEST_TEMP_MAX + 1);
      expect(component.form.controls.lowestTemp.hasError('max')).toBe(true);
    });

    it('is valid at lower boundary -50', () => {
      component.form.controls.lowestTemp.setValue(component.LOWEST_TEMP_MIN);
      expect(component.form.controls.lowestTemp.valid).toBe(true);
    });

    it('is valid at upper boundary 250', () => {
      component.form.controls.lowestTemp.setValue(component.LOWEST_TEMP_MAX);
      expect(component.form.controls.lowestTemp.valid).toBe(true);
    });

    it('is invalid when value has more than 2 decimal places', () => {
      component.form.controls.lowestTemp.setValue(-10.123);
      expect(component.form.controls.lowestTemp.hasError('maxTwoDecimals')).toBe(true);
    });

    it('is valid when value has exactly 2 decimal places', () => {
      component.form.controls.lowestTemp.setValue(-10.12);
      expect(component.form.controls.lowestTemp.valid).toBe(true);
    });
  });

  // ─── Form validation – computingStep ──────────────────────────────────────

  describe('computingStep validation', () => {
    it('is invalid when null', () => {
      component.form.controls.computingStep.setValue(null as unknown as number);
      expect(component.form.controls.computingStep.hasError('required')).toBe(true);
    });

    it('is invalid when below 1', () => {
      component.form.controls.computingStep.setValue(component.COMPUTING_STEP_MIN - 1);
      expect(component.form.controls.computingStep.hasError('min')).toBe(true);
    });

    it('is invalid when above 10', () => {
      component.form.controls.computingStep.setValue(component.COMPUTING_STEP_MAX + 1);
      expect(component.form.controls.computingStep.hasError('max')).toBe(true);
    });

    it('is valid at lower boundary 1', () => {
      component.form.controls.computingStep.setValue(component.COMPUTING_STEP_MIN);
      expect(component.form.controls.computingStep.valid).toBe(true);
    });

    it('is valid at upper boundary 10', () => {
      component.form.controls.computingStep.setValue(component.COMPUTING_STEP_MAX);
      expect(component.form.controls.computingStep.valid).toBe(true);
    });

    it('is invalid when value is decimal', () => {
      component.form.controls.computingStep.setValue(3.5);
      expect(component.form.controls.computingStep.hasError('integer')).toBe(true);
    });

    it('is valid when value is a whole number', () => {
      component.form.controls.computingStep.setValue(3);
      expect(component.form.controls.computingStep.valid).toBe(true);
    });
  });

  // ─── getLowestTempError() ─────────────────────────────────────────────────

  describe('getLowestTempError()', () => {
    it('returns "Required" when value is null', () => {
      component.form.controls.lowestTemp.setValue(null as unknown as number);
      expect(component.getLowestTempError()).toBe('Required');
    });

    it('returns decimal error message when value has more than 2 decimal places', () => {
      component.form.controls.lowestTemp.setValue(-10.123);
      expect(component.getLowestTempError()).toBe('Maximum 2 decimal places');
    });

    it('returns min error message when value is too low', () => {
      component.form.controls.lowestTemp.setValue(component.LOWEST_TEMP_MIN - 1);
      expect(component.getLowestTempError()).toBe(`Minimum value: ${component.LOWEST_TEMP_MIN}°C`);
    });

    it('returns max error message when value is too high', () => {
      component.form.controls.lowestTemp.setValue(component.LOWEST_TEMP_MAX + 1);
      expect(component.getLowestTempError()).toBe(`Maximum value: ${component.LOWEST_TEMP_MAX}°C`);
    });

    it('returns empty string when control is valid', () => {
      component.form.controls.lowestTemp.setValue(20);
      expect(component.getLowestTempError()).toBe('');
    });
  });

  // ─── getComputingStepError() ──────────────────────────────────────────────

  describe('getComputingStepError()', () => {
    it('returns "Required" when value is null', () => {
      component.form.controls.computingStep.setValue(null as unknown as number);
      expect(component.getComputingStepError()).toBe('Required');
    });

    it('returns integer error message when value is decimal', () => {
      component.form.controls.computingStep.setValue(3.5);
      expect(component.getComputingStepError()).toBe('Value must be a whole number');
    });

    it('returns min error message when value is too low', () => {
      component.form.controls.computingStep.setValue(component.COMPUTING_STEP_MIN - 1);
      expect(component.getComputingStepError()).toBe(`Minimum value: ${component.COMPUTING_STEP_MIN}`);
    });

    it('returns max error message when value is too high', () => {
      component.form.controls.computingStep.setValue(component.COMPUTING_STEP_MAX + 1);
      expect(component.getComputingStepError()).toBe(`Maximum value: ${component.COMPUTING_STEP_MAX}`);
    });

    it('returns empty string when control is valid', () => {
      component.form.controls.computingStep.setValue(5);
      expect(component.getComputingStepError()).toBe('');
    });
  });

  // ─── calculate() ──────────────────────────────────────────────────────────

  describe('calculate()', () => {
    it('does nothing when form is invalid', async () => {
      component.form.controls.lowestTemp.setValue(null as unknown as number);
      await component.calculate();
      expect(component.results()).toBeNull();
    });

    it('sets results with 8 entries when form is valid', async () => {
      await component.calculate();
      const res = component.results();
      expect(res).not.toBeNull();
      expect(res!.temperatures).toHaveLength(8);
      expect(res!.poseParams).toHaveLength(8);
      expect(res!.horizontalTensions).toHaveLength(8);
    });

    it('fills temperatures with -35', async () => {
      await component.calculate();
      expect(component.results()!.temperatures.every((t) => t === -35)).toBe(true);
    });

    it('fills poseParams with 2454', async () => {
      await component.calculate();
      expect(component.results()!.poseParams.every((p) => p === 2454)).toBe(true);
    });

    it('fills tensions with 5636', async () => {
      await component.calculate();
      expect(component.results()!.horizontalTensions.every((t) => t === 5636)).toBe(true);
    });

    it('overwrites previous results on subsequent calls', async () => {
      component.results.set({ temperatures: [0], poseParams: [0], horizontalTensions: [0] });
      await component.calculate();
      expect(component.results()!.temperatures).toHaveLength(8);
    });
  });

  // ─── save() ───────────────────────────────────────────────────────────────

  describe('save()', () => {
    it('does not call service when study is null', async () => {
      sectionSignal.set(makeSection());
      await component.save();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });

    it('does not call service when section is null', async () => {
      studySignal.set({ uuid: 'study-uuid', sections: [] });
      await component.save();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });

    it('does not call service when form is invalid', async () => {
      studySignal.set({ uuid: 'study-uuid', sections: [] });
      sectionSignal.set(makeSection());
      component.form.controls.lowestTemp.setValue(null as unknown as number);
      await component.save();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });

    it('calls createOrUpdateSection with lowestTemp and computingStep only', async () => {
      const study = { uuid: 'study-uuid', sections: [] };
      const section = makeSection();

      studySignal.set(study);
      sectionSignal.set(section);
      component.form.setValue({ lowestTemp: -20, computingStep: 3 });

      await component.save();

      const expectedData: PoseTableData = { lowestTemp: -20, computingStep: 3 };
      expect(mockSectionService.createOrUpdateSection).toHaveBeenCalledWith(
        study,
        expect.objectContaining({ pose_table: expectedData })
      );
    });

    it('passes the current section data merged with pose_table', async () => {
      const study = { uuid: 'study-uuid', sections: [] };
      const section = makeSection({ uuid: 'my-section' });

      studySignal.set(study);
      sectionSignal.set(section);

      await component.save();

      const [, savedSection] = mockSectionService.createOrUpdateSection.mock.calls[0];
      expect(savedSection.uuid).toBe('my-section');
    });

    it('shows a success notification on successful save', async () => {
      studySignal.set({ uuid: 'study-uuid', sections: [] });
      sectionSignal.set(makeSection());

      await component.save();

      expect(mockNotificationService.success).toHaveBeenCalled();
      expect(mockNotificationService.error).not.toHaveBeenCalled();
    });

    it('shows an error notification when save throws', async () => {
      mockSectionService.createOrUpdateSection.mockRejectedValue(new Error('DB error'));
      studySignal.set({ uuid: 'study-uuid', sections: [] });
      sectionSignal.set(makeSection());

      await component.save();

      expect(mockNotificationService.error).toHaveBeenCalled();
      expect(mockNotificationService.success).not.toHaveBeenCalled();
    });
  });

  // ─── selectedInitialCondition ─────────────────────────────────────────────

  describe('selectedInitialCondition', () => {
    it('returns null when section signal is null', () => {
      expect(component.selectedInitialCondition()).toBeNull();
    });

    it('returns null when no IC matches the selected UUID', () => {
      sectionSignal.set(
        makeSection({
          initial_conditions: [makeInitialCondition({ uuid: 'ic-1' })],
          selected_initial_condition_uuid: 'ic-no-match'
        })
      );
      fixture.detectChanges();
      expect(component.selectedInitialCondition()).toBeNull();
    });

    it('returns null when selected_initial_condition_uuid is undefined', () => {
      sectionSignal.set(
        makeSection({
          initial_conditions: [makeInitialCondition({ uuid: 'ic-1' })],
          selected_initial_condition_uuid: undefined
        })
      );
      fixture.detectChanges();
      expect(component.selectedInitialCondition()).toBeNull();
    });

    it('returns the matching initial condition', () => {
      const ic = makeInitialCondition({ uuid: 'ic-1', base_parameters: 1234, base_temperature: 20 });
      sectionSignal.set(
        makeSection({
          initial_conditions: [ic],
          selected_initial_condition_uuid: 'ic-1'
        })
      );
      fixture.detectChanges();
      expect(component.selectedInitialCondition()).toEqual(ic);
    });
  });

  // ─── baseParam / baseTemp ────────────────────────────────────────────────

  describe('baseParam', () => {
    it('returns null when no section', () => {
      expect(component.baseParam()).toBeNull();
    });

    it('returns null when no IC is selected', () => {
      sectionSignal.set(makeSection({ initial_conditions: [], selected_initial_condition_uuid: undefined }));
      fixture.detectChanges();
      expect(component.baseParam()).toBeNull();
    });

    it('returns base_parameters of the selected IC', () => {
      const ic = makeInitialCondition({ uuid: 'ic-1', base_parameters: 1500 });
      sectionSignal.set(makeSection({ initial_conditions: [ic], selected_initial_condition_uuid: 'ic-1' }));
      fixture.detectChanges();
      expect(component.baseParam()).toBe(1500);
    });

    it('returns null when base_parameters is null', () => {
      const ic = makeInitialCondition({ uuid: 'ic-1', base_parameters: null });
      sectionSignal.set(makeSection({ initial_conditions: [ic], selected_initial_condition_uuid: 'ic-1' }));
      fixture.detectChanges();
      expect(component.baseParam()).toBeNull();
    });
  });

  describe('baseTemp', () => {
    it('returns null when no section', () => {
      expect(component.baseTemp()).toBeNull();
    });

    it('returns base_temperature of the selected IC', () => {
      const ic = makeInitialCondition({ uuid: 'ic-1', base_temperature: 25 });
      sectionSignal.set(makeSection({ initial_conditions: [ic], selected_initial_condition_uuid: 'ic-1' }));
      fixture.detectChanges();
      expect(component.baseTemp()).toBe(25);
    });
  });

  // ─── pose_table restoration effect ───────────────────────────────────────

  describe('pose_table restoration', () => {
    it('restores form values from saved pose_table when section changes', () => {
      const savedData: PoseTableData = { lowestTemp: -30, computingStep: 2 };
      sectionSignal.set(makeSection({ pose_table: savedData }));
      fixture.detectChanges();

      expect(component.form.controls.lowestTemp.value).toBe(-30);
      expect(component.form.controls.computingStep.value).toBe(2);
    });

    it('auto-triggers calculation when section has saved pose_table params', async () => {
      const savedData: PoseTableData = { lowestTemp: -30, computingStep: 2 };
      sectionSignal.set(makeSection({ pose_table: savedData }));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.results()).not.toBeNull();
    });

    it('does not change form or results when section has no pose_table', () => {
      sectionSignal.set(makeSection({ pose_table: undefined }));
      fixture.detectChanges();

      expect(component.form.controls.lowestTemp.value).toBe(component.LOWEST_TEMP_DEFAULT);
      expect(component.form.controls.computingStep.value).toBe(component.COMPUTING_STEP_DEFAULT);
      expect(component.results()).toBeNull();
    });

    it('resets form to defaults and clears results when switching to a section without pose_table', () => {
      const savedData: PoseTableData = { lowestTemp: -30, computingStep: 2 };
      sectionSignal.set(makeSection({ pose_table: savedData }));
      fixture.detectChanges();

      sectionSignal.set(makeSection({ pose_table: undefined }));
      fixture.detectChanges();

      expect(component.form.controls.lowestTemp.value).toBe(component.LOWEST_TEMP_DEFAULT);
      expect(component.form.controls.computingStep.value).toBe(component.COMPUTING_STEP_DEFAULT);
      expect(component.results()).toBeNull();
    });
  });
});
