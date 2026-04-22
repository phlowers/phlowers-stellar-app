import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { SectionPlotCardComponent } from './card/section-plot-card.component';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { GetSectionOutput } from '@services/worker_python/tasks/types';

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
          overflow: 'hidden'
        })
      ),
      transition('collapsed <=> expanded', [animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)')])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Container component that renders `SectionPlotCardComponent` cards for visible supports and spans. */
export class SectionPlotCardsComponent {
  litData = signal<GetSectionOutput | null>(null);
  readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  constructor() {
    effect(() => {
      const litData = this.plotService.litData();
      if (!litData) {
        return;
      }
      this.litData.set(litData);
    });
  }

  arraysOfSupports = computed(() => {
    if (!this.spanService.section()) {
      return [];
    }
    const array = new Array(
      this.plotOptionsService.plotOptions().endSupport - this.plotOptionsService.plotOptions().startSupport + 1
    )
      .fill(0)
      .map((_, index) => index + this.plotOptionsService.plotOptions().startSupport);
    if (array.length > 3) {
      return [];
    }
    return this.plotOptionsService.plotOptions().invert ? [...array].reverse() : array;
  });

  /** Returns the correct span index between two adjacent supports in the iteration. */
  spanIndex(loopIndex: number): number {
    const supports = this.arraysOfSupports();
    return Math.min(supports[loopIndex], supports[loopIndex + 1]);
  }
}
