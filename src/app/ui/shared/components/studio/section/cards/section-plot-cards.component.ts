import { Component, computed } from '@angular/core';
import { SectionPlotCardComponent } from './card/section-plot-card.component';
import { PlotService } from '@src/app/ui/pages/studio/plot.service';

@Component({
  selector: 'app-section-plot-cards',
  templateUrl: './section-plot-cards.component.html',
  imports: [SectionPlotCardComponent]
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
