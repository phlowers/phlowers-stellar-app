import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import { StudioComponent } from '@ui/shared/components/studio/studio.component';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';
import { StudioTopToolbarComponent } from '@ui/shared/components/studio/top-toolbar/top-toolbar.component';
import { SelectModule } from 'primeng/select';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { PlotService } from './plot.service';
import { StudioMenuBarComponent } from '@ui/shared/components/studio/menu-bar/menu-bar.component';
import { ActivatedRoute, Router } from '@angular/router';
import { StudiesService } from '@core/services/studies/studies.service';
import { Subscription } from 'dexie';
import { SectionPlotCardsComponent } from '@ui/shared/components/studio/section/cards/section-plot-cards.component';
import { SideTabsComponent } from './side-tabs/side-tabs.component';
import { SideTabComponent } from './side-tabs/side-tab/side-tab.component';
import { TabsModule } from 'primeng/tabs';
import { ClimateComponent } from './loads/climate/climate.component';
import { SpanComponent } from './loads/span/span.component';
import { debounce } from 'lodash';
import { ButtonComponent } from '../../shared/components/atoms/button/button.component';
import { NewChargeModalComponent } from './new-charge-modal/new-charge-modal.component';

// debounce to make it more fluid when dragging the slider
const DEBOUNCED_REFRESH_STUDIO_DELAY = 300;

@Component({
  selector: 'app-studio-page',
  imports: [
    StudioComponent,
    NgxSliderModule,
    InputNumberModule,
    FormsModule,
    StudioTopToolbarComponent,
    SelectModule,
    IconComponent,
    StudioMenuBarComponent,
    SectionPlotCardsComponent,
    SideTabsComponent,
    SideTabComponent,
    TabsModule,
    ClimateComponent,
    SpanComponent,
    ButtonComponent,
    NewChargeModalComponent
  ],
  templateUrl: './studio-page.component.html',
  styleUrl: './studio-page.component.scss'
})
export class StudioPageComponent implements OnInit, OnDestroy {
  sidebarWidth = signal(300);
  sidebarOpen = signal(false);
  supports = signal<string>('single');
  supportsOptions = signal<string[]>(['single', 'double', 'all']);
  subscription: Subscription | null = null;
  plotStudioHeight = signal<string>('21.875rem');
  isNewChargeModalOpen = signal(false);
  newChargeModalMode = signal<'create' | 'edit' | 'view'>('create');
  newChargeModalUuid = signal<string | null>(null);
  private resizeObserver?: ResizeObserver;

  sliderOptions = computed<Options>(() => {
    return {
      floor: 0,
      ceil: (this.plotService.section()?.supports?.length ?? 1) - 1,
      step: 1,
      showTicks: true,
      showTicksValues: true,
      animate: false,
      animateOnMove: false,
      translate: (value: number) => {
        return (value + 1).toString();
      },
      rightToLeft: this.plotService.plotOptions().invert
    };
  });

  // Mock data for span load
  spanData = [
    { label: 'Span 1-2', value: 'span1-2', supports: [1, 2] },
    { label: 'Span 2-3', value: 'span2-3', supports: [2, 3] },
    { label: 'Span 3-4', value: 'span3-4', supports: [3, 4] }
  ];
  supportData = [
    { label: 'Support 1', value: 1 },
    { label: 'Support 2', value: 2 },
    { label: 'Support 3', value: 3 },
    { label: 'Support 4', value: 4 }
  ];

  toggleSidebar() {
    this.sidebarOpen.set(!this.sidebarOpen());
    this.sidebarWidth.set(this.sidebarOpen() ? 300 : 0);
  }

  constructor(
    public readonly plotService: PlotService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly studiesService: StudiesService,
    private readonly elementRef: ElementRef
  ) {
    afterNextRender(() => {
      this.setupPlotViewHeightCalculation();
    });
  }

  private setupPlotViewHeightCalculation() {
    const hostElement = this.elementRef.nativeElement as HTMLElement;
    const graphToolsLeftElement = hostElement.querySelector(
      '.graph-tools__left'
    ) as HTMLElement;

    if (!graphToolsLeftElement) return;

    const calculatePlotHeight = () => {
      const MIN_HEIGHT_REM = 21.875;
      const MAX_HEIGHT_REM = 36.875;
      const MIN_HEIGHT_PX = MIN_HEIGHT_REM * 16;
      const MAX_HEIGHT_PX = MAX_HEIGHT_REM * 16;

      const availableHeight = graphToolsLeftElement.clientHeight;

      const sixtyPercent = availableHeight * 0.6;

      const wouldOverflow = this.checkIfOverflows(
        graphToolsLeftElement,
        MIN_HEIGHT_PX
      );

      if (wouldOverflow) {
        this.plotStudioHeight.set('21.875rem');
      } else {
        const targetHeight = Math.min(sixtyPercent, MAX_HEIGHT_PX) / 16; // divided by 16 to convert back to rem
        this.plotStudioHeight.set(`${targetHeight}rem`);
      }
    };

    calculatePlotHeight();

    this.resizeObserver = new ResizeObserver(() => {
      calculatePlotHeight();
    });

    this.resizeObserver.observe(graphToolsLeftElement);
  }

  private checkIfOverflows(
    container: HTMLElement,
    plotHeight: number
  ): boolean {
    const leftElement = container.querySelector(
      '.graph-tools__left'
    ) as HTMLElement;
    if (!leftElement) return false;

    // Get all children heights except plot-view
    let otherContentHeight = 0;
    const children = Array.from(leftElement.children);

    for (const child of children) {
      if (!(child as HTMLElement).classList.contains('plot-view')) {
        otherContentHeight += (child as HTMLElement).offsetHeight;
      }
    }

    const totalHeight = plotHeight + otherContentHeight + 48; // 48px buffer for padding/gaps

    return totalHeight > container.clientHeight;
  }

  ngOnInit() {
    const studyUuid = this.route.snapshot.paramMap.get('uuid');
    const sectionUuid = this.route.snapshot.queryParamMap.get('sectionUuid');
    if (!studyUuid || !sectionUuid) {
      this.router.navigate(['/studies']);
    }
    this.studiesService.ready.subscribe((ready) => {
      if (ready && studyUuid) {
        this.subscription = this.studiesService
          .getStudyAsObservable(studyUuid)
          .subscribe((study) => {
            if (study) {
              this.plotService.study.set(study);
              const section = study.sections.find(
                (s) => s.uuid === sectionUuid
              );
              if (section) {
                this.plotService.section.set(section);
                this.plotService.plotOptionsChange(
                  'endSupport',
                  section.supports.length - 1
                );
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
    this.plotService.section.set(null);
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  debounceUpdateSliderOptions = debounce(
    (key: 'endSupport' | 'startSupport', value: number) => {
      this.plotService.plotOptionsChange(key, value);
    },
    DEBOUNCED_REFRESH_STUDIO_DELAY
  );

  openNewChargeModal(
    {
      mode,
      uuid
    }: { mode: 'create' | 'edit' | 'view'; uuid: string | null } = {
      mode: 'create',
      uuid: null
    }
  ) {
    this.isNewChargeModalOpen.set(true);
    this.newChargeModalMode.set(mode);
    this.newChargeModalUuid.set(uuid);
  }
}
