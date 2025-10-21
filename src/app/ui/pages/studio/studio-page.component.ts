import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
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
    SpanComponent
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

  sliderOptions = computed<Options>(() => {
    return {
      floor: 0,
      ceil: 20,
      step: 1,
      showTicks: true,
      showTicksValues: true,
      animate: false,
      animateOnMove: false,
      rightToLeft: this.plotService.plotOptions().invert
    };
  });

  toggleSidebar() {
    this.sidebarOpen.set(!this.sidebarOpen());
    this.sidebarWidth.set(this.sidebarOpen() ? 300 : 0);
  }

  constructor(
    public readonly plotService: PlotService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly studiesService: StudiesService
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
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
