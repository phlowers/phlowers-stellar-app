import { ChangeDetectionStrategy, Component, computed, inject, signal, untracked } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PlotService } from '@services/plot/plot.service';
import { CableSpanFormControls, CableWidthType } from './cable-span.interfaces';

@Component({
  selector: 'app-cable-span',
  imports: [
    ReactiveFormsModule,
    InputText,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    ButtonComponent,
    IconComponent
  ],
  templateUrl: './cable-span.html',
  styleUrl: './cable-span.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Component for configuring cable length modifications (shortening or lengthening) on a span. */
export class CableSpanComponent {
  private readonly fb = inject(FormBuilder);
  private readonly plotService = inject(PlotService);

  readonly form = this.fb.group<CableSpanFormControls>({
    scope: new FormControl<string | null>(null, { validators: [Validators.required] }),
    supportRef: new FormControl<'LEFT' | 'RIGHT' | null>(
      { value: null, disabled: true },
      { validators: [Validators.required] }
    ),
    widthCable: new FormControl<CableWidthType | null>(null, { validators: [Validators.required] }),
    sizeCable: new FormControl<number>(0, { nonNullable: true }),
    distanceSupportRef: new FormControl<number>(0, { nonNullable: true })
  });

  readonly spansOptions = computed(() => this.plotService.getSpanOptions());

  readonly supportRefOptions = signal<{ label: number; value: 'LEFT' | 'RIGHT' }[]>([]);

  readonly widthCableOptions = [
    { label: $localize`Lengthening`, value: 'lengthening' as CableWidthType },
    { label: $localize`Shortening`, value: 'shortening' as CableWidthType }
  ];

  private readonly scopeSignal = toSignal(this.form.controls.scope.valueChanges, {
    initialValue: this.form.controls.scope.value
  });

  constructor() {
    // Intentionally empty — effects set up via toSignal
  }

  onScopeChange(uuid: string | null): void {
    if (!uuid) {
      this.supportRefOptions.set([]);
      this.form.controls.supportRef.reset();
      this.form.controls.supportRef.disable({ emitEvent: false });
      return;
    }
    const index = untracked(() => this.plotService.getSupportIndex(uuid));
    if (index < 0) return;

    this.supportRefOptions.set(untracked(() => this.plotService.getSupportOptions(uuid)));
    this.form.controls.supportRef.enable({ emitEvent: false });

    this.plotService.plotOptionsChange({
      startSupport: index,
      endSupport: index + 1
    });
  }

  resetForm(): void {
    this.form.reset();
    this.form.controls.supportRef.disable({ emitEvent: false });
    this.supportRefOptions.set([]);
  }

  saveForm(): void {
    if (this.form.invalid) return;
  }

  calculate(): void {
    if (this.form.invalid) return;
  }

  deleteForm(): void {
    this.resetForm();
  }

  isFormInvalid(): boolean {
    return this.form.invalid;
  }
}
