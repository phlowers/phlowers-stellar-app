import { DecimalPipe } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
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
import { debounce } from 'lodash';
import { StudiesService } from '@services/studies/studies.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { InputNumberModule } from 'primeng/inputnumber';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { StudioComponent } from '@shared/components/studio/studio.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { StudioTopToolbarComponent } from '../../components/top-toolbar/top-toolbar.component';
import { StudioMenuBarComponent } from '../../components/menu-bar/menu-bar.component';
import { SectionPlotCardsComponent } from '../../components/cards/section-plot-cards.component';
import { SideTabsComponent } from '../../components/side-tabs/side-tabs.component';
import { SideTabComponent } from '../../components/side-tabs/side-tab/side-tab.component';
import { ClimateComponent } from '@features/studio/loads/presentation/components/climate/climate.component';
import { LoadMarkingComponent } from '@src/app/features/studio/loads/presentation/components/load-marking/load-marking.component';
import { NewChargeModalComponent } from '@src/app/shared/components/new-charge-modal/new-charge-modal.component';
import { ToolbarDialogComponent } from '@features/studio/toolbar/presentation/components/toolbar-dialog/toolbar-dialog.component';
import { PlotService } from '@services/plot/plot.service';
import { LoadFormsService } from '@features/studio/loads/presentation/services/loadForms.service';
import { ObstaclesFormComponent } from '@features/studio/obstacles/presentation/components/obstaclesForm/obstaclesForm.component';
import { FreePositioningComponent } from '../../components/free-positioning/free-positioning.component';
import { STUDIO_PLOT_DEBOUNCE_DELAY } from '@shared/components/studio/section/helpers/plot.constants';

/** Main studio page component orchestrating section visualization, loads, obstacles, and toolbars. */
@Component({
  selector: 'app-studio-page',
  imports: [
    DecimalPipe,
    FormsModule,
    NgxSliderModule,
    InputNumberModule,
    RadioButtonModule,
    SelectModule,
    TabsModule,
    StudioComponent,
    ButtonComponent,
    IconComponent,
    StudioTopToolbarComponent,
    StudioMenuBarComponent,
    SectionPlotCardsComponent,
    SideTabsComponent,
    SideTabComponent,
    ClimateComponent,
    LoadMarkingComponent,
    NewChargeModalComponent,
    ToolbarDialogComponent,
    ObstaclesFormComponent,
    FreePositioningComponent
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
  sidebarWidth = signal(300);
  sidebarOpen = signal(false);
  spanAmountChoiceOptions = signal<
    {
      label: string;
      value: string;
    }[]
  >([
    { label: $localize`One span`, value: 'single' },
    { label: $localize`Two spans`, value: 'double' },
    { label: $localize`All`, value: 'all' }
  ]);
  isNewChargeModalOpen = signal(false);
  isFreePositioningToolOpen = signal(false);

  private readonly maxSupportIndex = computed(() => (this.plotService.section()?.supports?.length ?? 0) - 1);

  isPreviousDisabled = computed(() => {
    const { invert, startSupport, endSupport } = this.plotService.plotOptions();
    return this.plotService.loading() || (invert ? endSupport === this.maxSupportIndex() : startSupport === 0);
  });

  isNextDisabled = computed(() => {
    const { invert, startSupport, endSupport } = this.plotService.plotOptions();
    return this.plotService.loading() || (invert ? startSupport === 0 : endSupport === this.maxSupportIndex());
  });

  sliderOptions = computed<Options>(() => {
    return {
      floor: 0,
      ceil: this.plotService.section()?.supports?.length ? this.plotService.section()!.supports.length - 1 : undefined,
      step: 1,
      showTicks: true,
      showTicksValues: true,
      animate: false,
      animateOnMove: false,
      disabled: this.plotService.loading() || this.plotService.isFreePositioningMode(),
      translate: (value: number) => {
        return (value + 1).toString();
      },
      rightToLeft: this.plotService.plotOptions().invert
    };
  });

  filteredObstaclesOptions = computed(() => {
    const section = this.plotService.section();
    if (!section) return [];
    const { startSupport, endSupport } = this.plotService.plotOptions();
    const visibleSupportUuids = new Set(section.supports.slice(startSupport, endSupport).map((s) => s.uuid));
    const options = section.obstacles
      .filter((o) => visibleSupportUuids.has(o.supportUuid))
      .map((o) => ({ label: o.name, value: o.uuid }));
    // Always include the currently selected obstacle so the label persists when navigating spans
    const selectedUuid = this.obstaclesService.selectedObstacleUuid();
    if (selectedUuid && !options.some((o) => o.value === selectedUuid)) {
      const selected = section.obstacles.find((o) => o.uuid === selectedUuid);
      if (selected) options.push({ label: selected.name, value: selected.uuid });
    }
    return options;
  });

  obstaclePointOptions = computed(() => {
    const uuid = this.obstaclesService.selectedObstacleUuid();
    if (!uuid) return [];
    const obstacle = this.plotService.section()?.obstacles.find((o) => o.uuid === uuid);
    if (!obstacle) return [];
    return obstacle.positions.map((_, index) => ({ label: $localize`Point ${index + 1}`, value: index }));
  });

  toggleSidebar() {
    this.sidebarOpen.set(!this.sidebarOpen());
    this.sidebarWidth.set(this.sidebarOpen() ? 300 : 0);
  }

  readonly plotService = inject(PlotService);
  readonly loadFormsService = inject(LoadFormsService);
  public readonly obstaclesService = inject(ObstaclesService);
  public readonly obstacleFormService = inject(ObstacleFormService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studiesService = inject(StudiesService);
  private readonly destroyRef = inject(DestroyRef);

  previousSectionUuid = signal<string | null>(null);

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
      .subscribe((study) => {
        if (study) {
          this.plotService.study.set(study);
          const section = study.sections.find((s) => s.uuid === sectionUuid);
          if (section) {
            this.plotService.section.set(section);
            if (this.previousSectionUuid() !== section.uuid) {
              this.plotService.plotOptionsChange({
                endSupport: section.supports.length - 1,
                startSupport: 0
              });
              this.previousSectionUuid.set(section.uuid);
            }
          } else {
            this.router.navigate(['/studies']);
          }
        } else {
          this.router.navigate(['/studies']);
        }
      });
  }

  ngOnDestroy(): void {
    this.plotService.isStudioActive.set(false);
    this.plotService.resetAll();
    this.obstaclesService.setSelectedObstacle(null, null);
  }

  debounceUpdateSliderOptions = debounce((key: 'endSupport' | 'startSupport', value: number) => {
    this.plotService.plotOptionsChange({ [key]: value });
    const options = this.plotService.plotOptions();
    const diff = Math.abs(options.endSupport - options.startSupport);
    const spanAmount = this.getSpanAmount(diff);
    this.plotService.spanAmountChoice.set(spanAmount);
  }, STUDIO_PLOT_DEBOUNCE_DELAY);

  private getSpanAmount(diff: number): 'single' | 'double' | 'all' {
    if (diff === 1) return 'single';
    if (diff === 2) return 'double';
    return 'all';
  }

  updateSliderOptions({ value, highValue }: { value?: number; highValue?: number }) {
    const options = this.plotService.plotOptions();
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
    this.plotService.spanAmountChoice.set(value as 'single' | 'double' | 'all');
    const startSupport = this.plotService.plotOptions().startSupport;
    const maxSupport = (this.plotService.section()?.supports.length ?? 0) - 1;
    if (value === 'all') {
      this.plotService.plotOptionsChange({
        startSupport: 0,
        endSupport: maxSupport
      });
    } else {
      const offset = value === 'single' ? 1 : 2;
      this.plotService.plotOptionsChange({
        endSupport: Math.min(startSupport + offset, maxSupport)
      });
    }
  }

  onObstacleSelect(uuid: string | null) {
    this.plotService.distanceType.set(null);
    const obstacle = uuid ? this.plotService.section()?.obstacles.find((o) => o.uuid === uuid) : null;
    const pointIndex = obstacle?.positions.length === 1 ? 0 : null;
    this.obstaclesService.setSelectedObstacle(uuid, pointIndex);
    if (obstacle) {
      this.obstacleFormService.setExistingObstacle(obstacle, pointIndex ?? 0);
    }
  }

  onSupportButtonClick(direction: 'left' | 'right') {
    let increment = direction === 'left' ? -1 : 1;
    increment = this.plotService.plotOptions().invert ? -increment : increment;
    const options = this.plotService.plotOptions();
    this.plotService.plotOptionsChange({
      startSupport: Math.max(options.startSupport + increment, 0),
      endSupport: Math.max(options.endSupport + increment, 0)
    });
  }
}
