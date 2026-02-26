import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Component, effect, inject, signal, ViewChild } from '@angular/core';
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
  @ViewChild('popover') popover!: Popover;
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);
  readonly popoverOpen = signal(false);
  readonly scaleMax = 250;
  readonly scaleMin = 25;

  readonly sliderControl = new FormControl<number>(30, {
    nonNullable: true
  });
  readonly pointsControl = new FormControl<number>(30, {
    nonNullable: true
  });

  readonly formScaleView = this.fb.group({
    scale: ['auto', { nonNullable: true }],
    sliderPointsCount: this.sliderControl,
    pointsCount: this.pointsControl
  });

  private readonly sliderValue = toSignal(this.formScaleView.get('sliderPointsCount')!.valueChanges, {
    initialValue: 30
  });

  readonly pointsCountValue = toSignal(this.formScaleView.get('pointsCount')!.valueChanges, {
    initialValue: 30
  });

  // Initialisation of effects to synchronize controls and resolution
  private readonly _syncControls = this.setupControlsSynchronization();
  private readonly _syncResolution = this.setupResolutionSync();

  private setupControlsSynchronization(): void {
    // Sync Slider -> Input
    effect(() => {
      const val = this.sliderValue();
      if (val && val !== this.pointsControl.value) {
        this.pointsControl.setValue(val, { emitEvent: false });
      }
    });

    // Sync Input -> Slider
    effect(() => {
      const val = this.pointsCountValue();
      if (val && val !== this.sliderControl.value) {
        this.sliderControl.setValue(val, { emitEvent: false });
      }
    });
  }

  // Effect to synchronize the resolution from the PlotService to the controls
  private setupResolutionSync(): void {
    const initialResolution = this.plotService.resolution();
    this.sliderControl.setValue(initialResolution, { emitEvent: false });
    this.pointsControl.setValue(initialResolution, { emitEvent: false });
    // Sync PlotService resolution -> Controls
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

  // Method to toggle the popover visibility
  public togglePopover(event: Event): void {
    this.popoverOpen.update((open) => !open);
    this.popover?.toggle(event);
  }

  /**
   * Returns the axis norms according to the selected scale
   * "plan": x/5, y, z=y
   * "geo": x, y, z
   * "celeste": x, y=x, z/2
   * "auto": x, y, z with aspect mode set to 'data' (equal scaling based on data range)
   */
  private readonly scaleNormsMap: Record<string, { x: number; y: number; z: number; aspectMode: string }> = {
    plan: { x: 0.2, y: 1, z: 1, aspectMode: 'manual' },
    geo: { x: 1, y: 1, z: 1, aspectMode: 'manual' },
    celeste: { x: 1, y: 1, z: 0.5, aspectMode: 'manual' },
    auto: { x: 1, y: 1, z: 1, aspectMode: 'data' }
  };

  // Method to get the axis norms based on the selected scale
  private getScaleNorms(scale: string): { x: number; y: number; z: number; aspectMode: string } {
    return this.scaleNormsMap[scale] ?? { x: 1, y: 1, z: 1, aspectMode: 'data' };
  }

  public async onValidate(): Promise<void> {
    this.togglePopover(new Event('click')); // Close the popover after validation

    const resolution = this.pointsControl.value;
    const scale = this.formScaleView.get('scale')?.value as string;
    // Apply the resolution
    this.plotService.setResolution(resolution);
    await this.plotService.applyResolution(resolution);

    // Apply the axis norms according to the scale
    const norms = this.getScaleNorms(scale);
    await this.plotService.setAxesNorms(norms);

    // Refresh the graphical projection
    await this.plotService.refreshProjection();
  }
}
