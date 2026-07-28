import { DecimalPipe } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, from, switchMap } from 'rxjs';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { debounce, round } from 'lodash';
import { truncateNumberToOneDecimal } from '@shared/helpers/truncateDecimals';
import { StudiesService } from '@services/studies/studies.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { InputNumberModule } from 'primeng/inputnumber';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { StudioComponent } from '@shared/components/studio/studio.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { StudioTopToolbarComponent } from '@features/studio/core/presentation/components/top-toolbar/top-toolbar.component';
import { StudioMenuBarComponent } from '@features/studio/core/presentation/components/menu-bar/menu-bar.component';
import { SectionPlotCardsComponent } from '@features/studio/core/presentation/components/cards/section-plot-cards.component';
import { SideTabsComponent } from '@features/studio/core/presentation/components/side-tabs/side-tabs.component';
import { SideTabComponent } from '@features/studio/core/presentation/components/side-tabs/side-tab/side-tab.component';
import { FreePositioningComponent } from '@features/studio/core/presentation/components/free-positioning/free-positioning.component';
import { ClimateComponent } from '@features/studio/loads/presentation/components/climate/climate.component';
import { LoadMarkingComponent } from '@features/studio/loads/presentation/components/load-marking/load-marking.component';
import { NewChargeModalComponent } from '@shared/components/new-charge-modal/new-charge-modal.component';
import { ToolbarDialogComponent } from '@features/studio/toolbar/presentation/components/toolbar-dialog/toolbar-dialog.component';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotResolutionService } from '@services/plot/plot-resolution.service';
import { LoadFormsService } from '@features/studio/loads/presentation/services/loadForms.service';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';
import { ObstaclesFormComponent } from '@features/studio/obstacles/presentation/components/obstaclesForm/obstaclesForm.component';
import { STUDIO_PLOT_DEBOUNCE_DELAY } from '@shared/components/studio/section/helpers/plot.constants';
import { CableLengthChangeComponent } from '@features/studio/loads/presentation/components/cable-length-change/cable-length-change';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { CableSpanManipComponent } from '@features/studio/loads/presentation/components/cable-span-manip/cable-span-manip';
import { findMiddleSpan } from '@shared/helpers/findMiddleSpan';
import { CableSupportManipComponent } from '@features/studio/loads/presentation/components/cable-support-manip/cable-support-manip.component';
import { DistanceMeasuringComponent } from '@features/studio/distance-measuring/distance-measuring.component';
import { Camera } from 'plotly.js-dist-min';
import { StudioViewCamera, StudioViewState } from '@shared/types/plot.types';
import { LoggerService } from '@core/services/logger/logger.service';
import { StudioViewPersistenceService } from '@services/plot/studio-view-persistence.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Section, Study } from '@shared/domain';

/** Display mode for global section parameters: middle span or section maximum. */
type GlobalStateMode = 'span' | 'max_section';

/** Number of spans displayed in the section view. */
type SpanAmountChoice = 'single' | 'double' | 'all';

/** Main studio page component orchestrating section visualization, loads, obstacles, and toolbars. */
@Component({
  selector: 'app-studio-page',
  imports: [
    DecimalPipe,
    FormsModule,
    NgxSliderModule,
    TranslocoModule,
    InputNumberModule,
    RadioButtonModule,
    SelectModule,
    SelectButtonModule,
    TabsModule,
    TooltipModule,
    StudioComponent,
    ButtonComponent,
    IconComponent,
    StudioTopToolbarComponent,
    CableLengthChangeComponent,
    StudioMenuBarComponent,
    SectionPlotCardsComponent,
    SideTabsComponent,
    SideTabComponent,
    ClimateComponent,
    LoadMarkingComponent,
    NewChargeModalComponent,
    ToolbarDialogComponent,
    ObstaclesFormComponent,
    FreePositioningComponent,
    CableSpanManipComponent,
    CableSupportManipComponent,
    DistanceMeasuringComponent
  ],
  templateUrl: './studio-page.component.html',
  styleUrl: './studio-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('pointSelect', [
      transition(':enter', [
        style({ width: 0, opacity: 0, overflow: 'hidden' }),
        animate('200ms ease-out', style({ width: '*', opacity: 1 }))
      ]),
      transition(':leave', [style({ overflow: 'hidden' }), animate('200ms ease-in', style({ width: 0, opacity: 0 }))])
    ])
  ]
})
export class StudioPageComponent implements OnInit, OnDestroy {
  private readonly translocoService = inject(TranslocoService);

  sidebarWidth = signal(300);
  sidebarOpen = signal(false);
  spanAmountChoiceOptions = signal<
    {
      label: string;
      value: SpanAmountChoice;
    }[]
  >([
    { label: this.translocoService.translate('studio.studio-page.one-span-option'), value: 'single' },
    { label: this.translocoService.translate('studio.studio-page.two-spans-option'), value: 'double' },
    { label: this.translocoService.translate('studio.studio-page.all-option'), value: 'all' }
  ]);
  isNewChargeModalOpen = signal(false);
  isFreePositioningToolOpen = signal(false);

  // graph global param.
  globalStateOptions = [
    { label: this.translocoService.translate('studio.studio-page.span-option'), value: 'span' },
    { label: this.translocoService.translate('studio.studio-page.max-section-option'), value: 'max_section' }
  ];

  globalState = signal<GlobalStateMode>('max_section');
  globalParameter = computed<number | null>(() => {
    const raw = this.resolveGlobalValue(this.plotService.litData()?.output_parameters.parameter);
    return raw !== null ? truncateNumberToOneDecimal(raw) : null;
  });
  globalStressRate = computed<number | null>(() =>
    this.resolveGlobalValue(this.plotService.litData()?.output_parameters.utilization_rate)
  );
  isGlobalCutStrand = signal<boolean>(false);

  private readonly maxSupportIndex = computed(() => (this.spanService.section()?.supports?.length ?? 0) - 1);

  isPreviousDisabled = computed(() => {
    const { invert, startSupport, endSupport } = this.plotOptionsService.plotOptions();
    return this.plotService.loading() || (invert ? endSupport === this.maxSupportIndex() : startSupport === 0);
  });

  isNextDisabled = computed(() => {
    const { invert, startSupport, endSupport } = this.plotOptionsService.plotOptions();
    return this.plotService.loading() || (invert ? startSupport === 0 : endSupport === this.maxSupportIndex());
  });

  sliderOptions = computed<Options>(() => {
    return {
      floor: 0,
      ceil: this.spanService.section()?.supports?.length ? this.spanService.section()!.supports.length - 1 : undefined,
      step: 1,
      showTicks: true,
      showTicksValues: true,
      animate: false,
      animateOnMove: false,
      noSwitching: true,
      minRange: 1,
      disabled: this.plotService.loading() || this.plotOptionsService.isFreePositioningMode(),
      translate: (value: number) => {
        const num = this.spanService.section()?.supports?.[value]?.number;
        return num ? formatSupportNumber(num) : String(value + 1);
      },
      rightToLeft: this.plotOptionsService.plotOptions().invert
    };
  });

  filteredObstaclesOptions = computed(() => {
    const section = this.spanService.section();
    if (!section) return [];
    const { startSupport, endSupport } = this.plotOptionsService.plotOptions();
    const visibleSupportUuids = new Set(section.supports.slice(startSupport, endSupport).map((s) => s.uuid));
    const options: { label: string; value: string | null }[] = section.obstacles
      .filter((o) => visibleSupportUuids.has(o.supportUuid))
      .map((o) => ({ label: o.name, value: o.uuid }));
    if (options.length) {
      options.unshift({ label: this.translocoService.translate('studio.studio-page.not-selected-option'), value: null });
    }
    return options;
  });

  obstaclePointOptions = computed(() => {
    const uuid = this.obstaclesService.selectedObstacleUuid();
    if (!uuid) return [];
    const obstacle = this.spanService.section()?.obstacles.find((o) => o.uuid === uuid);
    if (!obstacle) return [];
    return obstacle.positions.map((_, index) => ({
      label: this.translocoService.translate('studio.studio-page.point-option', { index: index + 1 }),
      value: index
    }));
  });

  toggleSidebar() {
    this.sidebarOpen.set(!this.sidebarOpen());
    this.sidebarWidth.set(this.sidebarOpen() ? 300 : 0);
  }

  readonly plotService = inject(PlotService);
  readonly spanService = inject(PlotSpanService);
  readonly plotOptionsService = inject(PlotOptionsService);
  readonly loadFormsService = inject(LoadFormsService);
  public readonly obstaclesService = inject(ObstaclesService);
  public readonly obstacleFormService = inject(ObstacleFormService);
  protected readonly obstacleStateService = inject(ObstacleStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studiesService = inject(StudiesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly resolutionService = inject(PlotResolutionService);
  private readonly logger = inject(LoggerService);
  private readonly persistenceService = inject(StudioViewPersistenceService);

  previousSectionUuid = signal<string | null>(null);
  private readonly activeSectionUuid = signal<string | null>(null);
  private readonly isViewReady = signal<boolean>(false);
  private previousStartSupport: number | null = null;
  private previousEndSupport: number | null = null;

  constructor() {
    effect(() => {
      const { startSupport, endSupport } = this.plotOptionsService.plotOptions();
      if (
        this.previousStartSupport !== null &&
        this.previousEndSupport !== null &&
        (this.previousStartSupport !== startSupport || this.previousEndSupport !== endSupport)
      ) {
        this.obstaclesService.setSelectedObstacle(null, null);
        this.obstacleStateService.distanceType.set(null);
      }
      this.previousStartSupport = startSupport;
      this.previousEndSupport = endSupport;
    });

    // Save view state to localStorage immediately on any view-state signal change.
    // Using an effect (not a debounce) ensures the camera is always persisted even if
    // the user navigates away within milliseconds of the last interaction.
    effect(() => {
      const sectionUuid = this.activeSectionUuid();
      if (!sectionUuid || !this.isViewReady()) return;
      this.persistenceService.save(sectionUuid, this.buildViewState());
    });
  }

  private resolveGlobalValue(values: number[] | undefined): number | null {
    if (!values || values.length === 0) return null;

    if (this.globalState() === 'max_section') {
      const max = Math.max(...values);
      return Number.isFinite(max) ? round(max, 2) : null;
    }

    // 'span' mode: use middle span index
    const { startSupport, endSupport } = this.plotOptionsService.plotOptions();
    const [middleSpanIndex] = findMiddleSpan(startSupport, endSupport);
    const value = values[middleSpanIndex];
    return value === undefined ? null : round(value, 2);
  }

  ngOnInit() {
    const studyUuid = this.route.snapshot.paramMap.get('uuid');
    const sectionUuid = this.route.snapshot.queryParamMap.get('sectionUuid');
    if (!studyUuid || !sectionUuid) {
      this.router.navigate(['/studies']);
      return;
    }
    this.plotService.isStudioActive.set(true);

    this.studiesService.ready
      .pipe(
        filter((ready) => ready && !!studyUuid),
        switchMap(() => from(this.studiesService.getStudyAsObservable(studyUuid))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((study) => this.handleLoadedStudy(study, sectionUuid));
  }

  private handleLoadedStudy(study: Study | null | undefined, sectionUuid: string): void {
    if (!study) {
      this.router.navigate(['/studies']);
      return;
    }
    this.plotService.study.set(study);
    this.tryInitializeSection(study, sectionUuid);
  }

  private tryInitializeSection(study: Study, sectionUuid: string): void {
    const section = study.sections.find((s: Section) => s.uuid === sectionUuid);
    if (!section) {
      this.router.navigate(['/studies']);
      return;
    }
    this.spanService.section.set(section);
    if (this.previousSectionUuid() === section.uuid) {
      return; // Section already active, skip re-initialization
    }
    this.initializeNewSection(section, sectionUuid);
  }

  private initializeNewSection(section: Section, sectionUuid: string): void {
    this.activeSectionUuid.set(sectionUuid);
    this.isViewReady.set(false);

    const maxSupport = section.supports.length - 1;
    const viewState = this.persistenceService.load(sectionUuid) ?? section.studio_view_state;
    const { startSupport, endSupport } = this.getValidatedSupportBounds(maxSupport, viewState);

    this.plotService.plotOptionsChange({ startSupport, endSupport });
    this.restoreCamera(viewState);
    this.restoreScalingFactors(viewState);
    this.restoreResolution(viewState);

    this.previousSectionUuid.set(section.uuid);
    this.isViewReady.set(true);
  }

  private getValidatedSupportBounds(
    maxSupport: number,
    viewState: StudioViewState | null | undefined
  ): { startSupport: number; endSupport: number } {
    if (!viewState) {
      return { startSupport: 0, endSupport: maxSupport };
    }

    const start =
      viewState.startSupport !== undefined && viewState.startSupport >= 0 && viewState.startSupport < maxSupport
        ? viewState.startSupport
        : 0;

    const end =
      viewState.endSupport !== undefined && viewState.endSupport > start && viewState.endSupport <= maxSupport
        ? viewState.endSupport
        : maxSupport;

    return { startSupport: start, endSupport: end };
  }

  private restoreCamera(viewState: StudioViewState | null | undefined): void {
    if (!viewState?.camera) {
      return;
    }
    this.plotOptionsService.camera.set(viewState.camera as Camera);
    // Also set as pending restore so SectionPlotComponent can apply it
    // directly via Plotly.relayout after the first render, guaranteeing
    // the camera is used even if layout-camera application is unreliable.
    this.plotOptionsService.pendingCameraRestore.set(viewState.camera as Camera);
  }

  private restoreScalingFactors(viewState: StudioViewState | null | undefined): void {
    if (viewState?.scalingFactors) {
      this.plotOptionsService.setScalingFactors(viewState.scalingFactors);
    }
  }

  private restoreResolution(viewState: StudioViewState | null | undefined): void {
    if (viewState?.resolution !== undefined) {
      this.resolutionService.setResolution(viewState.resolution);
      void this.resolutionService.applyResolution(viewState.resolution);
    }
  }

  ngOnDestroy(): void {
    this.isViewReady.set(false);
    this.saveViewState();
    this.plotService.isStudioActive.set(false);
    this.plotService.resetAll();
    this.obstaclesService.setSelectedObstacle(null, null);
    this.obstacleFormService.clearPositions();
  }

  private buildViewState(): StudioViewState {
    // Use the camera signal only — it is kept synchronous with every plotly_relayout
    // event via refreshCamera(), so DOM access (getCamera()) is not needed.
    const rawCam = this.plotOptionsService.camera();
    const camera: StudioViewCamera | null = rawCam
      ? {
          eye: { x: rawCam.eye?.x ?? 0, y: rawCam.eye?.y ?? 0, z: rawCam.eye?.z ?? 0 },
          center: { x: rawCam.center?.x ?? 0, y: rawCam.center?.y ?? 0, z: rawCam.center?.z ?? 0 },
          up: { x: rawCam.up?.x ?? 0, y: rawCam.up?.y ?? 0, z: rawCam.up?.z ?? 0 }
        }
      : null;
    const { startSupport, endSupport } = this.plotOptionsService.plotOptions();
    return {
      camera,
      scalingFactors: this.plotOptionsService.scalingFactors(),
      resolution: this.resolutionService.resolution(),
      startSupport,
      endSupport
    };
  }

  private saveViewState(): void {
    const study = this.plotService.study();
    const sectionUuid = this.activeSectionUuid();
    if (!study || !sectionUuid) return;

    const studioViewState = this.buildViewState();

    // Sync localStorage with the definitive state on exit (effect may have fired earlier
    // but isViewReady is now false so this explicit call guarantees the final write).
    this.persistenceService.save(sectionUuid, studioViewState);

    const updatedSections = study.sections.map((s) =>
      s.uuid === sectionUuid ? { ...s, studio_view_state: studioViewState } : s
    );
    this.studiesService.updateStudy({ ...study, sections: updatedSections }, true).catch((err) => {
      this.logger.error('Failed to save studio view state', err);
    });
  }

  debounceUpdateSliderOptions = debounce((key: 'endSupport' | 'startSupport', value: number) => {
    this.plotService.plotOptionsChange({ [key]: value });
    const options = this.plotOptionsService.plotOptions();
    const diff = Math.abs(options.endSupport - options.startSupport);
    const spanAmount = this.getSpanAmount(diff);
    this.spanService.spanAmountChoice.set(spanAmount);
  }, STUDIO_PLOT_DEBOUNCE_DELAY);

  private getSpanAmount(diff: number): SpanAmountChoice {
    if (diff === 1) return 'single';
    if (diff === 2) return 'double';
    return 'all';
  }

  updateSliderOptions({ value, highValue }: { value?: number; highValue?: number }) {
    const options = this.plotOptionsService.plotOptions();
    [
      { val: value, key: 'startSupport' as const, opt: options.startSupport },
      { val: highValue, key: 'endSupport' as const, opt: options.endSupport }
    ].forEach(({ val, key, opt }) => {
      if (val !== undefined && val !== opt) {
        this.debounceUpdateSliderOptions(key, val);
      }
    });
  }

  openNewChargeModal() {
    this.isNewChargeModalOpen.set(true);
  }

  onSelectSpanAmount(value: string) {
    this.spanService.spanAmountChoice.set(value as 'single' | 'double' | 'all');
    const startSupport = this.plotOptionsService.plotOptions().startSupport;
    const maxSupport = (this.spanService.section()?.supports.length ?? 0) - 1;
    if (value === 'all') {
      this.plotService.plotOptionsChange({
        startSupport: 0,
        endSupport: maxSupport
      });
    } else {
      const offset = value === 'single' ? 1 : 2;
      const newEndSupport = Math.min(startSupport + offset, maxSupport);
      const newStartSupport = Math.max(newEndSupport - offset, 0);
      this.plotService.plotOptionsChange({
        startSupport: newStartSupport,
        endSupport: newEndSupport
      });
    }
  }

  onObstacleSelect(uuid: string | null) {
    this.obstacleStateService.distanceType.set(null);
    const obstacle = uuid ? this.spanService.section()?.obstacles.find((o) => o.uuid === uuid) : null;
    const pointIndex = obstacle?.positions.length === 1 ? 0 : null;
    this.obstaclesService.setSelectedObstacle(uuid, pointIndex);
    if (obstacle) {
      this.obstacleFormService.setExistingObstacle(obstacle, pointIndex ?? 0);
    }
  }

  onSupportButtonClick(direction: 'left' | 'right') {
    let increment = direction === 'left' ? -1 : 1;
    increment = this.plotOptionsService.plotOptions().invert ? -increment : increment;
    const options = this.plotOptionsService.plotOptions();
    this.plotService.plotOptionsChange({
      startSupport: Math.max(options.startSupport + increment, 0),
      endSupport: Math.max(options.endSupport + increment, 0)
    });
  }
}
