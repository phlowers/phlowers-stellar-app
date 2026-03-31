import { ChangeDetectionStrategy, Component, effect, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { Popover, PopoverModule } from 'primeng/popover';
import { RadioButton } from 'primeng/radiobutton';
import { SliderModule } from 'primeng/slider';
import { Button } from 'primeng/button';

import { InputNumberComponent } from '@shared/components/atoms/input-number/input-number.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { PlotService } from '@services/plot/plot.service';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { Task } from '@src/app/core/services/worker_python/tasks/types';
import { AxesNorms } from '@src/app/shared/types/plot.types';

@Component({
  selector: 'app-scale-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  readonly popover = viewChild<Popover>('popover');
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);
  private readonly workerPythonService = inject(WorkerPythonService);

  readonly popoverOpen = signal(false);
  get scaleMax(): number {
    return this.plotService.defaultResolution();
  }
  readonly scaleMin = 25;

  readonly sliderControl = new FormControl<number>(this.plotService.resolution(), { nonNullable: true });
  readonly pointsControl = new FormControl<number>(this.plotService.resolution(), { nonNullable: true });

  readonly formScaleView = this.fb.group({
    scale: ['auto', { nonNullable: true }],
    sliderPointsCount: this.sliderControl,
    pointsCount: this.pointsControl
  });

  private readonly sliderValue = toSignal(this.formScaleView.get('sliderPointsCount')!.valueChanges, {
    initialValue: this.plotService.resolution()
  });

  readonly pointsCountValue = toSignal(this.formScaleView.get('pointsCount')!.valueChanges, {
    initialValue: this.plotService.resolution()
  });

  constructor() {
    this.setupControlsSynchronization();
    this.setupResolutionSync();
  }

  private setupControlsSynchronization(): void {
    // Sync Slider -> Input, and persist resolution
    effect(() => {
      const val = this.sliderValue();
      if (val && val !== this.pointsControl.value) {
        this.pointsControl.setValue(val, { emitEvent: false });
        this.plotService.setResolution(val);
      }
    });

    // Sync Input -> Slider, and persist resolution
    effect(() => {
      const val = this.pointsCountValue();
      if (val && val !== this.sliderControl.value) {
        this.sliderControl.setValue(val, { emitEvent: false });
        this.plotService.setResolution(val);
      }
    });
  }

  private setupResolutionSync(): void {
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
    this.popover()?.toggle(event);
  }

  private readonly scaleNormsMap: Record<string, AxesNorms> = {
    plan: { x: 0.2, y: 1, z: 1, aspectMode: 'manual' },
    geo: { x: 1, y: 1, z: 1, aspectMode: 'manual' },
    celeste: { x: 1, y: 1, z: 0.5, aspectMode: 'manual' },
    auto: { x: 1, y: 1, z: 1, aspectMode: 'data' }
  };

  private async getScaleNorms(scale: string): Promise<AxesNorms> {
    const scaleNorms = this.scaleNormsMap[scale] ?? { x: 1, y: 1, z: 1, aspectMode: 'data' };
    const aspectMode = scaleNorms.aspectMode;
    const { result: result, error } = await this.workerPythonService.runTask(Task.getAspectRatio, scaleNorms);
    return error ? { x: 1, y: 1, z: 1, aspectMode: 'data' } : { ...result, aspectMode };
  }

  public async onValidate(): Promise<void> {
    this.togglePopover(new Event('click'));

    const resolution = this.pointsControl.value;
    const scale = this.formScaleView.get('scale')?.value as string;
    this.plotService.setResolution(resolution);
    await this.plotService.applyResolution(resolution);

    const norms = await this.getScaleNorms(scale);
    this.plotService.setAxesNorms(norms);

    await this.plotService.refreshProjection();
    this.popoverOpen.set(false);
  }
}
