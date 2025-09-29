import { Component, signal } from '@angular/core';
import { StudioComponent } from '../../shared/components/studio/studio.component';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';
import { InputNumberModule } from 'primeng/inputnumber';
import { FormsModule } from '@angular/forms';
import { StudioTopToolbarComponent } from '../../shared/components/studio/top-toolbar/top-toolbar.component';
import { SelectModule } from 'primeng/select';
import { IconComponent } from '../../shared/components/atoms/icon/icon.component';
import { PlotService } from './plot.service';

@Component({
  selector: 'app-studio-page',
  imports: [
    StudioComponent,
    NgxSliderModule,
    InputNumberModule,
    FormsModule,
    StudioTopToolbarComponent,
    SelectModule,
    IconComponent
  ],
  templateUrl: './studio-page.component.html',
  styleUrl: './studio-page.component.scss'
})
export class StudioPageComponent {
  constructor(public readonly plotService: PlotService) {}
  sidebarWidth = signal(300);
  sidebarOpen = signal(false);
  supports = signal<string>('single');
  supportsOptions = signal<string[]>(['single', 'double', 'all']);
  options = signal<Options>({
    floor: 0,
    ceil: 20,
    step: 1,
    showTicks: true,
    showTicksValues: true,
    animate: false,
    animateOnMove: false,
    rightToLeft: false
  });
  toggleSidebar() {
    this.sidebarOpen.set(!this.sidebarOpen());
    this.sidebarWidth.set(this.sidebarOpen() ? 300 : 0);
  }
}
