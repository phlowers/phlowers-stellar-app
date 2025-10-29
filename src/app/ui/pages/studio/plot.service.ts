import { Injectable, signal } from '@angular/core';
import { Section } from '@core/data/database/interfaces/section';
import { Study } from '@core/data/database/interfaces/study';
import { PlotOptions } from '@src/app/ui/shared/components/studio/section/helpers/types';

@Injectable({
  providedIn: 'root'
})
export class PlotService {
  study = signal<Study | null>(null);
  section = signal<Section | null>(null);
  plotOptions = signal<PlotOptions>({
    view: '3d',
    side: 'profile',
    startSupport: 0,
    endSupport: 1,
    invert: false
  });
  isSidebarOpen = signal(false);

  plotOptionsChange(
    key: keyof PlotOptions,
    value: PlotOptions[keyof PlotOptions]
  ) {
    this.plotOptions.set({ ...this.plotOptions(), [key]: value });
  }
}
