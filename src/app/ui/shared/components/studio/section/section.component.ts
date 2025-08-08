import {
  Component,
  computed,
  effect,
  input,
  signal,
  untracked
} from '@angular/core';
import { GetSectionOutput } from '@src/app/core/services/worker_python/tasks/types';
import { createPlot } from './helpers/createPlot';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import { ButtonComponent } from '../../atoms/button/button.component';
import { formatData } from './helpers/formatData';
import { PlotOptions } from './helpers/types';
import { createPlotData } from './helpers/createPlotData';
import { uniq } from 'lodash';

interface SearchSupportEvent {
  value: string;
}

@Component({
  selector: 'app-section',
  templateUrl: './section.component.html',
  imports: [
    SelectModule,
    FormsModule,
    KeyFilterModule,
    MessageModule,
    ButtonComponent
  ]
})
export class Section2DComponent {
  litData = input<GetSectionOutput | null>(null);
  selectedSpan = signal<number>(0);
  options = signal<PlotOptions>({
    view: '2d',
    side: 'profile',
    startSupport: 1,
    endSupport: 2
  });

  supports = computed(() => {
    const supportsAmount = uniq(
      Object.values(this.litData()?.support ?? {})
    ).length;
    return Array.from({ length: supportsAmount }, (_, i) => ({
      item: (i + 1).toString()
    }));
  });

  errorMessage = computed(() => {
    if (this.options().startSupport >= this.options().endSupport) {
      return $localize`Error: start >= end`;
    }
    if (
      !this.supports()
        .map((s) => s.item)
        .includes(this.options().startSupport.toString())
    ) {
      return $localize`Error: start not in list`;
    }
    if (
      !this.supports()
        .map((s) => s.item)
        .includes(this.options().endSupport.toString())
    ) {
      return $localize`Error: end not in list`;
    }
    return '';
  });

  searchSupport(event: SearchSupportEvent, type: 'start' | 'end') {
    const numberValue = Number(event.value);
    if (type === 'start') {
      this.options.set({
        ...this.options(),
        startSupport: numberValue
      });
    } else {
      this.options.set({
        ...this.options(),
        endSupport: numberValue
      });
    }
  }

  refreshSection(litData: GetSectionOutput | null) {
    if (!litData) {
      return;
    }
    const myElement = document.getElementById('plotly-output');
    const width = myElement?.clientWidth ?? 0;
    const height = myElement?.clientHeight ?? 0;
    const formattedData = formatData(litData);
    const plotData = createPlotData(formattedData, untracked(this.options));
    createPlot('plotly-output', plotData, width, height);
  }

  readonly effect = effect(() => {
    this.refreshSection(this.litData());
  });
}
