import { ChangeDetectionStrategy, Component, computed, effect, inject, model, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MessageModule } from 'primeng/message';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { getNumberInputErrorParams } from '@shared/helpers/formErrors.helpers';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import {
  buildSpanSupportOptions,
  getSpanKey,
  LeftSupportSnapshot,
  resolveSpanLeftSupport
} from '../tangent-aiming-support/tangent-aiming-support.helpers';
import {
  TANGENT_AIMING_INTERIOR_FIELD_RULES,
  TANGENT_AIMING_INTERIOR_MODEL_FIELDS,
  TANGENT_AIMING_INTERIOR_NUMBER_FIELDS
} from './tangent-aiming-interior.constantes';
import {
  calculateTangentAimingInteriorMock,
  createTangentAimingInteriorForm,
  invalidateTangentAimingInteriorResult,
  TANGENT_AIMING_INTERIOR_INPUT_FIELDS,
  toTangentAimingInteriorInputs
} from './tangent-aiming-interior.helpers';

@Component({
  selector: 'app-tangent-aiming-interior',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgTemplateOutlet,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    MessageModule,
    IconComponent,
    ButtonComponent,
    DecimalPipe,
    TranslocoModule
  ],
  templateUrl: './tangent-aiming-interior.component.html',
  styleUrl: './tangent-aiming-interior.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Form for the tangent aiming (interior) parameter calculation. */
export class TangentAimingInteriorComponent {
  /** Field measure data model bound two-way. */
  measureData = model.required<FieldMeasure>();

  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly logger = inject(LoggerService);
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  readonly fields = TANGENT_AIMING_INTERIOR_NUMBER_FIELDS;
  readonly rules = TANGENT_AIMING_INTERIOR_FIELD_RULES;
  readonly form = createTangentAimingInteriorForm();
  readonly isFormValid = signal(false);
  readonly isCalculating = signal(false);
  readonly hasError = signal(false);

  /** The calculate button is only usable when an input changed since the last calculation (a change clears the result). */
  readonly canCalculate = computed(
    () => this.isFormValid() && !this.isCalculating() && this.measureData().outputs.tangentAimingInterior === null
  );
  /** Left support chosen by the user for each span (by span key), restored when the span is selected again. */
  private readonly leftSupportMemory = signal<Record<string, string>>({});
  private readonly lastLeftSupport = signal<LeftSupportSnapshot | null>(null);

  /** Both supports of the selected span, empty without span (RG.VIS-INT.SUP.1/2). */
  readonly supportOptions = computed(() =>
    buildSpanSupportOptions(this.spanService.section()?.supports ?? [], this.measureData().span)
  );

  /** Span length computed by the engine for the selected span, or null when unavailable. */
  readonly calculatedSpanLength = computed(() => {
    const span = this.measureData().span;
    const lengths = this.plotService.litData()?.output_parameters.span_length;
    return span?.length === 2 ? (lengths?.[span[0]] ?? null) : null;
  });

  constructor() {
    // A span change must not leave a left support outside the span (RG.VIS-INT.SUP.3).
    effect(() => {
      const { interiorLeftSupport, span } = this.measureData();
      const { spanKey, previous, memory } = untracked(() => ({
        spanKey: getSpanKey(span),
        previous: this.lastLeftSupport(),
        memory: this.leftSupportMemory()
      }));
      const resolved = resolveSpanLeftSupport(interiorLeftSupport, span, previous, memory);
      untracked(() => {
        // The left support kept for a span is the one the user will find again when selecting it back.
        if (resolved === interiorLeftSupport && resolved !== null) {
          this.leftSupportMemory.update((m) => ({ ...m, [spanKey]: resolved }));
        }
        this.lastLeftSupport.set({ spanKey, leftSupport: resolved });
      });
      if (resolved !== interiorLeftSupport) {
        this.measureData.update((d) => invalidateTangentAimingInteriorResult({ ...d, interiorLeftSupport: resolved }));
      }
    });
    // Model -> form: only differing values are written, so a value being typed is never overwritten.
    effect(() => {
      const data = this.measureData();
      for (const field of TANGENT_AIMING_INTERIOR_INPUT_FIELDS) {
        const value = data[TANGENT_AIMING_INTERIOR_MODEL_FIELDS[field]] ?? null;
        if (this.form.controls[field].value !== value) {
          this.form.controls[field].setValue(value as never, { emitEvent: false });
        }
      }
      this.isFormValid.set(this.form.valid);
    });

    // Form -> model: a change of input invalidates the previous result.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.isFormValid.set(this.form.valid);
      const values = this.form.getRawValue();
      this.measureData.update((d) =>
        invalidateTangentAimingInteriorResult({
          ...d,
          ...Object.fromEntries(
            TANGENT_AIMING_INTERIOR_INPUT_FIELDS.map((field) => [
              TANGENT_AIMING_INTERIOR_MODEL_FIELDS[field],
              values[field]
            ])
          )
        })
      );
    });
  }

  /** Message of the active error of a control, once it has been touched. */
  getError(control: AbstractControl): string {
    if (!control.touched && !control.dirty) return '';
    if (control.errors?.['required']) return this.translocoService.translate('common.required');
    const numberError = getNumberInputErrorParams(control);
    return numberError ? this.translocoService.translate(numberError.key, numberError.params) : '';
  }

  async calculate(): Promise<void> {
    this.form.markAllAsTouched();
    if (!this.isFormValid() || this.isCalculating()) return;

    this.isCalculating.set(true);
    this.hasError.set(false);
    try {
      const { result, error } = await calculateTangentAimingInteriorMock(
        toTangentAimingInteriorInputs(this.measureData())
      );
      if (error || !result) throw new Error(error ?? 'Empty tangent aiming result');
      this.measureData.update((d) => ({ ...d, outputs: { ...d.outputs, tangentAimingInterior: result } }));
    } catch (error) {
      this.logger.error('Failed to calculate the tangent aiming (interior) parameter', error);
      this.hasError.set(true);
      this.notificationService.error(
        this.translocoService.translate('common.tangent-aiming-calculation-failed')
      );
    } finally {
      this.isCalculating.set(false);
    }
  }
}
