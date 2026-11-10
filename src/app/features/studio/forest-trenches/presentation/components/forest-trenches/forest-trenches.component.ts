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
import type { ForestTrenchesInputs } from '@shared/domain/models/forest-trenches.model';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { StorageService } from '@services/storage/storage.service';
import { SectionService } from '@services/section/section.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskInputs } from '@services/worker_python/tasks/types';
import { NotificationService } from '@services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { maxDecimalsValidator } from '@shared/helpers/numberValidators';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
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
import { FOREST_TRENCHES_PLOT_ID } from './forest-trenches.constantes';
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
    this.supports().map((support) => ({
      label: support.name ?? support.number ?? support.uuid,
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
        lateralDistanceTemperature: values.lateralDistanceTemperature,
        baseCase: config.baseCase
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
    if (!span || !catalog) {
      untracked(() => {
        this.disconnectPlotResize();
        purgeForestTrenchesPlot(this.document);
      });
      return;
    }

    const config = this.forestConfig();
    const selectedRules = this.calculatedInputs()?.selectedRules ?? [];
    const lateralRuleTypes = (config?.lateralRules ?? []).filter((ruleType) => selectedRules.includes(ruleType));
    const ruleColors = Object.fromEntries(catalog.ruleDefinitions.map((rule) => [rule.rule_type, rule.color]));
    const ruleLabels = Object.fromEntries(catalog.ruleDefinitions.map((rule) => [rule.rule_type, rule.rule_name]));

    afterNextRender(
      () => {
        if (!this.document.getElementById(FOREST_TRENCHES_PLOT_ID)) return;
        createForestTrenchesPlot(this.document, span, {
          lateralRuleTypes,
          ruleColors,
          ruleLabels,
          xAxisTitle: this.translocoService.translate('studio.forest-trenches.plot-distance-axis', {
            unit: this.translocoService.translate('common.meter')
          }),
          xTickLabels,
          yAxisTitle: this.translocoService.translate('studio.forest-trenches.plot-lateral-axis', {
            unit: this.translocoService.translate('common.meter')
          }),
          axisLabel: this.translocoService.translate('studio.forest-trenches.plot-axis-label'),
          repartitionLabel: this.translocoService.translate('studio.forest-trenches.plot-repartition-label', {
            temperature: this.calculatedInputs()?.repartitionTemperature ?? 0
          }),
          baseCaseLabel: this.translocoService.translate('studio.forest-trenches.plot-base-case-label', {
            caseName: config?.baseCase.name ?? '',
            temperature: config?.baseCase.temperature ?? 0
          }),
          lateralCableLabel: (ruleName) =>
            this.translocoService.translate('studio.forest-trenches.plot-lateral-cable-label', { ruleName }),
          lateralInverseCableLabel: (ruleName) =>
            this.translocoService.translate('studio.forest-trenches.plot-lateral-inverse-cable-label', { ruleName }),
          lateralLimitLabel: (ruleName) =>
            this.translocoService.translate('studio.forest-trenches.plot-lateral-limit-label', { ruleName }),
          lateralInverseLimitLabel: (ruleName) =>
            this.translocoService.translate('studio.forest-trenches.plot-lateral-inverse-limit-label', { ruleName }),
          showLegend: this.isGraphEnlarged()
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
      const selectedRuleTypes = values.selectedRules;
      const ruleByType = new Map(catalog.ruleDefinitions.map((rule) => [rule.rule_type, rule]));
      const rulesClimaticConditions = selectedRuleTypes.map((ruleType) => {
        const rule = ruleByType.get(ruleType);
        if (!rule) throw new Error(`Missing climatic definition for rule "${ruleType}".`);
        return {
          ruleType,
          ruleName: rule.rule_name,
          lateralPoint: rule.lateral_point,
          overhangPoint: rule.overhang_point
        };
      });
      const distanceByType = new Map(config.floorDistances.map((distance) => [distance.rule_type, distance]));
      const rulesDistances = selectedRuleTypes.map((ruleType) => {
        const distance = distanceByType.get(ruleType);
        if (!distance) throw new Error(`Missing floor-obstacle distance for rule "${ruleType}".`);
        return {
          ruleType,
          lateral: distance.lateral,
          overhang: distance.overhang
        };
      });
      const spanIndices = spansInInterval(section.supports, values.firstSupportUuid, values.lastSupportUuid);
      const spans: TaskInputs[Task.getForestTrenches]['spans'] = [];
      for (const spanIndex of spanIndices) {
        const floor = section.floors?.find((candidate) => candidate.supportUuid === section.supports[spanIndex].uuid);
        const { result, error } = await this.workerPythonService.runTask(
          Task.sliceGround,
          toSliceGroundInput(floor, spanIndex, values.nPoints)
        );
        if (error || !result) throw new Error(error ?? 'Ground slicing task failed.');
        spans.push({ spanIndex, distances: result.distances, altitudes: result.altitudes });
      }

      const taskInput: TaskInputs[Task.getForestTrenches] = {
        electricTension: section.voltage_idr ?? '',
        form: {
          windZone: values.windZone,
          windPressure: this.effectiveWindPressure(),
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
        baseCase: config.baseCase,
        spans
      };
      const { result, error } = await this.workerPythonService.runTask(Task.getForestTrenches, taskInput);
      if (error || !result) throw new Error(error ?? 'Forest trenches task failed.');
      if (!result.spans.length) throw new Error('Forest trenches task returned no span results.');

      const updatedSection: Section = {
        ...section,
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
      await this.sectionService.createOrUpdateSection(study, updatedSection);
      this.spanService.section.set(updatedSection);
      this.resultsState.set(result.spans);
      this.calculatedInputs.set(updatedSection.forest_trenches ?? null);
      this.spanControl.setValue(result.spans[0].spanIndex);
      this.notificationService.success(this.translocoService.translate('studio.forest-trenches.notifications.saved'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to calculate forest trenches', error);
      this.calculationError.set(errorMessage);
      this.notificationService.error(
        this.translocoService.translate('studio.forest-trenches.calculation-failed', { errorMessage })
      );
    } finally {
      this.isCalculating.set(false);
    }
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
      lastSupportUuid: supports[supports.length - 1]?.uuid ?? '',
      nPoints: forestConfig?.nPointsChoices[0] ?? 2,
      windZone: config?.wind_zone_default ?? catalog.windZones[0]?.label ?? '',
      repartitionTemperature: config?.repartition_temperature_default ?? null,
      lateralDistanceTemperature: config?.lateral_temperature_default ?? lateralRule?.lateral_point.temperature ?? null
    };
  }

  private supportLabel(supportIndex: number): string {
    const support = this.supports()[supportIndex];
    return support?.name ?? support?.number ?? support?.uuid ?? '';
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
