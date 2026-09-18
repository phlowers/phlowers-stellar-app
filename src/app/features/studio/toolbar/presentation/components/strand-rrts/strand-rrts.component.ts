import { animate, style, transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  resource,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  WritableSignal
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SelectModule } from 'primeng/select';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { maxDecimalsValidator } from '@shared/helpers/numberValidators';
import { getNumberInputErrorParams } from '@shared/helpers/formErrors.helpers';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { CablesService } from '@shared/catalog/services/cables.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { RrtsCutStrandsData } from '@shared/domain/models/section.model';
import { CUT_STRANDS_LAYER_COUNT, sumCutStrands } from '@shared/domain/helpers/sections.helpers';
import { PythonDiagnostic } from '@core/services/worker_python/tasks/python-diagnostic.interfaces';
import { formatDiagnosticsError } from '@services/worker_python/tasks/python-error-messages';
import { SectionService } from '@services/section/section.service';
import { DISTANCE_MAX, STRAND_LAYER_KEYS } from './strand-rrts.constantes';
import { cutStrandsControl, hasStaffPresence, maxFinite } from './strand-rrts.helpers';
import { NotificationKey } from './strand-rrts.interfaces';

@Component({
  selector: 'app-strand-rrts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconComponent,
    TranslocoModule,
    ButtonComponent,
    ReactiveFormsModule,
    SelectModule,
    InputTextModule,
    MessageModule,
    InputGroupModule,
    InputGroupAddonModule,
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
  private readonly translocoService = inject(TranslocoService);
  private readonly cablesService = inject(CablesService);
  private readonly notificationService = inject(NotificationService);
  private readonly sectionService = inject(SectionService);
  readonly spanService = inject(PlotSpanService);

  readonly DISTANCE_MAX = DISTANCE_MAX;

  // Span, support and distance are optional: they only locate the damage (studio marker), results cover the whole cable
  readonly form = new FormGroup({
    span: new FormControl<{ index: number; uuid: string } | null>(null),
    supportRef: new FormControl<'LEFT' | 'RIGHT' | null>({ value: null, disabled: true }),
    distanceSupportRef: new FormControl<number | null>({ value: 0, disabled: true }, [
      Validators.min(0),
      Validators.max(DISTANCE_MAX),
      maxDecimalsValidator(2)
    ]),
    cutStrands: new FormArray<FormControl<number>>([])
  });

  readonly cableName = computed(() => this.spanService.section()?.cable_name ?? null);

  readonly staffIsPresent = computed(() => hasStaffPresence(this.plotService.study(), this.spanService.section()));

  readonly cable = resource({
    params: () => this.cableName() ?? undefined,
    loader: ({ params }) => this.cablesService.getCable(params)
  });

  // One entry per cable layer with strands; its strand count bounds the cut strands input
  readonly layers = computed(() => {
    const cable = this.cable.value();
    if (!cable) return [];
    return STRAND_LAYER_KEYS.map((key, i) => ({ layer: i + 1, max: cable[key] ?? 0 }))
      .filter(({ max }) => max > 0)
      .map((layer) => ({ ...layer, control: cutStrandsControl(layer.max) }));
  });
  // Without strand layers (cable loading, unknown, failed or without strand data) the empty form would be valid
  readonly hasLayers = computed(() => this.layers().length > 0);

  private readonly selectedSpan = toSignal(this.form.controls.span.valueChanges, { initialValue: null });

  readonly supportOptions = computed(() => this.spanService.getSupportOptions(this.selectedSpan()?.uuid ?? null));

  // Saved entries, keyed by span (none = whole section). A single one is kept for now, see keptEntries()
  private readonly savedEntries = computed(() => this.spanService.section()?.rrts_cut_strands ?? []);
  private readonly selectedKey = computed(() => this.selectedSpan()?.uuid ?? null);
  private readonly selectedEntry = computed(
    () => this.savedEntries().find(({ span }) => (span?.uuid ?? null) === this.selectedKey()) ?? null
  );

  // Max load of the undamaged cable; before any cut strands are applied, the plot data is undamaged too
  readonly workLoad = computed(() =>
    maxFinite(this.plotService.baseUtilizationRates() ?? this.plotService.litData()?.output_parameters.utilization_rate)
  );

  // Results live in the plot service: they are engine state, recomputed on studio init, not persisted
  readonly rrts = this.plotService.rrts;
  // Span key of a calculation applied to the engine but not saved yet
  private readonly pending = signal<{ uuid: string | null } | null>(null);
  // Settles once every running calculation or save has: an unsaved calculation is only known after it
  private settled: Promise<unknown> = Promise.resolve();

  // Cut strands damage the whole cable, so the new working load is always the max over all spans
  readonly newWorkLoad = computed(() => maxFinite(this.plotService.cutStrandsUtilizationRates()));

  readonly isCalculating = signal(false);
  readonly isSaving = signal(false);
  readonly isSaved = computed(() => !!this.selectedEntry());

  constructor() {
    // The dialog destroys this component on close: an unsaved calculation must not outlive it
    inject(DestroyRef).onDestroy(() => {
      void this.settled.then(() => {
        if (this.pending()) void this.restoreSavedCutStrands();
      });
    });

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

    // Without a span, the reference support and its distance are ignored
    effect(() => {
      const hasSpan = !!this.selectedSpan();
      untracked(() => {
        const { supportRef, distanceSupportRef } = this.form.controls;
        [supportRef, distanceSupportRef].forEach((control) => (hasSpan ? control.enable() : control.disable()));
      });
    });

    // Load the selected entry's inputs
    effect(() => {
      const hasSpan = !!this.selectedSpan();
      const entry = this.selectedEntry();
      const layers = this.layers();
      untracked(() => {
        const { supportRef, distanceSupportRef } = this.form.controls;
        supportRef.setValue(entry?.supportRef ?? (hasSpan ? 'LEFT' : null));
        distanceSupportRef.setValue(entry?.distanceSupportRef ?? 0);
        layers.forEach(({ layer, control }) => control.setValue(entry?.cutStrands[layer - 1] ?? 0));
      });
    });

    // Leaving an unsaved calculation: put the engine back to the saved damage
    effect(() => {
      const key = this.selectedKey();
      untracked(() => {
        const pending = this.pending();
        if (pending && pending.uuid !== key) void this.restoreSavedCutStrands();
      });
    });
  }

  getError(control: AbstractControl): string {
    if (control.errors?.['required']) return this.translocoService.translate('common.required');
    const numberError = getNumberInputErrorParams(control);
    return numberError ? this.translocoService.translate(numberError.key, numberError.params) : '';
  }

  calculate(): Promise<void> {
    return this.run(this.isCalculating, () => this.runCalculation());
  }

  // Calculate, then save the form as it was calculated. The section holds a single entry: any other one is replaced.
  save(): Promise<void> {
    return this.run(this.isSaving, async () => {
      const study = this.plotService.study();
      if (!study || !this.spanService.section()) return;
      const entry = await this.runCalculation();
      // Read after calculating: the section may have changed meanwhile
      const section = this.spanService.section();
      if (!entry || !section) return;

      const updated = { ...section, rrts_cut_strands: [...this.keptEntries(), entry] };
      try {
        await this.sectionService.createOrUpdateSection(study, updated);
      } catch {
        this.notify('error', 'failed-to-save');
        return;
      }
      this.spanService.section.set(updated);
      this.pending.set(null);
      this.notify('success', 'saved');
    });
  }

  async delete(): Promise<void> {
    const study = this.plotService.study();
    const section = this.spanService.section();
    if (!study || !section || !this.selectedEntry()) return;

    const updated = { ...section, rrts_cut_strands: this.otherEntries(this.selectedKey()) };
    try {
      await this.sectionService.createOrUpdateSection(study, updated);
      this.spanService.section.set(updated);
    } catch {
      this.notify('error', 'failed-to-delete');
      return;
    }
    this.pending.set(null);
    const diagnostics = await this.plotService.restoreSavedCutStrands();
    if (diagnostics) {
      this.notifyError(diagnostics);
      return;
    }
    this.notify('success', 'deleted');
  }

  // Flag the action as running while it runs, and hold the close cleanup until it settles
  private async run(busy: WritableSignal<boolean>, action: () => Promise<unknown>): Promise<void> {
    busy.set(true);
    const running = action();
    this.settled = Promise.allSettled([this.settled, running]);
    try {
      await running;
    } finally {
      busy.set(false);
    }
  }

  // Drop the unsaved calculation from the engine. Cleared upfront so a calculation queued meanwhile keeps its own pending
  private async restoreSavedCutStrands(): Promise<void> {
    const pending = this.pending();
    this.pending.set(null);
    let diagnostics: PythonDiagnostic[] | null;
    try {
      diagnostics = await this.plotService.restoreSavedCutStrands();
    } catch {
      diagnostics = [];
    }
    if (!diagnostics) return;
    // The engine still holds the unsaved calculation: keep it pending so the next span change or close retries
    if (!this.pending()) this.pending.set(pending);
    this.notifyError(diagnostics);
  }

  // Apply the form's cut strands to the whole cable; returns the entry they were calculated from, or null on failure
  private async runCalculation(): Promise<RrtsCutStrandsData | null> {
    if (!this.hasLayers()) return null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return null;
    }
    // Taken before calculating: a change made while the calculation runs must not be saved with its results
    const { span, supportRef, distanceSupportRef } = this.form.value;
    const cutStrands = new Array<number>(CUT_STRANDS_LAYER_COUNT).fill(0);
    this.layers().forEach(({ layer, control }) => (cutStrands[layer - 1] = control.value));
    try {
      // The whole cable carries this entry plus every other entry kept on save
      const diagnostics = await this.plotService.applyCutStrands(
        sumCutStrands([...this.keptEntries(), { cutStrands }])
      );
      if (diagnostics) {
        this.notifyError(diagnostics);
        return null;
      }
    } catch {
      this.notifyError();
      return null;
    }
    this.pending.set({ uuid: span?.uuid ?? null });
    // Results are not persisted: they are recomputed from these inputs on studio init
    return {
      span: span ?? null,
      supportRef: supportRef ?? null,
      distanceSupportRef: distanceSupportRef ?? null,
      cutStrands
    };
  }

  private otherEntries(uuid: string | null): RrtsCutStrandsData[] {
    return this.savedEntries().filter(({ span }) => (span?.uuid ?? null) !== uuid);
  }

  // Saved entries kept alongside a new one. A single entry is allowed per section for now, so none are:
  // return otherEntries(<selected span uuid>) once several spans + section can be modified together.
  private keptEntries(): RrtsCutStrandsData[] {
    return [];
  }

  private notify(kind: 'success' | 'error', key: NotificationKey): void {
    this.notificationService[kind](this.translocoService.translate(`studio.rrts-cut-strands.${key}`));
  }

  private notifyError(diagnostics: PythonDiagnostic[] = []): void {
    this.notificationService.error(formatDiagnosticsError(diagnostics, this.translocoService));
  }
}
