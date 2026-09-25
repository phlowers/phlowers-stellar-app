import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, TemplateRef, WritableSignal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { StrandRrtsComponent } from './strand-rrts.component';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { SectionService } from '@services/section/section.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskError } from '@services/worker_python/tasks/types';
import { ToolbarDialogService } from '../../services/toolbar-dialog.service';
import { Section } from '@shared/domain';
import { RrtsCutStrandsData } from '@shared/domain/models/section.model';

const ENGINE_RESULTS: Partial<Record<Task, unknown>> = {
  [Task.getRrts]: { rrts: 23114 },
  // One rate per support: the last support starts no span
  [Task.getUtilizationRate]: { utilizationRate: [30, 49.21, 12, Number.NaN] }
};

const engineAnswer = (task: Task, error: TaskError | null = null) => ({
  result: error ? null : (ENGINE_RESULTS[task] ?? { success: true }),
  error,
  diagnostics: []
});

function makeCutStrandsData(overrides: Partial<RrtsCutStrandsData> = {}): RrtsCutStrandsData {
  return {
    spanUuid: 's2',
    supportRef: 'RIGHT',
    distanceSupportRef: 12.5,
    cutStrands: [1, 3, 0, 0, 0, 0, 0, 0],
    addMarking: false,
    ...overrides
  };
}

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    uuid: 'section-uuid',
    cable_name: 'ASTER 570',
    supports: [{ uuid: 's1' }, { uuid: 's2' }, { uuid: 's3' }],
    charges: [],
    ...overrides
  } as unknown as Section;
}

describe('StrandRrtsComponent', () => {
  let component: StrandRrtsComponent;
  let fixture: ComponentFixture<StrandRrtsComponent>;
  let spanService: PlotSpanService;
  let studySignal: WritableSignal<unknown>;
  let litDataSignal: WritableSignal<object | null>;
  let mockCablesService: { getCable: ReturnType<typeof vi.fn> };
  let mockToolbarDialogService: { setTemplates: ReturnType<typeof vi.fn> };
  let mockSectionService: { createOrUpdateSection: ReturnType<typeof vi.fn> };
  let mockNotificationService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let mockWorkerPythonService: { runTask: ReturnType<typeof vi.fn> };
  let mockLogger: { error: ReturnType<typeof vi.fn> };

  const getByTestId = (testId: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

  const textOf = (testId: string): string | undefined => getByTestId(testId)?.textContent?.trim();

  // Header and footer are rendered by the toolbar dialog, not in the component view
  const renderTemplate = (template: TemplateRef<unknown> | undefined): HTMLElement => {
    const view = template!.createEmbeddedView(null);
    view.detectChanges();
    const container = document.createElement('div');
    container.append(...view.rootNodes);
    return container;
  };

  const createComponent = (section: Section | null) => {
    spanService.section.set(section);
    fixture = TestBed.createComponent(StrandRrtsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  // The engine mock answers at once: every answer is in once the pending promises have settled
  const waitForEngine = () => new Promise((resolve) => setTimeout(resolve));

  const setup = async (section: Section | null = makeSection()) => {
    createComponent(section);
    await fixture.whenStable();
    fixture.detectChanges();
    // A saved entry is calculated on opening
    await waitForEngine();
    fixture.detectChanges();
  };

  // Opened on a saved entry, without the engine calls of its opening calculation
  const setupSaved = async () => {
    await setup(makeSection({ rrts_cut_strands: makeCutStrandsData() }));
    mockWorkerPythonService.runTask.mockClear();
  };

  const typeIn = (testId: string, value: string): HTMLInputElement => {
    const input = getByTestId(testId) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    return input;
  };

  const footerButton = (testId: string): HTMLButtonElement =>
    renderTemplate(component.footerTemplate()).querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)!;

  const calculate = async () => {
    await component.calculate();
    fixture.detectChanges();
  };

  const failTask = (failing: Task) =>
    mockWorkerPythonService.runTask.mockImplementation((task: Task) =>
      Promise.resolve(engineAnswer(task, task === failing ? TaskError.CALCULATION_ERROR : null))
    );

  // Cut strands given to the engine, in call order
  const engineCutStrands = (): number[][] =>
    mockWorkerPythonService.runTask.mock.calls
      .filter(([task]) => task === Task.setCutStrands)
      .map(([, inputs]) => inputs.cutStrands);

  const savedSection = (): Section => mockSectionService.createOrUpdateSection.mock.calls.at(-1)?.[1];

  const getErrorMessage = (id: string): HTMLElement | null => fixture.nativeElement.querySelector(`#${id}`);

  beforeEach(async () => {
    studySignal = signal<unknown>({ uuid: 'study-uuid', sections: [] });
    litDataSignal = signal<object | null>({ output_parameters: { utilization_rate: [30, 45.26, 12] } });
    mockCablesService = {
      getCable: vi.fn().mockResolvedValue({ nb_strand_layer_1: 6, nb_strand_layer_2: 12, nb_strand_layer_3: 0 })
    };
    mockToolbarDialogService = { setTemplates: vi.fn() };
    mockSectionService = { createOrUpdateSection: vi.fn().mockResolvedValue({ removedGeometryBoundObjects: false }) };
    mockNotificationService = { success: vi.fn(), error: vi.fn() };
    mockLogger = { error: vi.fn() };
    mockWorkerPythonService = { runTask: vi.fn((task: Task) => Promise.resolve(engineAnswer(task))) };

    await TestBed.configureTestingModule({
      imports: [
        StrandRrtsComponent,
        NoopAnimationsModule,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              'common.yes': 'Yes',
              'common.no': 'No',
              'common.loading': 'Loading',
              'common.required': 'Required',
              'common.meter': 'm',
              'common.min-value-error': 'Min. value: {{ min }}',
              'common.max-value-error': 'Max. value: {{ max }}',
              'common.max-decimals-error': 'Max decimals: {{ maxDecimals }}',
              'studio.rrts-cut-strands.no-strand-layers': 'No strand layer data available for this cable',
              'studio.rrts-cut-strands.failed-to-calculate': 'Failed to calculate the RRTS',
              'studio.rrts-cut-strands.add-marking-label': 'Add a marking',
              'studio.rrts-cut-strands.saved': 'RRTS cut strands saved',
              'studio.rrts-cut-strands.failed-to-save': 'Failed to save RRTS cut strands',
              'studio.rrts-cut-strands.deleted': 'RRTS cut strands deleted',
              'studio.rrts-cut-strands.failed-to-delete': 'Failed to delete RRTS cut strands',
              'studio.rrts-cut-strands.failed-to-sync': 'Failed to update the studio with the RRTS cut strands',
              'studio.rrts-cut-strands.result-new-working-load-null': 'No new max working load',
              'studio.rrts-cut-strands.result-new-working-load-ok': 'The new max working load is satisfactory',
              'studio.rrts-cut-strands.result-new-working-load-warning': 'The new max working load is concerning',
              'studio.rrts-cut-strands.result-new-working-load-error': 'The new max working load is dangerous',
              'studio.rrts-cut-strands.result-new-working-load-unknown': 'The new max working load is unknown'
            }
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' }
        })
      ],
      providers: [
        { provide: PlotService, useValue: { study: studySignal, litData: litDataSignal } },
        { provide: CablesService, useValue: mockCablesService },
        { provide: ToolbarDialogService, useValue: mockToolbarDialogService },
        { provide: SectionService, useValue: mockSectionService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: WorkerPythonService, useValue: mockWorkerPythonService },
        { provide: LoggerService, useValue: mockLogger }
      ]
    }).compileComponents();

    spanService = TestBed.inject(PlotSpanService);
  });

  it('registers header and footer templates with toolbar dialog service on init', async () => {
    await setup();
    expect(mockToolbarDialogService.setTemplates).toHaveBeenCalledWith({
      header: component.headerTemplate(),
      footer: component.footerTemplate()
    });
  });

  describe('infos', () => {
    it('shows the cable name and the max working load over the section', async () => {
      await setup();
      expect(textOf('cable-name-value')).toBe('ASTER 570');
      expect(textOf('work-load-value')).toBe('45.3\u00a0%');
    });

    it('shows "-" without section nor plot data', async () => {
      litDataSignal.set(null);
      await setup(null);
      expect(textOf('cable-name-value')).toBe('-');
      expect(textOf('work-load-value')).toBe('-\u00a0%');
    });

    it('shows the staff presence of the charge selected on the study', async () => {
      await setup(makeSection({ charges: [{ uuid: 'charge-uuid', personnelPresence: true }] as Section['charges'] }));
      expect(textOf('staff-presence-value')).toBe('No');

      studySignal.set({
        uuid: 'study-uuid',
        sections: [{ uuid: 'section-uuid', selected_charge_uuid: 'charge-uuid' }]
      });
      fixture.detectChanges();
      expect(textOf('staff-presence-value')).toBe('Yes');
    });
  });

  describe('form', () => {
    it('offers the supports of the selected span as reference support', async () => {
      await setup();
      expect(component.supportOptions()).toEqual([]);

      component.form.controls.span.setValue({ index: 1, uuid: 's2' });
      expect(component.supportOptions()).toEqual([
        { label: '2', value: 'LEFT' },
        { label: '3', value: 'RIGHT' }
      ]);
    });

    it('adds a cut strands input for each cable layer with strands, next to its strand count', async () => {
      await setup();
      expect(mockCablesService.getCable).toHaveBeenCalledWith('ASTER 570');
      expect(textOf('rrts-cut-strands-layer1-max')).toBe('/ 6');
      expect(textOf('rrts-cut-strands-layer2-max')).toBe('/ 12');
      expect(getByTestId('rrts-cut-strands-layer3-input')).toBeNull();
      expect(getByTestId('rrts-no-layers')).toBeNull();
      expect(component.form.controls.cutStrands.getRawValue()).toEqual([0, 0]);
    });

    it('tells while the cable is loading', () => {
      mockCablesService.getCable.mockReturnValue(new Promise(() => undefined));
      createComponent(makeSection());
      expect(textOf('rrts-no-layers')).toBe('Loading');
    });

    it('tells when the cable has no strand layer data', async () => {
      mockCablesService.getCable.mockResolvedValue(undefined);
      await setup();
      expect(textOf('rrts-no-layers')).toBe('No strand layer data available for this cable');
      expect(component.form.controls.cutStrands).toHaveLength(0);
    });

    it('tells there is no strand layer data when the cable catalog cannot be read', async () => {
      mockCablesService.getCable.mockRejectedValue(new Error('catalog unavailable'));
      await setup();
      expect(textOf('rrts-no-layers')).toBe('No strand layer data available for this cable');
    });
  });

  describe('cut strands surface control', () => {
    it('requires each input, from 0 to the strand count of its layer, by whole steps', async () => {
      await setup();
      const input = getByTestId('rrts-cut-strands-layer2-input');
      expect(input?.hasAttribute('required')).toBe(true);
      expect(input?.getAttribute('min')).toBe('0');
      expect(input?.getAttribute('max')).toBe('12');
      expect(input?.getAttribute('step')).toBe('1');
    });

    it('shows no error on the default values', async () => {
      await setup();
      expect(component.form.valid).toBe(true);
      expect(getErrorMessage('cutStrandsLayer1-error')).toBeNull();
      expect(getErrorMessage('cutStrandsLayer2-error')).toBeNull();
      expect(getErrorMessage('distanceSupportRef-error')).toBeNull();
    });

    it.each([
      ['', 'required', 'Required'],
      ['-1', 'min', 'Min. value: 0'],
      ['13', 'max', 'Max. value: 12'],
      ['1.5', 'maxDecimals', 'Max decimals: 0']
    ])('rejects %j cut strands with a %s error as soon as it is typed', async (value, errorKey, message) => {
      await setup();
      const input = typeIn('rrts-cut-strands-layer2-input', value);
      expect(component.form.controls.cutStrands.at(1).hasError(errorKey)).toBe(true);
      expect(component.form.invalid).toBe(true);
      expect(getErrorMessage('cutStrandsLayer2-error')?.textContent?.trim()).toBe(message);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-errormessage')).toBe('cutStrandsLayer2-error');
    });

    it('accepts every cut strand of the layer', async () => {
      await setup();
      const input = typeIn('rrts-cut-strands-layer2-input', '12');
      expect(component.form.controls.cutStrands.at(1).value).toBe(12);
      expect(component.form.valid).toBe(true);
      expect(getErrorMessage('cutStrandsLayer2-error')).toBeNull();
      expect(input.getAttribute('aria-invalid')).toBeNull();
      expect(input.getAttribute('aria-errormessage')).toBeNull();
    });
  });

  describe('distance surface control', () => {
    // The distance is measured from the reference support of a span
    const setupWithSpan = async () => {
      await setup();
      component.form.controls.span.setValue({ index: 0, uuid: 's1' });
      fixture.detectChanges();
    };

    it('bounds the distance from 0 to 5000 m, to the centimeter', async () => {
      await setup();
      const input = getByTestId('rrts-distance-support-ref-input');
      expect(input?.getAttribute('min')).toBe('0');
      expect(input?.getAttribute('max')).toBe('5000');
      expect(input?.getAttribute('step')).toBe('0.01');
      expect(input?.closest('p-inputgroup')?.querySelector('p-inputgroup-addon')?.textContent?.trim()).toBe('m');
    });

    it.each([
      ['-0.5', 'min', 'Min. value: 0'],
      ['5000.01', 'max', 'Max. value: 5000'],
      ['12.345', 'maxDecimals', 'Max decimals: 2']
    ])('rejects a %j distance with a %s error as soon as it is typed', async (value, errorKey, message) => {
      await setupWithSpan();
      const input = typeIn('rrts-distance-support-ref-input', value);
      expect(component.form.controls.distanceSupportRef.hasError(errorKey)).toBe(true);
      expect(component.form.invalid).toBe(true);
      expect(getErrorMessage('distanceSupportRef-error')?.textContent?.trim()).toBe(message);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-errormessage')).toBe('distanceSupportRef-error');
    });

    it.each(['', '0', '12.34', '5000'])('accepts a %j distance', async (value) => {
      await setupWithSpan();
      const input = typeIn('rrts-distance-support-ref-input', value);
      expect(component.form.controls.distanceSupportRef.valid).toBe(true);
      expect(getErrorMessage('distanceSupportRef-error')).toBeNull();
      expect(input.getAttribute('aria-invalid')).toBeNull();
    });
  });

  describe('span dependent fields', () => {
    const getCheckbox = () => fixture.nativeElement.querySelector('#rrts-add-marking') as HTMLInputElement;

    const selectSpan = (span: { index: number; uuid: string } | null) => {
      component.form.controls.span.setValue(span);
      fixture.detectChanges();
    };

    const getDistanceInput = () => getByTestId('rrts-distance-support-ref-input') as HTMLInputElement;

    it('disables the reference support, the distance and the marking without span', async () => {
      await setup();
      const { supportRef, distanceSupportRef, addMarking } = component.form.controls;
      expect(supportRef.disabled).toBe(true);
      expect(supportRef.value).toBeNull();
      expect(distanceSupportRef.disabled).toBe(true);
      expect(distanceSupportRef.value).toBeNull();
      expect(getDistanceInput().disabled).toBe(true);
      expect(addMarking.disabled).toBe(true);
      expect(getCheckbox().disabled).toBe(true);
      expect(getCheckbox().checked).toBe(false);
      expect(fixture.nativeElement.querySelector('label[for="rrts-add-marking"]')?.textContent?.trim()).toBe(
        'Add a marking'
      );
    });

    it('enables them once a span is selected, with the left support as reference by default', async () => {
      await setup();
      selectSpan({ index: 0, uuid: 's1' });

      const { supportRef, distanceSupportRef, addMarking } = component.form.controls;
      expect(supportRef.enabled).toBe(true);
      expect(supportRef.value).toBe('LEFT');
      expect(distanceSupportRef.enabled).toBe(true);
      expect(getDistanceInput().disabled).toBe(false);
      expect(addMarking.enabled).toBe(true);
      expect(addMarking.value).toBe(false);
      expect(getCheckbox().disabled).toBe(false);
    });

    it('shows the left support in the reference support select once a span is selected', async () => {
      await setup();
      selectSpan({ index: 1, uuid: 's2' });
      const label = getByTestId('rrts-support-ref-select')?.querySelector('.p-select-label');
      expect(label?.textContent?.trim()).toBe('2');
    });

    it('keeps the chosen reference support when switching spans', async () => {
      await setup();
      selectSpan({ index: 0, uuid: 's1' });
      component.form.controls.supportRef.setValue('RIGHT');

      selectSpan({ index: 1, uuid: 's2' });
      expect(component.form.controls.supportRef.value).toBe('RIGHT');
    });

    it('clears and disables them again when the span is removed', async () => {
      await setup();
      selectSpan({ index: 0, uuid: 's1' });
      component.form.controls.supportRef.setValue('RIGHT');
      component.form.controls.distanceSupportRef.setValue(12.5);
      component.form.controls.addMarking.setValue(true);

      selectSpan(null);
      const { supportRef, distanceSupportRef, addMarking } = component.form.controls;
      expect(supportRef.disabled).toBe(true);
      expect(supportRef.value).toBeNull();
      expect(distanceSupportRef.disabled).toBe(true);
      expect(distanceSupportRef.value).toBeNull();
      expect(getDistanceInput().disabled).toBe(true);
      expect(addMarking.disabled).toBe(true);
      expect(addMarking.value).toBe(false);
      expect(getCheckbox().disabled).toBe(true);

      selectSpan({ index: 0, uuid: 's1' });
      expect(supportRef.value).toBe('LEFT');
    });
  });

  describe('calculation', () => {
    it('is only available on a valid form', async () => {
      await setup();
      expect((getByTestId('calculate-btn') as HTMLButtonElement).disabled).toBe(false);

      typeIn('rrts-cut-strands-layer2-input', '13');
      expect((getByTestId('calculate-btn') as HTMLButtonElement).disabled).toBe(true);
    });

    it('runs the engine with the cut strands of every catalog layer, then gives it the default ones back', async () => {
      await setup();
      typeIn('rrts-cut-strands-layer2-input', '4');
      await calculate();

      expect(mockWorkerPythonService.runTask.mock.calls).toEqual([
        [Task.setCutStrands, { cutStrands: [0, 4, 0, 0, 0, 0, 0, 0] }],
        [Task.getRrts, undefined],
        [Task.getUtilizationRate, undefined],
        [Task.setCutStrands, { cutStrands: [0, 0, 0, 0, 0, 0, 0, 0] }]
      ]);
    });

    it('gives the engine the saved cut strands back', async () => {
      await setupSaved();
      typeIn('rrts-cut-strands-layer1-input', '5');
      await calculate();

      expect(engineCutStrands()).toEqual([
        [5, 3, 0, 0, 0, 0, 0, 0],
        [1, 3, 0, 0, 0, 0, 0, 0]
      ]);
    });

    it('shows the RRTS and the max working load over the spans', async () => {
      await setup();
      await calculate();

      expect(component.results()).toEqual({ rrts: 23114, newWorkLoad: 49.21 });
      expect(getByTestId('results-rrts-value')).not.toBeNull();
    });

    it('runs on opening on a saved entry, whose results are not saved', async () => {
      await setup(makeSection({ rrts_cut_strands: makeCutStrandsData() }));

      expect(mockWorkerPythonService.runTask.mock.calls).toEqual([
        [Task.setCutStrands, { cutStrands: [1, 3, 0, 0, 0, 0, 0, 0] }],
        [Task.getRrts, undefined],
        [Task.getUtilizationRate, undefined],
        [Task.setCutStrands, { cutStrands: [1, 3, 0, 0, 0, 0, 0, 0] }]
      ]);
      expect(getByTestId('results-rrts-value')).not.toBeNull();
      expect(footerButton('save-btn').disabled).toBe(false);
    });

    it('does not run on opening without saved entry', async () => {
      await setup();
      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
    });

    it('does not run again when a save loads its entry back', async () => {
      await setupSaved();
      typeIn('rrts-cut-strands-layer1-input', '5');
      await calculate();
      await component.save();
      // Loads the saved entry back into the form
      fixture.detectChanges();
      await waitForEngine();

      expect(mockWorkerPythonService.runTask.mock.calls.filter(([task]) => task === Task.getRrts)).toHaveLength(1);
    });

    it.each([Task.setCutStrands, Task.getRrts, Task.getUtilizationRate])(
      'tells when %s fails, and drops the previous results',
      async (failingTask) => {
        await setupSaved();
        await calculate();
        failTask(failingTask);
        await calculate();

        expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to calculate the RRTS');
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to calculate the RRTS', expect.any(Error));
        expect(getByTestId('results-rrts-value')).toBeNull();
        expect(footerButton('save-btn').disabled).toBe(true);
        expect(engineCutStrands().at(-1)).toEqual([1, 3, 0, 0, 0, 0, 0, 0]);
      }
    );

    it('tells when the engine cannot get the saved cut strands back, and drops the results', async () => {
      await setup();
      mockWorkerPythonService.runTask.mockImplementation((task: Task, inputs?: { cutStrands: number[] }) =>
        Promise.resolve(
          engineAnswer(
            task,
            task === Task.setCutStrands && inputs?.cutStrands[0] === 0 ? TaskError.CALCULATION_ERROR : null
          )
        )
      );
      typeIn('rrts-cut-strands-layer1-input', '5');
      await calculate();

      expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to calculate the RRTS');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to calculate the RRTS', expect.any(Error));
      expect(component.results()).toBeNull();
    });

    it('tells when the engine does not answer', async () => {
      mockWorkerPythonService.runTask.mockRejectedValue(new Error('Task setCutStrands timed out'));
      await setup();
      await calculate();

      expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to calculate the RRTS');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to calculate the RRTS', expect.any(Error));
      expect(component.results()).toBeNull();
    });

    it('locks every action while calculating', async () => {
      await setupSaved();
      let answer!: () => void;
      mockWorkerPythonService.runTask.mockImplementationOnce(
        (task: Task) => new Promise((resolve) => (answer = () => resolve(engineAnswer(task))))
      );

      const calculation = component.calculate();
      fixture.detectChanges();
      const calculateButton = getByTestId('calculate-btn') as HTMLButtonElement;
      expect(calculateButton.disabled).toBe(true);
      expect(calculateButton.classList).toContain('app-btn-loading');
      expect(footerButton('delete-btn').disabled).toBe(true);
      await component.delete();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();

      answer();
      await calculation;
      fixture.detectChanges();
      expect(calculateButton.disabled).toBe(false);
      expect(footerButton('delete-btn').disabled).toBe(false);
    });
  });

  describe('save', () => {
    it('is only available once calculated', async () => {
      await setup();
      expect(footerButton('save-btn').disabled).toBe(true);

      await calculate();
      expect(footerButton('save-btn').disabled).toBe(false);
    });

    it('is unavailable while the inputs differ from the calculated ones', async () => {
      await setup();
      await calculate();

      typeIn('rrts-cut-strands-layer1-input', '2');
      expect(footerButton('save-btn').disabled).toBe(true);

      typeIn('rrts-cut-strands-layer1-input', '0');
      expect(footerButton('save-btn').disabled).toBe(false);

      typeIn('rrts-cut-strands-layer1-input', '2');
      await calculate();
      expect(footerButton('save-btn').disabled).toBe(false);
    });

    it('does nothing without an up to date calculation', async () => {
      await setup();
      await component.save();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });

    it('links the entry to the whole section when no span is selected', async () => {
      await setup();
      typeIn('rrts-cut-strands-layer2-input', '4');
      await calculate();
      await component.save();

      expect(savedSection().rrts_cut_strands).toEqual(
        makeCutStrandsData({
          spanUuid: null,
          supportRef: null,
          distanceSupportRef: null,
          cutStrands: [0, 4, 0, 0, 0, 0, 0, 0]
        })
      );
      expect(mockNotificationService.success).toHaveBeenCalledWith('RRTS cut strands saved');
    });

    it('saves neither reference support, distance nor marking once the span is removed', async () => {
      await setup();
      component.form.controls.span.setValue({ index: 0, uuid: 's1' });
      component.form.controls.supportRef.setValue('RIGHT');
      component.form.controls.distanceSupportRef.setValue(12.5);
      component.form.controls.addMarking.setValue(true);
      component.form.controls.span.setValue(null);
      await calculate();
      await component.save();

      expect(savedSection().rrts_cut_strands).toMatchObject({
        spanUuid: null,
        supportRef: null,
        distanceSupportRef: null,
        addMarking: false
      });
    });

    it('replaces the saved entry with one linked to the selected span', async () => {
      await setupSaved();
      component.form.controls.span.setValue({ index: 0, uuid: 's1' });
      typeIn('rrts-cut-strands-layer1-input', '5');
      await calculate();
      await component.save();

      const saved = makeCutStrandsData({ spanUuid: 's1', cutStrands: [5, 3, 0, 0, 0, 0, 0, 0] });
      expect(savedSection().rrts_cut_strands).toEqual(saved);
      expect(spanService.section()?.rrts_cut_strands).toEqual(saved);
    });

    it('gives the engine the newly saved cut strands', async () => {
      await setupSaved();
      typeIn('rrts-cut-strands-layer1-input', '5');
      await calculate();
      await component.save();

      expect(engineCutStrands().at(-1)).toEqual([5, 3, 0, 0, 0, 0, 0, 0]);
    });

    it('keeps the saved entry, and tells the studio is not updated, when the engine rejects it', async () => {
      await setup();
      typeIn('rrts-cut-strands-layer1-input', '5');
      await calculate();
      failTask(Task.setCutStrands);
      await component.save();

      expect(spanService.section()?.rrts_cut_strands).toMatchObject({ cutStrands: [5, 0, 0, 0, 0, 0, 0, 0] });
      expect(mockNotificationService.success).toHaveBeenCalledWith('RRTS cut strands saved');
      expect(mockNotificationService.error).toHaveBeenCalledWith(
        'Failed to update the studio with the RRTS cut strands'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update the studio with the RRTS cut strands',
        expect.any(Error)
      );
      expect(mockNotificationService.error).not.toHaveBeenCalledWith('Failed to save RRTS cut strands');
    });

    it('keeps the section, and the engine on the saved cut strands, when saving fails', async () => {
      mockSectionService.createOrUpdateSection.mockRejectedValue(new Error('db'));
      await setup();
      typeIn('rrts-cut-strands-layer1-input', '5');
      await calculate();
      await component.save();

      expect(spanService.section()?.rrts_cut_strands).toBeUndefined();
      expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to save RRTS cut strands');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to save RRTS cut strands', new Error('db'));
      expect(engineCutStrands()).toEqual([
        [5, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0]
      ]);
    });
  });

  describe('delete', () => {
    it('is only available on a saved entry', async () => {
      await setup();
      expect(footerButton('delete-btn').disabled).toBe(true);
      await component.delete();
      expect(mockSectionService.createOrUpdateSection).not.toHaveBeenCalled();
    });

    it('drops the saved entry', async () => {
      await setupSaved();
      expect(footerButton('delete-btn').disabled).toBe(false);

      await component.delete();
      fixture.detectChanges();

      expect(savedSection().rrts_cut_strands).toBeNull();
      expect(spanService.section()?.rrts_cut_strands).toBeNull();
      expect(mockNotificationService.success).toHaveBeenCalledWith('RRTS cut strands deleted');
      expect(footerButton('delete-btn').disabled).toBe(true);
      expect(engineCutStrands()).toEqual([[0, 0, 0, 0, 0, 0, 0, 0]]);
    });

    it('keeps the entry deleted, and tells the studio is not updated, when the engine rejects the default cut strands', async () => {
      await setupSaved();
      failTask(Task.setCutStrands);
      await component.delete();

      expect(spanService.section()?.rrts_cut_strands).toBeNull();
      expect(mockNotificationService.success).toHaveBeenCalledWith('RRTS cut strands deleted');
      expect(mockNotificationService.error).toHaveBeenCalledWith(
        'Failed to update the studio with the RRTS cut strands'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update the studio with the RRTS cut strands',
        expect.any(Error)
      );
      expect(mockNotificationService.error).not.toHaveBeenCalledWith('Failed to delete RRTS cut strands');
    });

    it('keeps the entry, and the engine untouched, when deleting fails', async () => {
      mockSectionService.createOrUpdateSection.mockRejectedValue(new Error('db'));
      await setupSaved();
      await component.delete();

      expect(spanService.section()?.rrts_cut_strands).toEqual(makeCutStrandsData());
      expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to delete RRTS cut strands');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete RRTS cut strands', new Error('db'));
      expect(mockWorkerPythonService.runTask).not.toHaveBeenCalled();
    });
  });

  it('loads the saved entry into the form', async () => {
    await setup(makeSection({ rrts_cut_strands: makeCutStrandsData({ addMarking: true }) }));
    expect(component.form.getRawValue()).toEqual({
      span: { index: 1, uuid: 's2' },
      supportRef: 'RIGHT',
      distanceSupportRef: 12.5,
      cutStrands: [1, 3],
      addMarking: true
    });
    expect(component.form.controls.supportRef.enabled).toBe(true);
    expect(component.form.controls.addMarking.enabled).toBe(true);
    expect(component.supportOptions()).toHaveLength(2);
  });

  it('loads a saved span entry without reference support with the left support by default', async () => {
    await setup(makeSection({ rrts_cut_strands: makeCutStrandsData({ supportRef: null }) }));
    expect(component.form.controls.supportRef.enabled).toBe(true);
    expect(component.form.controls.supportRef.value).toBe('LEFT');
  });

  it('loads a saved entry of the whole section with the span dependent fields disabled', async () => {
    await setup(
      makeSection({
        rrts_cut_strands: makeCutStrandsData({ spanUuid: null, supportRef: null, distanceSupportRef: null })
      })
    );
    expect(component.form.controls.span.value).toBeNull();
    expect(component.form.controls.supportRef.disabled).toBe(true);
    expect(component.form.controls.distanceSupportRef.disabled).toBe(true);
    expect(component.form.controls.addMarking.disabled).toBe(true);
  });

  describe('results', () => {
    const showResults = (newWorkLoad: number | null) => {
      component.results.set({ rrts: 23114, newWorkLoad });
      fixture.detectChanges();
    };

    const newWorkLoadText = () => getByTestId('results-load-value')?.querySelector('span')?.textContent;

    it('only shows the results once there are some', async () => {
      await setup();
      expect(getByTestId('results-rrts-value')).toBeNull();

      showResults(49.21);
      expect(textOf('results-rrts-value')).toBe('23,114\u00a0daN');
      expect(newWorkLoadText()).toBe('49.2\u00a0%');
    });

    it('announces them in a live region kept on the page, empty without results', async () => {
      await setup();
      const liveRegion = getByTestId('results');
      expect(liveRegion?.tagName).toBe('OUTPUT');
      expect(liveRegion?.textContent?.trim()).toBe('');

      showResults(49.21);
      expect(getByTestId('results')).toBe(liveRegion);
      expect(liveRegion?.contains(getByTestId('results-rrts-value'))).toBe(true);

      component.results.set(null);
      fixture.detectChanges();
      expect(getByTestId('results')).toBe(liveRegion);
      expect(liveRegion?.textContent?.trim()).toBe('');
    });

    it('shows "-" without new max working load', async () => {
      await setup();
      showResults(null);
      expect(newWorkLoadText()).toBe('-\u00a0%');
    });

    it.each([
      [null, 'null', 'counter_0', 'No new max working load'],
      [49.2, 'ok', 'check', 'The new max working load is satisfactory'],
      [80, 'warning', 'exclamation', 'The new max working load is concerning'],
      [120, 'error', 'close_small', 'The new max working load is dangerous'],
      [Number.NaN, 'unknown', 'question_mark', 'The new max working load is unknown']
    ])('flags a %s new max working load as %s', async (newWorkLoad, status, iconName, label) => {
      await setup();
      showResults(newWorkLoad);
      const icon = getByTestId('results-load-icon');
      expect(icon?.classList).toContain('results-load-icon');
      expect(icon?.classList).toContain(`results-load-icon--${status}`);
      expect(icon?.textContent?.trim()).toBe(iconName);
      expect(icon?.getAttribute('aria-label')).toBe(label);
    });

    it('updates the same icon when the new max working load changes', async () => {
      await setup();
      showResults(49.2);
      const icon = getByTestId('results-load-icon');

      showResults(120);
      expect(getByTestId('results-load-icon')).toBe(icon);
      expect(icon?.classList).toContain('results-load-icon--error');
      expect(icon?.classList).not.toContain('results-load-icon--ok');
      expect(icon?.textContent?.trim()).toBe('close_small');
    });
  });
});
