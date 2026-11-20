/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  OnDestroy
} from '@angular/core';
import { DecimalPipe, DOCUMENT } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, startWith } from 'rxjs';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MessageModule } from 'primeng/message';
import { OBSTACLE_CONFORMITY_CONFIG_KEY } from '@infrastructure/database';
import { Section } from '@shared/domain';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import type { ForestTrenchesInputs } from '@shared/domain/models/forest-trenches.model';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { StorageService } from '@services/storage/storage.service';
import { SectionService } from '@services/section/section.service';
import { TaskTimeoutError, WorkerPythonService } from '@services/worker_python/worker-python.service';
import { PythonDiagnostic } from '@services/worker_python/tasks/python-diagnostic.interfaces';
import { Task, TaskError, TaskInputs } from '@services/worker_python/tasks/types';
import { NotificationService } from '@services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { maxDecimalsValidator } from '@shared/helpers/numberValidators';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { formatStudioError } from '@shared/components/studio/helpers/errors';
import { CONFORMITY_BOUNDS } from '@features/studio/obstacles/presentation/components/conformity/conformity.constantes';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import {
  getEffectiveWindPressure,
  getElectricTensionLabel
} from '@features/studio/obstacles/presentation/components/conformity/conformity.helpers';
import {
  buildForestTrenchesRows,
  createForestTrenchesPlot,
  forestTrenchesXTickLabels,
  getForestTrenchesConfig,
  purgeForestTrenchesPlot,
  resizeForestTrenchesPlot,
  spansInInterval,
  toSliceGroundInput
} from './forest-trenches.helpers';
import { FOREST_TRENCHES_CALCULATION_TIMEOUT_MS, FOREST_TRENCHES_PLOT_ID } from './forest-trenches.constantes';
import { ForestTrenchesError } from './forest-trenches.errors';
import type {
  ForestTrenchesCatalogData,
  ForestTrenchesSelectOption,
  ForestTrenchesSpan
} from './forest-trenches.interfaces';

@Component({
  selector: 'app-forest-trenches',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    SelectModule,
    CheckboxModule,
    MultiSelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    MessageModule,
    ButtonComponent,
    IconComponent,
    DecimalPipe,
    TranslocoModule
  ],
  templateUrl: './forest-trenches.component.html',
  styleUrl: './forest-trenches.component.scss',
  host: { '[class.graph-enlarged]': 'isGraphEnlarged()' }
})
export class ForestTrenchesComponent implements OnDestroy {
  readonly BOUNDS = CONFORMITY_BOUNDS;
  readonly FOREST_TRENCHES_PLOT_ID = FOREST_TRENCHES_PLOT_ID;

  private readonly storageService = inject(StorageService);
  private readonly plotService = inject(PlotService);
  readonly spanService = inject(PlotSpanService);
  private readonly sectionService = inject(SectionService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);
  private readonly translocoService = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toolbarDialogService = inject(ToolbarDialogService);
  readonly headerTemplate = viewChild<TemplateRef<unknown>>('header');

  /** Gates the form's collapse/expand animation so it doesn't fire while the dialog opens. */
  readonly animationsReady = signal(false);
  private readonly enableAnimations = afterNextRender(() => this.animationsReady.set(true), {
    injector: this.injector
  });
  private missingConfigLogged = false;

  readonly form = new FormGroup({
    firstSupportUuid: new FormControl('', { nonNullable: true, validators: Validators.required }),
    lastSupportUuid: new FormControl('', { nonNullable: true, validators: Validators.required }),
    nPoints: new FormControl(2, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(2)]
    }),
    windZone: new FormControl('', { nonNullable: true, validators: Validators.required }),
    windMinus: new FormControl(false, { nonNullable: true }),
    redZonePresence: new FormControl(false, { nonNullable: true }),
    repartitionTemperature: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(CONFORMITY_BOUNDS.repartitionTemperature.min),
      Validators.max(CONFORMITY_BOUNDS.repartitionTemperature.max),
      maxDecimalsValidator(2)
    ]),
    lateralDistanceTemperature: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(CONFORMITY_BOUNDS.lateralDistanceTemperature.min),
      Validators.max(CONFORMITY_BOUNDS.lateralDistanceTemperature.max),
      maxDecimalsValidator(2)
    ]),
    selectedRules: new FormControl<string[]>([], {
      nonNullable: true,
      validators: Validators.required
    })
  });

  readonly spanControl = new FormControl<number | null>(null);
  readonly isCalculating = signal(false);
  readonly calculationError = signal<string | null>(null);
  readonly isGraphEnlarged = signal(false);
  private readonly resultsState = signal<ForestTrenchesSpan[]>([]);
  private readonly calculatedInputs = signal<ForestTrenchesInputs | null>(null);
  readonly results = this.resultsState.asReadonly();
  private readonly sectionUuid = signal<string | null>(null);
  private plotResizeObserver?: ResizeObserver;

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  private readonly formStatus = toSignal(this.form.statusChanges.pipe(startWith(this.form.status)), {
    initialValue: this.form.status
  });
  private readonly spanControlValue = toSignal(this.spanControl.valueChanges, {
    initialValue: this.spanControl.value
  });
  private readonly catalogData = toSignal<ForestTrenchesCatalogData | null>(from(this.loadCatalogData()), {
    initialValue: null
  });

  readonly supports = computed(() => this.spanService.section()?.supports ?? []);
  readonly supportOptions = computed<ForestTrenchesSelectOption<string>[]>(() =>
    this.supports().map((support, index) => ({
      label: this.supportLabel(index),
      value: support.uuid
    }))
  );
  readonly windZoneOptions = computed<ForestTrenchesSelectOption<string>[]>(() =>
    (this.catalogData()?.windZones ?? []).map((zone) => ({ label: zone.label, value: zone.label }))
  );
  readonly forestConfig = computed(() => getForestTrenchesConfig(this.catalogData()?.conformityConfig));
  readonly isConfigMissing = computed(() => this.catalogData() !== null && this.forestConfig() === null);
  readonly electricTensionLabel = computed(() => getElectricTensionLabel(this.spanService.section()?.voltage_idr));
  readonly nPointOptions = computed<ForestTrenchesSelectOption<number>[]>(() =>
    (this.forestConfig()?.nPointsChoices ?? []).map((count) => ({
      label: String(count),
      value: count
    }))
  );
  readonly ruleOptions = computed<ForestTrenchesSelectOption<string>[]>(() => {
    const config = this.forestConfig();
    const types = [...new Set([...(config?.overhangRules ?? []), ...(config?.lateralRules ?? [])])];
    const names = new Map((this.catalogData()?.ruleDefinitions ?? []).map((rule) => [rule.rule_type, rule.rule_name]));
    return types.map((value) => ({ label: names.get(value) ?? value, value }));
  });
  readonly lateralTemperatureRuleName = computed(() => {
    const ruleType = this.catalogData()?.conformityConfig?.lateral_temperature_rule_type;
    return this.catalogData()?.ruleDefinitions.find((rule) => rule.rule_type === ruleType)?.rule_name ?? null;
  });
  readonly lateralTemperatureHint = computed(
    () => this.catalogData()?.conformityConfig?.lateral_temperature_message ?? null
  );
  readonly effectiveWindPressure = computed(() =>
    getEffectiveWindPressure(
      this.catalogData()?.windZones ?? [],
      this.formValue().windZone,
      this.formValue().redZonePresence ?? false
    )
  );
  readonly canCalculate = computed(() => {
    if (this.formStatus() !== 'VALID' || !this.forestConfig()) return false;
    const section = this.spanService.section();
    const supports = section?.supports ?? [];
    const firstIndex = supports.findIndex((support) => support.uuid === this.formValue().firstSupportUuid);
    const lastIndex = supports.findIndex((support) => support.uuid === this.formValue().lastSupportUuid);
    return (
      !!section?.voltage_idr &&
      !!this.plotService.study() &&
      firstIndex >= 0 &&
      lastIndex > firstIndex &&
      this.effectiveWindPressure() !== null &&
      (this.formValue().selectedRules?.length ?? 0) > 0
    );
  });
  readonly selectedSpan = computed(() => {
    const spans = this.results();
    const selectedIndex = this.spanControlValue();
    return spans.find((span) => span.spanIndex === selectedIndex) ?? spans[0] ?? null;
  });
  private readonly selectedSpanPosition = computed(() => {
    const span = this.selectedSpan();
    return span ? this.results().indexOf(span) : -1;
  });
  readonly isPreviousSpanDisabled = computed(() => this.selectedSpanPosition() <= 0);
  readonly isNextSpanDisabled = computed(() => this.selectedSpanPosition() >= this.results().length - 1);
  readonly resultSpanOptions = computed<ForestTrenchesSelectOption<number>[]>(() =>
    this.results().map((span) => ({
      label: this.translocoService.translate('studio.forest-trenches.span-option', {
        firstSupport: this.supportLabel(span.spanIndex),
        lastSupport: this.supportLabel(span.spanIndex + 1)
      }),
      value: span.spanIndex
    }))
  );
  readonly xTickLabels = computed(() => {
    const span = this.selectedSpan();
    if (!span) return [];
    return forestTrenchesXTickLabels(
      this.supportLabel(span.spanIndex),
      this.supportLabel(span.spanIndex + 1),
      span.points.length
    );
  });
  readonly tableRows = computed(() => {
    const span = this.selectedSpan();
    const config = this.forestConfig();
    const values = this.calculatedInputs();
    if (!span || !config || !values) return [];
    return buildForestTrenchesRows(
      span,
      {
        selectedRules: values.selectedRules,
        lateralRules: config.lateralRules,
        overhangRules: config.overhangRules,
        ruleDefinitions: this.catalogData()?.ruleDefinitions ?? [],
        repartitionTemperature: values.repartitionTemperature,
        lateralDistanceTemperature: values.lateralDistanceTemperature
      },
      (key, params) => this.translocoService.translate(key, params)
    );
  });

  private readonly registerHeader = effect(() => {
    const header = this.headerTemplate();
    if (header) {
      this.toolbarDialogService.setTemplates({ header });
    }
  });

  private readonly warnMissingConfig = effect(() => {
    if (this.isConfigMissing() && !this.missingConfigLogged) {
      this.missingConfigLogged = true;
      this.logger.warn('Forest trenches configuration is missing from the obstacle catalog');
    }
  });

  private readonly populateForm = effect(() => {
    const section = this.spanService.section();
    const catalog = this.catalogData();
    if (!section || !catalog) return;

    const isNewSection = section.uuid !== this.sectionUuid();
    const config = this.forestConfig();
    const values = this.form.getRawValue();
    if (isNewSection) {
      const supports = section.supports ?? [];
      const validSavedRange =
        section.forest_trenches &&
        supports.some((support) => support.uuid === section.forest_trenches?.firstSupportUuid) &&
        supports.some((support) => support.uuid === section.forest_trenches?.lastSupportUuid) &&
        supports.findIndex((support) => support.uuid === section.forest_trenches?.lastSupportUuid) >
          supports.findIndex((support) => support.uuid === section.forest_trenches?.firstSupportUuid);
      const saved = section.forest_trenches;
      const availableRules = new Set(this.ruleOptions().map((option) => option.value));
      const selectedRules = saved
        ? saved.selectedRules.filter((ruleType) => availableRules.has(ruleType))
        : (config?.floorDistances ?? [])
            .filter((distance) => distance.active && availableRules.has(distance.rule_type))
            .map((distance) => distance.rule_type);
      const defaults = this.formDefaults(catalog, section);

      untracked(() => {
        this.sectionUuid.set(section.uuid);
        this.resultsState.set([]);
        this.calculatedInputs.set(null);
        this.spanControl.setValue(null);
        this.isGraphEnlarged.set(false);
        this.form.reset({
          firstSupportUuid: validSavedRange ? (saved?.firstSupportUuid ?? '') : defaults.firstSupportUuid,
          lastSupportUuid: validSavedRange ? (saved?.lastSupportUuid ?? '') : defaults.lastSupportUuid,
          nPoints: saved && config?.nPointsChoices.includes(saved.nPoints) ? saved.nPoints : defaults.nPoints,
          windZone: saved?.windZone ?? defaults.windZone,
          windMinus: saved?.windMinus ?? false,
          redZonePresence: saved?.redZonePresence ?? config?.redZone ?? false,
          repartitionTemperature: saved?.repartitionTemperature ?? defaults.repartitionTemperature,
          lateralDistanceTemperature: saved?.lateralDistanceTemperature ?? defaults.lateralDistanceTemperature,
          selectedRules
        });
      });
      return;
    }

    const defaults = this.formDefaults(catalog, section);
    untracked(() => {
      this.form.patchValue({
        firstSupportUuid: values.firstSupportUuid || defaults.firstSupportUuid,
        lastSupportUuid: values.lastSupportUuid || defaults.lastSupportUuid,
        nPoints: values.nPoints || defaults.nPoints,
        windZone: values.windZone || defaults.windZone,
        repartitionTemperature: values.repartitionTemperature ?? defaults.repartitionTemperature,
        lateralDistanceTemperature: values.lateralDistanceTemperature ?? defaults.lateralDistanceTemperature,
        selectedRules:
          values.selectedRules.length > 0
            ? values.selectedRules
            : (config?.floorDistances ?? [])
                .filter(
                  (distance) =>
                    distance.active && this.ruleOptions().some((option) => option.value === distance.rule_type)
                )
                .map((distance) => distance.rule_type)
      });
    });
  });

  private readonly renderPlot = effect(() => {
    const span = this.selectedSpan();
    const catalog = this.catalogData();
    const xTickLabels = this.xTickLabels();
    const config = this.forestConfig();
    const showLegend = this.isGraphEnlarged();
    if (!span || !catalog || !config) {
      untracked(() => {
        this.disconnectPlotResize();
        purgeForestTrenchesPlot(this.document);
      });
      return;
    }

    const selectedRules = this.calculatedInputs()?.selectedRules ?? [];
    const lateralRuleTypes = config.lateralRules.filter((ruleType) => selectedRules.includes(ruleType));
    const overhangRuleTypes = config.overhangRules.filter((ruleType) => selectedRules.includes(ruleType));
    const ruleColors = Object.fromEntries(catalog.ruleDefinitions.map((rule) => [rule.rule_type, rule.color]));
    const ruleLabels = Object.fromEntries(catalog.ruleDefinitions.map((rule) => [rule.rule_type, rule.rule_name]));

    afterNextRender(
      () => {
        if (!this.document.getElementById(FOREST_TRENCHES_PLOT_ID)) return;
        createForestTrenchesPlot(this.document, span, {
          lateralRuleTypes,
          overhangRuleTypes,
          ruleColors,
          ruleLabels,
          chart: config.chart,
          xAxisTitle: this.translocoService.translate('studio.forest-trenches.plot-distance-axis', {
            unit: this.translocoService.translate('common.meter')
          }),
          xTickLabels,
          yAxisTitle: this.translocoService.translate('studio.forest-trenches.plot-lateral-axis', {
            unit: this.translocoService.translate('common.meter')
          }),
          axisLabel: this.translocoService.translate('studio.forest-trenches.plot-axis-label'),
          overhangCableLabel: (ruleName) =>
            this.translocoService.translate('studio.forest-trenches.plot-overhang-cable-label', { ruleName }),
          lateralCableLabel: (ruleName) =>
            this.translocoService.translate('studio.forest-trenches.plot-lateral-cable-label', { ruleName }),
          lateralInverseCableLabel: (ruleName) =>
            this.translocoService.translate('studio.forest-trenches.plot-lateral-inverse-cable-label', { ruleName }),
          lateralLimitLabel: (ruleName) =>
            this.translocoService.translate('studio.forest-trenches.plot-lateral-limit-label', { ruleName }),
          lateralInverseLimitLabel: (ruleName) =>
            this.translocoService.translate('studio.forest-trenches.plot-lateral-inverse-limit-label', { ruleName }),
          showLegend
        });
        this.observePlotResize();
      },
      { injector: this.injector }
    );
  });

  async calculate(): Promise<void> {
    if (!this.canCalculate()) return;
    const section = this.spanService.section();
    const study = this.plotService.study();
    const config = this.forestConfig();
    const catalog = this.catalogData();
    if (!section || !study || !config || !catalog) return;

    this.isCalculating.set(true);
    this.calculationError.set(null);
    try {
      const values = this.form.getRawValue();
      // Resolved from the same snapshot as the other inputs: the form stays editable while the ground is sliced
      const windPressure = getEffectiveWindPressure(catalog.windZones, values.windZone, values.redZonePresence);
      const selectedRuleTypes = values.selectedRules;
      const rulesClimaticConditions = this.buildRulesClimaticConditions(catalog, selectedRuleTypes);
      const rulesDistances = this.buildRulesDistances(config, selectedRuleTypes);
      const spanIndices = spansInInterval(section.supports, values.firstSupportUuid, values.lastSupportUuid);
      const spans = await this.sliceSpans(section, spanIndices, values.nPoints);
      // The dialog was closed meanwhile: the remaining slices and the calculation are not queued
      if (!spans) return;

      const taskInput: TaskInputs[Task.getForestTrenches] = {
        electricTension: section.voltage_idr ?? '',
        form: {
          windZone: values.windZone,
          windPressure,
          windMinus: values.windMinus,
          redZonePresence: values.redZonePresence,
          repartitionTemperature: values.repartitionTemperature,
          lateralDistanceTemperature: values.lateralDistanceTemperature,
          selectedConformityRules: selectedRuleTypes,
          conformity: selectedRuleTypes,
          conformityPlot: 'forest_trenches',
          intermediatePoints: []
        },
        rulesClimaticConditions,
        rulesDistances,
        overhangRules: config.overhangRules.filter((ruleType) => selectedRuleTypes.includes(ruleType)),
        lateralRules: config.lateralRules.filter((ruleType) => selectedRuleTypes.includes(ruleType)),
        spans
      };
      const { result, error, diagnostics } = await this.workerPythonService.runTaskWithTimeout(
        Task.getForestTrenches,
        taskInput,
        FOREST_TRENCHES_CALCULATION_TIMEOUT_MS
      );
      if (this.destroyRef.destroyed) return;
      if (error || !result) throw this.taskError('Forest trenches task', error, diagnostics);
      if (!result.spans.length) {
        throw new ForestTrenchesError(
          'Forest trenches task returned no span results.',
          formatStudioError(TaskError.CALCULATION_ERROR, this.translocoService)
        );
      }

      // The calculation can take a while: merge the inputs into the section as it is now, not into the one captured
      // when it started, and drop the run if another section has been opened since
      const latestSection = this.spanService.section();
      const latestStudy = this.plotService.study();
      if (!latestSection || !latestStudy || !this.isStillOpen(study.uuid, section.uuid)) return;
      const updatedSection: Section = {
        ...latestSection,
        forest_trenches: {
          firstSupportUuid: values.firstSupportUuid,
          lastSupportUuid: values.lastSupportUuid,
          nPoints: values.nPoints,
          windZone: values.windZone,
          windMinus: values.windMinus,
          redZonePresence: values.redZonePresence,
          repartitionTemperature: values.repartitionTemperature ?? 0,
          lateralDistanceTemperature: values.lateralDistanceTemperature ?? 0,
          selectedRules: selectedRuleTypes
        }
      };
      await this.sectionService.createOrUpdateSection(latestStudy, updatedSection);
      // The write cannot be interrupted: if the studio moved on meanwhile, the saved section must not become the
      // active one again
      if (!this.isStillOpen(study.uuid, section.uuid)) return;
      this.spanService.section.set(updatedSection);
      // The section stays in sync with what was saved, but nobody is left to read the results once the dialog is closed
      if (this.destroyRef.destroyed) return;
      this.resultsState.set(result.spans);
      this.calculatedInputs.set(updatedSection.forest_trenches ?? null);
      this.spanControl.setValue(result.spans[0].spanIndex);
      this.notificationService.success(this.translocoService.translate('studio.forest-trenches.notifications.saved'));
    } catch (error) {
      this.logger.error('Failed to calculate forest trenches', error);
      // Nobody is left to read the error once the dialog is closed
      if (this.destroyRef.destroyed) return;
      const errorMessage = this.failureMessage(error);
      this.calculationError.set(errorMessage);
      this.notificationService.error(
        this.translocoService.translate('studio.forest-trenches.calculation-failed', { errorMessage })
      );
    } finally {
      this.isCalculating.set(false);
    }
  }

  private async sliceSpans(
    section: Section,
    spanIndices: number[],
    nPoints: number
  ): Promise<TaskInputs[Task.getForestTrenches]['spans'] | null> {
    const spans: TaskInputs[Task.getForestTrenches]['spans'] = [];
    for (const spanIndex of spanIndices) {
      const floor = section.floors?.find((candidate) => candidate.supportUuid === section.supports[spanIndex].uuid);
      const { result, error, diagnostics } = await this.workerPythonService.runTask(
        Task.sliceGround,
        toSliceGroundInput(floor, spanIndex, nPoints)
      );
      // The worker cannot be interrupted, but a closed dialog stops the remaining work
      if (this.destroyRef.destroyed) return null;
      if (error || !result) throw this.taskError('Ground slicing task', error, diagnostics);
      spans.push({ spanIndex, distances: result.distances, altitudes: result.altitudes });
    }
    return spans;
  }

  private buildRulesClimaticConditions(
    catalog: NonNullable<ReturnType<typeof this.catalogData>>,
    selectedRuleTypes: string[]
  ) {
    const ruleByType = new Map(catalog.ruleDefinitions.map((rule) => [rule.rule_type as string, rule]));
    return selectedRuleTypes.map((ruleType) => {
      const rule = ruleByType.get(ruleType);
      if (!rule) throw this.missingConfigurationError(`Missing climatic definition for rule "${ruleType}".`);
      return {
        ruleType,
        ruleName: rule.rule_name,
        lateralPoint: rule.lateral_point,
        overhangPoint: rule.overhang_point
      };
    });
  }

  private buildRulesDistances(config: NonNullable<ReturnType<typeof this.forestConfig>>, selectedRuleTypes: string[]) {
    const distanceByType = new Map(config.floorDistances.map((distance) => [distance.rule_type as string, distance]));
    return selectedRuleTypes.map((ruleType) => {
      const distance = distanceByType.get(ruleType);
      if (!distance) throw this.missingConfigurationError(`Missing floor-obstacle distance for rule "${ruleType}".`);
      return {
        ruleType,
        lateral: distance.lateral,
        overhang: distance.overhang
      };
    });
  }

  selectAdjacentSpan(step: -1 | 1): void {
    const span = this.results()[this.selectedSpanPosition() + step];
    if (span) this.spanControl.setValue(span.spanIndex);
  }

  toggleGraphSize(): void {
    this.isGraphEnlarged.update((enlarged) => !enlarged);
    afterNextRender(() => resizeForestTrenchesPlot(this.document), { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.toolbarDialogService.setTemplates({});
    this.disconnectPlotResize();
    purgeForestTrenchesPlot(this.document);
  }

  // The study and the section the calculation started on may have been replaced while it ran or saved. The study is
  // compared by uuid: it is read from a live query, so its object changes after every write
  private isStillOpen(studyUuid: string, sectionUuid: string): boolean {
    return this.plotService.study()?.uuid === studyUuid && this.spanService.section()?.uuid === sectionUuid;
  }

  // A selected rule the catalog does not fully describe: same cause and remedy as a missing configuration
  private missingConfigurationError(message: string): ForestTrenchesError {
    return new ForestTrenchesError(
      message,
      this.translocoService.translate('studio.forest-trenches.missing-configuration')
    );
  }

  // The user gets the message of the Python error raised by the task, if there is one, the technical cause is logged
  private taskError(task: string, error: TaskError | null, diagnostics: PythonDiagnostic[]): ForestTrenchesError {
    const exceptionCode = diagnostics.find((diagnostic) => diagnostic.origin === 'exception')?.code ?? null;
    return new ForestTrenchesError(
      `${task} failed (${error ?? 'no result'})`,
      formatStudioError(error, this.translocoService, exceptionCode)
    );
  }

  // Localized cause of a failure. Anything unexpected only shows as an unknown error, its details are in the log
  private failureMessage(error: unknown): string {
    if (error instanceof ForestTrenchesError) return error.displayMessage;
    if (error instanceof TaskTimeoutError) {
      return this.translocoService.translate('studio.forest-trenches.calculation-timeout', {
        seconds: Math.round(error.timeoutMs / 1000)
      });
    }
    return formatStudioError(null, this.translocoService);
  }

  private async loadCatalogData(): Promise<ForestTrenchesCatalogData> {
    const db = this.storageService.db;
    if (!db) return { windZones: [], conformityConfig: null, ruleDefinitions: [] };
    const [windZones, conformityConfig, ruleDefinitions] = await Promise.all([
      db.catObstacleWindZones.toArray(),
      db.catObstacleConformityConfig.get(OBSTACLE_CONFORMITY_CONFIG_KEY),
      db.catObstacleRuleDefinitions.toArray()
    ]);
    return { windZones, conformityConfig: conformityConfig ?? null, ruleDefinitions };
  }

  private formDefaults(
    catalog: ForestTrenchesCatalogData,
    section: Section
  ): {
    firstSupportUuid: string;
    lastSupportUuid: string;
    nPoints: number;
    windZone: string;
    repartitionTemperature: number | null;
    lateralDistanceTemperature: number | null;
  } {
    const config = catalog.conformityConfig;
    const forestConfig = this.forestConfig();
    const supports = section.supports ?? [];
    const lateralRule = catalog.ruleDefinitions.find(
      (rule) => rule.rule_type === config?.lateral_temperature_rule_type
    );
    return {
      firstSupportUuid: supports[0]?.uuid ?? '',
      lastSupportUuid: supports.at(-1)?.uuid ?? '',
      nPoints: forestConfig?.nPointsChoices[0] ?? 2,
      windZone: config?.wind_zone_default ?? catalog.windZones[0]?.label ?? '',
      repartitionTemperature: config?.repartition_temperature_default ?? null,
      lateralDistanceTemperature: config?.lateral_temperature_default ?? lateralRule?.lateral_point.temperature ?? null
    };
  }

  // Same support label as the other studio screens: the truncated support number, or its 1-based index
  private supportLabel(supportIndex: number): string {
    const number = this.supports()[supportIndex]?.number;
    return number ? formatSupportNumber(number) : String(supportIndex + 1);
  }

  private observePlotResize(): void {
    if (this.plotResizeObserver || typeof ResizeObserver === 'undefined') return;
    const element = this.document.getElementById(FOREST_TRENCHES_PLOT_ID);
    if (!element) return;
    this.plotResizeObserver = new ResizeObserver(() => resizeForestTrenchesPlot(this.document));
    this.plotResizeObserver.observe(element);
  }

  private disconnectPlotResize(): void {
    this.plotResizeObserver?.disconnect();
    this.plotResizeObserver = undefined;
  }
}
