import { ChangeDetectionStrategy, Component, effect, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { Popover, PopoverModule } from 'primeng/popover';
import { RadioButton } from 'primeng/radiobutton';
import { SliderModule } from 'primeng/slider';

import { InputNumberComponent } from '@shared/components/atoms/input-number/input-number.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { PlotService } from '@services/plot/plot.service';
import { PlotResolutionService } from '@services/plot/plot-resolution.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { ScalingFactors } from '@shared/types/plot.types';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-scale-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconComponent,
    InputNumberComponent,
    SliderModule,
    RadioButton,
    PopoverModule,
    ReactiveFormsModule,
    Popover,
    ButtonComponent,
    TranslocoModule
  ],
  templateUrl: './scale-view.component.html',
  styleUrls: ['./scale-view.component.scss']
})
export class ScaleViewComponent {
  readonly popover = viewChild<Popover>('popover');
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);
  private readonly resolutionService = inject(PlotResolutionService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  readonly popoverOpen = signal(false);
  get scaleMax(): number {
    return this.resolutionService.defaultResolution();
  }
  readonly scaleMin = 25;

  readonly sliderControl = new FormControl<number>(this.resolutionService.resolution(), { nonNullable: true });
  readonly pointsControl = new FormControl<number>(this.resolutionService.resolution(), { nonNullable: true });

  readonly formScaleView = this.fb.group({
    scale: ['auto', { nonNullable: true }],
    sliderPointsCount: this.sliderControl,
    pointsCount: this.pointsControl
  });

  private readonly sliderValue = toSignal(this.formScaleView.get('sliderPointsCount')!.valueChanges, {
    initialValue: this.resolutionService.resolution()
  });

  readonly pointsCountValue = toSignal(this.formScaleView.get('pointsCount')!.valueChanges, {
    initialValue: this.resolutionService.resolution()
  });

  constructor() {
    this.setupControlsSynchronization();
    this.setupResolutionSync();
    this.setupScaleSync();
  }

  private setupControlsSynchronization(): void {
    // Sync Slider -> Input, and persist resolution
    effect(() => {
      const val = this.sliderValue();
      if (val && val !== this.pointsControl.value) {
        this.pointsControl.setValue(val, { emitEvent: false });
        this.resolutionService.setResolution(val);
      }
    });

    // Sync Input -> Slider, and persist resolution
    effect(() => {
      const val = this.pointsCountValue();
      if (val && val !== this.sliderControl.value) {
        this.sliderControl.setValue(val, { emitEvent: false });
        this.resolutionService.setResolution(val);
      }
    });
  }

  private setupResolutionSync(): void {
    effect(() => {
      const resolution = this.resolutionService.resolution();
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
    this.popover()?.toggle(event);
  }

  private readonly scaleNormsMap: Record<string, ScalingFactors> = {
    plan: { x: 0.2, y: 1, z: 1, aspectMode: 'manual' },
    geo: { x: 1, y: 1, z: 1, aspectMode: 'manual' },
    celeste: { x: 1, y: 1, z: 0.5, aspectMode: 'manual' },
    auto: { x: 1, y: 1, z: 1, aspectMode: 'data' }
  };

  private getScaleNorms(scale: string): ScalingFactors {
    return this.scaleNormsMap[scale] ?? { x: 1, y: 1, z: 1, aspectMode: 'data' };
  }

  private getScaleNameFromFactors(factors: ScalingFactors): string {
    for (const [name, norms] of Object.entries(this.scaleNormsMap)) {
      if (
        norms.aspectMode === factors.aspectMode &&
        norms.x === factors.x &&
        norms.y === factors.y &&
        norms.z === factors.z
      ) {
        return name;
      }
    }
    return 'auto';
  }

  private setupScaleSync(): void {
    effect(() => {
      const factors = this.plotOptionsService.scalingFactors();
      const scaleName = this.getScaleNameFromFactors(factors);
      if (this.formScaleView.get('scale')?.value !== scaleName) {
        this.formScaleView.get('scale')?.setValue(scaleName, { emitEvent: false });
      }
    });
  }

  public async onValidate(): Promise<void> {
    // Close via the Popover's own hide() API. Passing a synthetic `new Event('click')`
    // to toggle() left PrimeNG with a null target, crashing on the hide-animation end
    // (`show(null)` reading `event.currentTarget`) — bug #1146.
    this.popover()?.hide();
    this.popoverOpen.set(false);

    const resolution = this.pointsControl.value;
    const scale = this.formScaleView.get('scale')?.value as string;
    this.resolutionService.setResolution(resolution);
    await this.resolutionService.applyResolution(resolution);

    const factors = this.getScaleNorms(scale);
    this.plotOptionsService.setScalingFactors(factors);

    await this.plotService.refreshProjection();
    this.popoverOpen.set(false);
  }
}
