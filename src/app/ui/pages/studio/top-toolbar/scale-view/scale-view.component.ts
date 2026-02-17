import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { Popover, PopoverModule } from 'primeng/popover';
import { RadioButton } from 'primeng/radiobutton';
import { SliderModule } from 'primeng/slider';
import { Button } from 'primeng/button';

import { InputNumberComponent } from '@src/app/ui/shared/components/atoms/input-number/input-number.component';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { PlotService } from '@ui/pages/studio/services/plot.service';

@Component({
  selector: 'app-scale-view',
  standalone: true,
  imports: [
    Button,
    IconComponent,
    InputNumberComponent,
    SliderModule,
    RadioButton,
    PopoverModule,
    ReactiveFormsModule,
    Popover
  ],
  templateUrl: './scale-view.component.html',
  styleUrls: ['./scale-view.component.scss']
})
export class ScaleViewComponent {
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);
  readonly popoverOpen = signal(false);
  readonly popoverRef = viewChild<Popover>('popover');
  readonly scaleMax = 250;
  readonly scaleMin = 25;

  readonly sliderControl = new FormControl<number>(30, {
    nonNullable: true
  });
  readonly pointsControl = new FormControl<number>(30, {
    nonNullable: true
  });

  readonly formScaleView = this.fb.group({
    scale: ['plan', { nonNullable: true }],
    sliderPointsCount: this.sliderControl,
    pointsCount: this.pointsControl
  });

  private readonly sliderValue = toSignal(
    this.formScaleView.get('sliderPointsCount')!.valueChanges,
    {
      initialValue: 30
    }
  );

  readonly pointsCountValue = toSignal(
    this.formScaleView.get('pointsCount')!.valueChanges,
    {
      initialValue: 30
    }
  );

  constructor() {
    this.setupControlsSynchronization();
    this.setupResolutionSync();
  }

  private setupControlsSynchronization(): void {
    // Synchro Slider -> Input
    effect(() => {
      const val = this.sliderValue();
      if (val && val !== this.pointsControl.value) {
        this.pointsControl.setValue(val, { emitEvent: false });
      }
    });

    // Synchro Input -> Slider
    effect(() => {
      const val = this.pointsCountValue();
      if (val && val !== this.sliderControl.value) {
        this.sliderControl.setValue(val, { emitEvent: false });
      }
    });
  }

  private setupResolutionSync(): void {
    const initialResolution = this.plotService.resolution();
    this.sliderControl.setValue(initialResolution, { emitEvent: false });
    this.pointsControl.setValue(initialResolution, { emitEvent: false });

    effect(() => {
      const resolution = this.plotService.resolution();
      if (resolution !== this.sliderControl.value) {
        this.sliderControl.setValue(resolution, { emitEvent: false });
      }
      if (resolution !== this.pointsControl.value) {
        this.pointsControl.setValue(resolution, { emitEvent: false });
      }
    });
  }

  public togglePopover(event: Event): void {
    this.popoverOpen.update((open) => !open);
    this.popoverRef()?.toggle(event);
  }

  public onValidate(): void {
    this.plotService.setResolution(this.pointsControl.value);
  }
}
