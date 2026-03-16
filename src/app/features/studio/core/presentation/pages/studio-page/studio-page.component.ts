import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { debounce } from 'lodash';
import { StudiesService } from '@features/studies/infrastructure/services/studies.service';
import { Subscription } from 'dexie';
import { InputNumberModule } from 'primeng/inputnumber';
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
import { SpanComponent } from '@features/studio/loads/presentation/components/span/span.component';
import { NewChargeModalComponent } from '@features/studio/loads/presentation/components/new-charge-modal/new-charge-modal.component';
import { ToolbarDialogComponent } from '@features/studio/toolbar/presentation/components/toolbar-dialog/toolbar-dialog.component';
import { PlotService } from '@features/studio/core/services/plot.service';
import { SectionService } from '@features/study/infrastructure/services/section.service';
import { ObstaclesFormComponent } from '@features/studio/obstacles/presentation/components/obstaclesForm/obstaclesForm.component';
import { FreePositioningComponent } from '@shared/components/studio/free-positioning/free-positioning.component';

// debounce to make it more fluid when dragging the slider
const DEBOUNCED_REFRESH_STUDIO_DELAY = 300;

/** Main studio page component orchestrating section visualization, loads, obstacles, and toolbars. */
@Component({
  selector: 'app-studio-page',
  imports: [
    FormsModule,
    NgxSliderModule,
    InputNumberModule,
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
    SpanComponent,
    NewChargeModalComponent,
    ToolbarDialogComponent,
    ObstaclesFormComponent,
    FreePositioningComponent
  ],
  templateUrl: './studio-page.component.html',
  styleUrl: './studio-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
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
  subscription: Subscription | null = null;
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

  toggleSidebar() {
    this.sidebarOpen.set(!this.sidebarOpen());
    this.sidebarWidth.set(this.sidebarOpen() ? 300 : 0);
  }

  readonly plotService = inject(PlotService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studiesService = inject(StudiesService);
  private readonly sectionService = inject(SectionService);

  previousSectionUuid = signal<string | null>(null);

  ngOnInit() {
    const studyUuid = this.route.snapshot.paramMap.get('uuid');
    const sectionUuid = this.route.snapshot.queryParamMap.get('sectionUuid');
    if (!studyUuid || !sectionUuid) {
      this.router.navigate(['/studies']);
    }
    this.plotService.isStudioActive.set(true);
    this.studiesService.ready.subscribe((ready) => {
      if (ready && studyUuid) {
        this.subscription = this.studiesService.getStudyAsObservable(studyUuid).subscribe((study) => {
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
    });
  }

  ngOnDestroy(): void {
    this.plotService.isStudioActive.set(false);
    this.plotService.resetAll();
    this.subscription?.unsubscribe();
  }

  debounceUpdateSliderOptions = debounce((key: 'endSupport' | 'startSupport', value: number) => {
    this.plotService.plotOptionsChange({ [key]: value });
    const options = this.plotService.plotOptions();
    const diff = Math.abs(options.endSupport - options.startSupport);
    this.plotService.spanAmountChoice.set(diff === 1 ? 'single' : diff === 2 ? 'double' : 'all');
  }, DEBOUNCED_REFRESH_STUDIO_DELAY);

  updateSliderOptions({ value, highValue }: { value?: number | undefined; highValue?: number | undefined }) {
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
    const offset = value === 'single' ? 1 : value === 'double' ? 2 : null;
    if (offset !== null) {
      this.plotService.plotOptionsChange({
        endSupport: Math.min(startSupport + offset, maxSupport)
      });
    } else {
      this.plotService.plotOptionsChange({
        startSupport: 0,
        endSupport: maxSupport
      });
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
