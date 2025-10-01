import { Injectable, signal } from '@angular/core';
import { PlotOptions } from '@src/app/ui/shared/components/studio/section/helpers/types';

@Injectable({
  providedIn: 'root'
})
export class PlotService {
  plotOptions = signal<PlotOptions>({
    view: '3d',
    side: 'profile',
    startSupport: 0,
    endSupport: 1,
    invert: false
  });

  plotOptionsChange(
    key: keyof PlotOptions,
    value: PlotOptions[keyof PlotOptions]
  ) {
    this.plotOptions.set({ ...this.plotOptions(), [key]: value });
  }
}
