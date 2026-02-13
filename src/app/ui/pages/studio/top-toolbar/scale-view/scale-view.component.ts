import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { Popover, PopoverModule } from 'primeng/popover';
import { RadioButton } from 'primeng/radiobutton';
import { SliderModule } from 'primeng/slider';
import { Button } from 'primeng/button';

import { InputNumberComponent } from '@src/app/ui/shared/components/atoms/input-number/input-number.component';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';

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
  readonly popoverOpen = signal(false);
  readonly popoverRef = viewChild<Popover>('popover');

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

  public togglePopover(event: Event): void {
    this.popoverOpen.update((open) => !open);
    this.popoverRef()?.toggle(event);
  }

  public onValidate(): void {
    console.log('validate', this.formScaleView.value);
  }
}
