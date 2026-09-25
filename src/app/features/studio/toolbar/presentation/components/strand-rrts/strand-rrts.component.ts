import { animate, style, transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
  TemplateRef,
  untracked,
  viewChild
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { isEqual } from 'lodash';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MessageModule } from 'primeng/message';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { SectionService } from '@services/section/section.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskInputs, TaskOutputs } from '@services/worker_python/tasks/types';
import { maxDecimalsValidator } from '@shared/helpers/numberValidators';
import { getNumberInputErrorParams } from '@shared/helpers/formErrors.helpers';
import { ToolbarDialogService } from '../../services/toolbar-dialog.service';
import { maxOf } from '../../services/section-state-report/section-state-report.helpers';
import { DEFAULT_CUT_STRANDS, DISTANCE_MAX, STRAND_LAYER_KEYS, WORK_LOAD_ICONS } from './strand-rrts.constantes';
import { getWorkLoadStatus, toCatalogCutStrands, toCutStrandsData } from './strand-rrts.helpers';
import { NotificationKey, RrtsFormValue, RrtsResults } from './strand-rrts.interfaces';

@Component({
  selector: 'app-strand-rrts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconComponent,
    TranslocoModule,
    ButtonComponent,
    ReactiveFormsModule,
    SelectModule,
    CheckboxModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    MessageModule,
    DecimalPipe
  ],
  templateUrl: './strand-rrts.component.html',
  styleUrl: './strand-rrts.component.scss',
  animations: [
    trigger('expand', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ])
    ])
  ]
})
export class StrandRrtsComponent {
  readonly headerTemplate = viewChild<TemplateRef<unknown>>('header');
  readonly footerTemplate = viewChild<TemplateRef<unknown>>('footer');

  private readonly toolbarDialogService = inject(ToolbarDialogService);
  private readonly plotService = inject(PlotService);
  private readonly cablesService = inject(CablesService);
  private readonly translocoService = inject(TranslocoService);
  private readonly sectionService = inject(SectionService);
  private readonly notificationService = inject(NotificationService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly logger = inject(LoggerService);
  readonly spanService = inject(PlotSpanService);

  readonly DISTANCE_MAX = DISTANCE_MAX;

  readonly form = new FormGroup({
    span: new FormControl<{ index: number; uuid: string } | null>(null),
    supportRef: new FormControl<'LEFT' | 'RIGHT' | null>({ value: null, disabled: true }),
    distanceSupportRef: new FormControl<number | null>({ value: null, disabled: true }, [
      Validators.min(0),
      Validators.max(DISTANCE_MAX),
      maxDecimalsValidator(2)
    ]),
    cutStrands: new FormArray<FormControl<number>>([]),
    addMarking: new FormControl({ value: false, disabled: true }, { nonNullable: true })
  });

  readonly cableName = computed(() => this.spanService.section()?.cable_name ?? null);

  // Max over the whole section, like the global stress rate under the studio plot
  readonly workLoad = computed(() => maxOf(this.plotService.litData()?.output_parameters.utilization_rate));

  // Same source as the menu bar: the selected charge is tracked on the study's copy of the section.
  // Without selected charge, staff is assumed present: the safest case
  readonly staffIsPresent = computed(() => {
    const section = this.spanService.section();
    const chargeUuid = this.plotService.study()?.sections.find((s) => s?.uuid === section?.uuid)?.selected_charge_uuid;
    return section?.charges?.find((c) => c.uuid === chargeUuid)?.personnelPresence ?? true;
  });

  readonly cable = resource({
    params: () => this.cableName() ?? undefined,
    loader: ({ params }) => this.cablesService.getCable(params)
  });

  // One entry per cable layer with strands; its strand count bounds the cut strands input
  readonly layers = computed(() => {
    if (!this.cable.hasValue()) return [];
    const cable = this.cable.value();
    return STRAND_LAYER_KEYS.map((key, i) => ({ layer: i + 1, strands: cable[key] ?? 0 }))
      .filter(({ strands }) => strands > 0)
      .map((layer) => ({
        ...layer,
        control: new FormControl<number>(DEFAULT_CUT_STRANDS, {
          nonNullable: true,
          validators: [Validators.required, Validators.min(0), Validators.max(layer.strands), maxDecimalsValidator(0)]
        })
      }));
  });
  readonly hasLayers = computed(() => this.layers().length > 0);

  private readonly selectedSpan = toSignal(this.form.controls.span.valueChanges, { initialValue: null });

  readonly supportOptions = computed(() => this.spanService.getSupportOptions(this.selectedSpan()?.uuid ?? null));

  // Set by the calculation
  readonly results = signal<RrtsResults | null>(null);

  // Form value the results were calculated from
  private readonly calculatedValue = signal<RrtsFormValue | null>(null);
  private readonly formValue = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue()
  });
  // Saving is only allowed while the inputs still match the results, so they never disagree
  readonly canSave = computed(() => {
    const calculatedValue = this.calculatedValue();
    return calculatedValue !== null && isEqual(calculatedValue, this.formValue());
  });

  // Deep equality: the section is reloaded after every save, only a content change matters
  private readonly savedEntry = computed(() => this.spanService.section()?.rrts_cut_strands ?? null, {
    equal: isEqual
  });
  readonly isSaved = computed(() => this.savedEntry() !== null);
  readonly isCalculating = signal(false);
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  // Each of them sets the engine cut strands: one at a time
  readonly isBusy = computed(() => this.isCalculating() || this.isSaving() || this.isDeleting());

  readonly newWorkLoadIcon = computed(() => {
    const status = getWorkLoadStatus(this.results()?.newWorkLoad ?? null);
    return { status, ...WORK_LOAD_ICONS[status] };
  });

  constructor() {
    effect(() => {
      const header = this.headerTemplate();
      const footer = this.footerTemplate();
      if (header && footer) {
        this.toolbarDialogService.setTemplates({ header, footer });
      }
    });

    effect(() => {
      const controls = this.layers().map(({ control }) => control);
      untracked(() => this.form.setControl('cutStrands', new FormArray(controls)));
    });

    // Without a span there is no reference support to measure a distance from, nor anywhere to draw the marking
    this.form.controls.span.valueChanges.pipe(takeUntilDestroyed()).subscribe((span) => {
      const { supportRef, distanceSupportRef, addMarking } = this.form.controls;
      if (!span) {
        supportRef.reset({ value: null, disabled: true });
        distanceSupportRef.reset({ value: null, disabled: true });
        addMarking.reset({ value: false, disabled: true });
        return;
      }
      if (supportRef.disabled) supportRef.enable();
      if (!supportRef.value) supportRef.setValue('LEFT');
      if (distanceSupportRef.disabled) distanceSupportRef.enable();
      if (addMarking.disabled) addMarking.enable();
    });

    // Load the saved entry into the form. Effects run in creation order: the cut strands controls are in the form
    effect(() => {
      const entry = this.savedEntry();
      const layers = this.layers();
      if (!entry) return;
      untracked(() => {
        const span =
          this.spanService.getSpanOptionsWithIndex().find(({ value }) => value?.uuid === entry.spanUuid)?.value ?? null;
        this.form.patchValue({
          supportRef: entry.supportRef,
          distanceSupportRef: entry.distanceSupportRef,
          addMarking: entry.addMarking
        });
        // Set last so the span rules (reference support default, disabled fields) apply to the saved values
        this.form.controls.span.setValue(span);
        layers.forEach(({ layer, control }) => control.setValue(entry.cutStrands[layer - 1] ?? DEFAULT_CUT_STRANDS));
        // Results are not saved: calculate them on opening, once the cut strands are loaded. Not after a save, which
        // reloads the entry it has just calculated
        if (layers.length && !this.calculatedValue()) void this.calculate();
      });
    });
  }

  async calculate(): Promise<void> {
    if (this.form.invalid || !this.hasLayers() || this.isBusy()) return;
    const value = this.form.getRawValue();
    const layers = this.layers().map(({ layer }) => layer);
    this.isCalculating.set(true);
    try {
      this.results.set(await this.calculateResults(toCatalogCutStrands(value.cutStrands, layers)));
      this.calculatedValue.set(value);
    } catch (error) {
      this.logger.error('Failed to calculate the RRTS', error);
      this.results.set(null);
      this.calculatedValue.set(null);
      this.notify('error', 'failed-to-calculate');
    } finally {
      this.isCalculating.set(false);
    }
  }

  // A single entry is kept per section: saving replaces the saved one
  async save(): Promise<void> {
    const study = this.plotService.study();
    const section = this.spanService.section();
    const calculatedValue = this.calculatedValue();
    if (!study || !section || !calculatedValue || !this.canSave() || this.isBusy()) return;

    const layers = this.layers().map(({ layer }) => layer);
    const updated = { ...section, rrts_cut_strands: toCutStrandsData(calculatedValue, layers) };
    this.isSaving.set(true);
    try {
      await this.sectionService.createOrUpdateSection(study, updated);
      this.spanService.section.set(updated);
      this.notify('success', 'saved');
      await this.syncSavedCutStrands();
    } catch (error) {
      this.logger.error('Failed to save RRTS cut strands', error);
      this.notify('error', 'failed-to-save');
    } finally {
      this.isSaving.set(false);
    }
  }

  async delete(): Promise<void> {
    const study = this.plotService.study();
    const section = this.spanService.section();
    if (!study || !section || !this.isSaved() || this.isBusy()) return;

    const updated = { ...section, rrts_cut_strands: null };
    this.isDeleting.set(true);
    try {
      await this.sectionService.createOrUpdateSection(study, updated);
      this.spanService.section.set(updated);
      this.notify('success', 'deleted');
      await this.syncSavedCutStrands();
    } catch (error) {
      this.logger.error('Failed to delete RRTS cut strands', error);
      this.notify('error', 'failed-to-delete');
    } finally {
      this.isDeleting.set(false);
    }
  }

  getError(control: AbstractControl): string {
    if (control.errors?.['required']) return this.translocoService.translate('common.required');
    const numberError = getNumberInputErrorParams(control);
    return numberError ? this.translocoService.translate(numberError.key, numberError.params) : '';
  }

  // The engine keeps the cut strands it is given: the saved ones go back once the results are read
  private async calculateResults(cutStrands: number[]): Promise<RrtsResults> {
    try {
      await this.runTask(Task.setCutStrands, { cutStrands });
      const { rrts } = await this.runTask(Task.getRrts, undefined);
      const { utilizationRate } = await this.runTask(Task.getUtilizationRate, undefined);
      // One rate per support: the last support starts no span, its rate is NaN
      return { rrts, newWorkLoad: maxOf(utilizationRate.filter(Number.isFinite)) };
    } finally {
      await this.applySavedCutStrands();
    }
  }

  // The engine holds the saved cut strands, the default ones without saved entry, so the studio shows the saved state
  private async applySavedCutStrands(): Promise<void> {
    const layers = this.layers().map(({ layer }) => layer);
    const cutStrands =
      this.savedEntry()?.cutStrands ??
      toCatalogCutStrands(
        layers.map(() => DEFAULT_CUT_STRANDS),
        layers
      );
    await this.runTask(Task.setCutStrands, { cutStrands });
  }

  // Runs once the entry is stored: an engine failure is reported apart from the save or delete
  private async syncSavedCutStrands(): Promise<void> {
    try {
      await this.applySavedCutStrands();
    } catch (error) {
      this.logger.error('Failed to update the studio with the RRTS cut strands', error);
      this.notify('error', 'failed-to-sync');
    }
  }

  // Engine errors come back with the task result: throw them to stop at the failing step
  private async runTask<T extends Task>(task: T, inputs: TaskInputs[T]): Promise<TaskOutputs[T]> {
    const { result, error } = await this.workerPythonService.runTask(task, inputs);
    if (error) throw new Error(error);
    return result;
  }

  private notify(kind: 'success' | 'error', key: NotificationKey): void {
    this.notificationService[kind](this.translocoService.translate(`studio.rrts-cut-strands.${key}`));
  }
}
