import { Component, effect, input, signal } from '@angular/core';
import { GetSectionOutput } from '@src/app/core/services/worker_python/tasks/types';
import { uniq } from 'lodash';
import { createPlotData } from './helpers/createPlotData';
import { createPlot } from './helpers/createPlot';

@Component({
  selector: 'app-section',
  templateUrl: './section.component.html'
})
export class Section2DComponent {
  litData = input<GetSectionOutput | null>(null);
  selectedSpan = signal<number>(0);
  side = signal<'face' | 'profile'>('profile');

  formatData = (litData: GetSectionOutput) => {
    const litXs = Object.values(litData.x);
    const litYs = Object.values(litData.y);
    const litZs = Object.values(litData.z);
    const litTypes = Object.values(litData.type);
    const litSection = Object.values(litData.section);
    const litSupports = Object.values(litData.support);
    const uniqueSupports = uniq(Object.values(litData.support)).slice(
      this.selectedSpan(),
      this.selectedSpan() + 1
    );
    const uniqueSupportsForSupports = uniq(
      Object.values(litData.support)
    ).slice(this.selectedSpan(), this.selectedSpan() + 2);
    const data = createPlotData({
      litXs,
      litYs,
      litZs,
      litTypes,
      litSection,
      litSupports,
      uniqueSupports,
      uniqueSupportsForSupports,
      side: this.side()
    });
    return data;
  };

  readonly effect = effect(() => {
    const litData = this.litData();
    const myElement = document.getElementById('plotly-output');
    const width = myElement?.clientWidth ?? 0;
    const height = myElement?.clientHeight ?? 0;

    if (litData) {
      const data = this.formatData(litData);
      createPlot('plotly-output', data, width, height);
    }
  });
}
