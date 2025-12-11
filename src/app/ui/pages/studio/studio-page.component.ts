import {
  Component,
  computed,
  ElementRef,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { debounce } from 'lodash';
import { StudiesService } from '@core/services/studies/studies.service';
import { Subscription } from 'dexie';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { StudioComponent } from '@ui/shared/components/studio/studio.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { StudioTopToolbarComponent } from './top-toolbar/top-toolbar.component';
import { StudioMenuBarComponent } from './menu-bar/menu-bar.component';
import { SectionPlotCardsComponent } from './cards/section-plot-cards.component';
import { SideTabsComponent } from './side-tabs/side-tabs.component';
import { SideTabComponent } from './side-tabs/side-tab/side-tab.component';
import { ClimateComponent } from './loads/climate/climate.component';
import { SpanComponent } from './loads/span/span.component';
import { NewChargeModalComponent } from './new-charge-modal/new-charge-modal.component';
import { ToolsDialogComponent } from './tools-dialog/tools-dialog.component';
import { PlotService } from './services/plot.service';

// debounce to make it more fluid when dragging the slider
const DEBOUNCED_REFRESH_STUDIO_DELAY = 300;

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
    ToolsDialogComponent
  ],
  templateUrl: './studio-page.component.html',
  styleUrl: './studio-page.component.scss'
})
export class StudioPageComponent implements OnInit, OnDestroy {
  sidebarWidth = signal(300);
  sidebarOpen = signal(false);
  supports = signal<string>('all');
  supportsOptions = signal<
    {
      label: string;
      value: string;
    }[]
  >([
    { label: $localize`Single`, value: 'single' },
    { label: $localize`Double`, value: 'double' },
    { label: $localize`All`, value: 'all' }
  ]);
  subscription: Subscription | null = null;
  plotStudioHeight = signal<string>('21.875rem');
  isNewChargeModalOpen = signal(false);
  newChargeModalMode = signal<'create' | 'edit' | 'view'>('create');
  newChargeModalUuid = signal<string | null>(null);
  private resizeObserver?: ResizeObserver;

  sliderOptions = computed<Options>(() => {
    return {
      floor: 0,
      ceil: (this.plotService.section()?.supports?.length ?? 100) - 1,
      step: 1,
      showTicks: true,
      showTicksValues: true,
      animate: false,
      animateOnMove: false,
      disabled: this.plotService.loading(),
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
  ) {}

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
                this.plotService.plotOptionsChange({
                  endSupport: section.supports.length - 1
                });
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
      this.plotService.plotOptionsChange({ [key]: value });
      const options = this.plotService.plotOptions();
      const diff = Math.abs(options.endSupport - options.startSupport);
      this.supports.set(diff === 1 ? 'single' : diff === 2 ? 'double' : 'all');
    },
    DEBOUNCED_REFRESH_STUDIO_DELAY
  );

  updateSliderOptions({
    value,
    highValue
  }: {
    value?: number | undefined;
    highValue?: number | undefined;
  }) {
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

  onSelectPlotOptions(value: string) {
    this.supports.set(value);
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
    const supportButton = this.supports();
    if (supportButton === 'all') return;
    const incrementValue =
      supportButton === 'single' ? 1 : supportButton === 'double' ? 2 : 0;
    const increment = direction === 'left' ? -incrementValue : incrementValue;
    const options = this.plotService.plotOptions();
    this.plotService.plotOptionsChange({
      startSupport: Math.max(options.startSupport + increment, 0),
      endSupport: Math.max(options.endSupport + increment, 0)
    });
  }
}
