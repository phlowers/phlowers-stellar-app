import { Component, signal } from '@angular/core';
import { StudioComponent } from '../../shared/components/studio/studio.component';
import { NgxSliderModule, Options } from '@angular-slider/ngx-slider';

@Component({
  selector: 'app-studio-page',
  imports: [StudioComponent, NgxSliderModule],
  templateUrl: './studio.component.html',
  styleUrl: './studio.component.scss'
})
export class StudioPageComponent {
  minValue = signal(0);
  maxValue = signal(0);
  options = signal<Options>({
    floor: 0,
    ceil: 20,
    step: 1,
    showTicks: true,
    showTicksValues: true,
    animate: false,
    animateOnMove: false
  });
}
