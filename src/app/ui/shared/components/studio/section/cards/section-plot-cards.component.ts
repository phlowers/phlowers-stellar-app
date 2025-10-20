import { Component, computed } from '@angular/core';
import {
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/animations';
import { SectionPlotCardComponent } from './card/section-plot-card.component';
import { PlotService } from '@src/app/ui/pages/studio/plot.service';

@Component({
  selector: 'app-section-plot-cards',
  templateUrl: './section-plot-cards.component.html',
  imports: [SectionPlotCardComponent],
  styleUrl: './section-plot-cards.component.scss',
  animations: [
    trigger('expandCollapse', [
      state(
        'collapsed',
        style({
          height: '0',
          opacity: '0',
          paddingBottom: '0',
          overflow: 'hidden'
        })
      ),
      state(
        'expanded',
        style({
          height: '*',
          opacity: '1',
          paddingBottom: '0.5rem',
          overflow: 'visible'
        })
      ),
      transition('collapsed <=> expanded', [
        animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ])
    ])
  ]
})
export class SectionPlotCardsComponent {
  constructor(public readonly plotService: PlotService) {}

  arraysOfSupports = computed(() => {
    return new Array(
      this.plotService.plotOptions().endSupport -
        this.plotService.plotOptions().startSupport +
        1
    )
      .fill(0)
      .map((_, index) => index + this.plotService.plotOptions().startSupport);
  });
}
