import { ChangeDetectionStrategy, Component, computed, effect, inject, model, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { isEqual } from 'lodash';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { TangentAimingHeaderComponent } from '../tangent-aiming-common/tangent-aiming-header/tangent-aiming-header.component';
import { TangentAimingNumberFieldComponent } from '../tangent-aiming-common/tangent-aiming-number-field/tangent-aiming-number-field.component';
import { TangentAimingResultsComponent } from '../tangent-aiming-common/tangent-aiming-results/tangent-aiming-results.component';
import { INITIAL_LEFT_SUPPORT_STATE } from '../tangent-aiming-common/tangent-aiming-common.constantes';
import {
  buildSpanSupportOptions,
  calculateTangentAimingMock,
  getCalculatedSpanLength,
  getTangentAimingError,
  nextLeftSupportState
} from '../tangent-aiming-common/tangent-aiming-common.helpers';
import {
  TANGENT_AIMING_INTERIOR_FIELD_RULES,
  TANGENT_AIMING_INTERIOR_NUMBER_FIELDS
} from './tangent-aiming-interior.constantes';
import {
  applyTangentAimingInteriorInputs,
  createTangentAimingInteriorForm,
  invalidateTangentAimingInteriorResult,
  toTangentAimingInteriorInputs
} from './tangent-aiming-interior.helpers';

@Component({
  selector: 'app-tangent-aiming-interior',
  imports: [
    ReactiveFormsModule,
    SelectModule,
    MessageModule,
    IconComponent,
    ButtonComponent,
    DecimalPipe,
    TranslocoModule,
    TangentAimingHeaderComponent,
    TangentAimingNumberFieldComponent,
    TangentAimingResultsComponent
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

  readonly mandatoryId = 'mandatory-tangent-aiming-interior';
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
  private readonly leftSupportState = signal(INITIAL_LEFT_SUPPORT_STATE);

  /** Both supports of the selected span, empty without span (RG.VIS-INT.SUP.1/2). */
  readonly supportOptions = computed(() =>
    buildSpanSupportOptions(this.spanService.section()?.supports ?? [], this.measureData().span)
  );

  /** Span length computed by the engine for the selected span, or null when unavailable. */
  readonly calculatedSpanLength = computed(() =>
    getCalculatedSpanLength(this.measureData().span, this.plotService.litData()?.output_parameters.span_length)
  );

  constructor() {
    // A span change must not leave a left support outside the span (RG.VIS-INT.SUP.3).
    effect(() => {
      const { interiorLeftSupport, span } = this.measureData();
      const { resolved, state } = nextLeftSupportState(interiorLeftSupport, span, untracked(this.leftSupportState));
      untracked(() => this.leftSupportState.set(state));
      if (resolved !== interiorLeftSupport) {
        this.measureData.update((d) => invalidateTangentAimingInteriorResult({ ...d, interiorLeftSupport: resolved }));
      }
    });
    // Model -> form: only differing values are written, so a value being typed is never overwritten.
    effect(() => {
      const inputs = toTangentAimingInteriorInputs(this.measureData());
      if (!isEqual(this.form.getRawValue(), inputs)) {
        this.form.patchValue(inputs, { emitEvent: false });
      }
      this.isFormValid.set(this.form.valid);
    });

    // Form -> model: a change of input invalidates the previous result.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.isFormValid.set(this.form.valid);
      const inputs = this.form.getRawValue();
      this.measureData.update((d) =>
        invalidateTangentAimingInteriorResult(applyTangentAimingInteriorInputs(d, inputs))
      );
    });
  }

  /** Message of the active error of a control, once it has been touched. */
  getError(control: AbstractControl): string {
    return getTangentAimingError(control, this.translocoService);
  }

  async calculate(): Promise<void> {
    this.form.markAllAsTouched();
    if (!this.isFormValid() || this.isCalculating()) return;

    this.isCalculating.set(true);
    this.hasError.set(false);
    try {
      const { result, error } = await calculateTangentAimingMock(toTangentAimingInteriorInputs(this.measureData()));
      if (error || !result) throw new Error(error ?? 'Empty tangent aiming result');
      this.measureData.update((d) => ({ ...d, outputs: { ...d.outputs, tangentAimingInterior: result } }));
    } catch (error) {
      this.logger.error('Failed to calculate the tangent aiming (interior) parameter', error);
      this.hasError.set(true);
      this.notificationService.error(this.translocoService.translate('common.tangent-aiming-calculation-failed'));
    } finally {
      this.isCalculating.set(false);
    }
  }
}
