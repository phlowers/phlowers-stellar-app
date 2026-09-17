import { animate, style, transition, trigger } from '@angular/animations';
import {
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
import { CUT_STRANDS_LAYER_COUNT, RrtsCutStrandsData, sumCutStrands } from '@shared/domain/models/section.model';
import { PythonDiagnostic } from '@core/services/worker_python/tasks/python-diagnostic.interfaces';
import { formatPythonError } from '@services/worker_python/tasks/python-error-messages';
import { SectionService } from '@services/section/section.service';
import { DISTANCE_MAX, STRAND_LAYER_KEYS } from './strand-rrts.constants';
import { cutStrandsControl, maxFinite } from './strand-rrts.helpers';

@Component({
  selector: 'app-strand-rrts',
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

  // Same source as the menu bar: the selected charge is tracked on the study's copy of the section
  readonly staffIsPresent = computed(() => {
    const section = this.spanService.section();
    const chargeUuid = this.plotService.study()?.sections.find((s) => s?.uuid === section?.uuid)?.selected_charge_uuid;
    return !!section?.charges?.find((c) => c.uuid === chargeUuid)?.personnelPresence;
  });

  private readonly cable = resource({
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

  // Cut strands damage the whole cable, so the new working load is always the max over all spans
  readonly newWorkLoad = computed(() => maxFinite(this.plotService.cutStrandsUtilizationRates()));

  readonly isCalculating = signal(false);
  readonly isSaving = signal(false);
  readonly isSaved = computed(() => !!this.selectedEntry());

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

    // Load the selected entry's inputs; without a span, the reference support and its distance are ignored
    effect(() => {
      const hasSpan = !!this.selectedSpan();
      const key = this.selectedKey();
      const entry = this.selectedEntry();
      const layers = this.layers();
      untracked(() => {
        const { supportRef, distanceSupportRef } = this.form.controls;
        if (hasSpan) {
          supportRef.enable();
          distanceSupportRef.enable();
        } else {
          supportRef.disable();
          distanceSupportRef.disable();
        }
        supportRef.setValue(entry?.supportRef ?? (hasSpan ? 'LEFT' : null));
        distanceSupportRef.setValue(entry?.distanceSupportRef ?? 0);
        layers.forEach(({ layer, control }) => control.setValue(entry?.cutStrands[layer - 1] ?? 0));

        // Leaving an unsaved calculation: put the engine back to the saved damage
        if (this.pending() && this.pending()?.uuid !== key) {
          this.pending.set(null);
          void this.applySavedCutStrands();
        }
      });
    });
  }

  getError(control: AbstractControl): string {
    if (control.errors?.['required']) return this.translocoService.translate('common.required');
    const numberError = getNumberInputErrorParams(control);
    return numberError ? this.translocoService.translate(numberError.key, numberError.params) : '';
  }

  async calculate(): Promise<void> {
    this.isCalculating.set(true);
    try {
      await this.runCalculation();
    } finally {
      this.isCalculating.set(false);
    }
  }

  // Calculate, then save the form as it was calculated. The section holds a single entry: any other one is replaced.
  async save(): Promise<void> {
    const study = this.plotService.study();
    if (!study || !this.spanService.section()) return;

    this.isSaving.set(true);
    try {
      const entry = await this.runCalculation();
      // Read after calculating: the section may have changed meanwhile
      const section = this.spanService.section();
      if (!entry || !section) return;

      const erased = this.otherEntries(entry.span?.uuid ?? null).filter((e) => !this.keptEntries().includes(e));
      const updated = { ...section, rrts_cut_strands: [...this.keptEntries(), entry] };
      try {
        await this.sectionService.createOrUpdateSection(study, updated);
      } catch {
        this.notificationService.error(this.translocoService.translate('studio.rrts-cut-strands.failed-to-save'));
        return;
      }
      this.spanService.section.set(updated);
      this.pending.set(null);
      this.notificationService.success(this.translocoService.translate('studio.rrts-cut-strands.saved'));
      erased.forEach((e) => this.notificationService.warning(this.erasedMessage(e)));
    } finally {
      this.isSaving.set(false);
    }
  }

  // Apply the form's cut strands to the whole cable; returns the entry they were calculated from, or null on failure
  private async runCalculation(): Promise<RrtsCutStrandsData | null> {
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

  private erasedMessage({ span }: RrtsCutStrandsData): string {
    if (!span) return this.translocoService.translate('studio.rrts-cut-strands.section-change-erased');
    const label =
      this.spanService.getSpanOptionsWithIndex().find(({ value }) => value?.uuid === span.uuid)?.label ??
      String(span.index + 1);
    return this.translocoService.translate('studio.rrts-cut-strands.span-change-erased', { span: label });
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
      this.notificationService.error(this.translocoService.translate('studio.rrts-cut-strands.failed-to-delete'));
      return;
    }
    this.pending.set(null);
    const diagnostics = await this.applySavedCutStrands();
    if (diagnostics) {
      this.notifyError(diagnostics);
      return;
    }
    this.notificationService.success(this.translocoService.translate('studio.rrts-cut-strands.deleted'));
  }

  private otherEntries(uuid: string | null): RrtsCutStrandsData[] {
    return this.savedEntries().filter(({ span }) => (span?.uuid ?? null) !== uuid);
  }

  // Saved entries kept alongside a new one. A single entry is allowed per section for now, so none are:
  // return otherEntries(<selected span uuid>) once several spans + section can be modified together.
  private keptEntries(): RrtsCutStrandsData[] {
    return [];
  }

  // Apply the total of the saved entries; without any, the cable is undamaged and there are no results
  private async applySavedCutStrands(): Promise<PythonDiagnostic[] | null> {
    const entries = this.savedEntries();
    const diagnostics = await this.plotService.applyCutStrands(sumCutStrands(entries));
    if (!entries.length) {
      this.plotService.rrts.set(null);
      this.plotService.cutStrandsUtilizationRates.set(null);
    }
    return diagnostics;
  }

  private notifyError(diagnostics: PythonDiagnostic[] = []): void {
    const exception = diagnostics.find((d) => d.origin === 'exception');
    this.notificationService.error(
      formatPythonError(exception?.code ?? null, this.translocoService, exception?.rawText) ??
        this.translocoService.translate('shared.studio.calculation-error')
    );
  }
}
