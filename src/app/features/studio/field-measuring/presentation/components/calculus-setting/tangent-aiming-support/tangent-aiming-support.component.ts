import { ChangeDetectionStrategy, Component, computed, effect, inject, model, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
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
  buildCalculationTypeOptions,
  buildSpanSupportOptions,
  calculateTangentAimingMock,
  getCalculatedSpanLength,
  getTangentAimingError,
  nextLeftSupportState,
  syncDisplayedControls
} from '../tangent-aiming-common/tangent-aiming-common.helpers';
import {
  TANGENT_AIMING_SUPPORT_FIELD_RULES,
  TANGENT_AIMING_SUPPORT_NUMBER_FIELDS
} from './tangent-aiming-support.constantes';
import {
  createTangentAimingSupportForm,
  getDisplayedInputFields,
  toTangentAimingSupportInputs
} from './tangent-aiming-support.helpers';

@Component({
  selector: 'app-tangent-aiming-support',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    SelectModule,
    SelectButtonModule,
    MessageModule,
    IconComponent,
    ButtonComponent,
    DecimalPipe,
    TranslocoModule,
    TangentAimingHeaderComponent,
    TangentAimingNumberFieldComponent,
    TangentAimingResultsComponent
  ],
  templateUrl: './tangent-aiming-support.component.html',
  styleUrl: './tangent-aiming-support.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Form for the tangent aiming (support) parameter calculation. */
export class TangentAimingSupportComponent {
  /** Field measure data model bound two-way. */
  measureData = model.required<FieldMeasure>();

  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly logger = inject(LoggerService);
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);
  private readonly activeLang = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang()
  });

  readonly mandatoryId = 'mandatory-tangent-aiming-support';
  readonly fields = TANGENT_AIMING_SUPPORT_NUMBER_FIELDS;
  readonly rules = TANGENT_AIMING_SUPPORT_FIELD_RULES;
  readonly form = createTangentAimingSupportForm();
  readonly isFormValid = signal(false);
  readonly isCalculating = signal(false);
  readonly hasError = signal(false);

  /** The calculate button is only usable when an input changed since the last calculation (a change clears the result). */
  readonly canCalculate = computed(
    () => this.isFormValid() && !this.isCalculating() && this.measureData().outputs.tangentAimingSupport === null
  );
  private readonly leftSupportState = signal(INITIAL_LEFT_SUPPORT_STATE);

  /** Both supports of the selected span, empty without span (RG.VIS-SUP.SUP.1/2). */
  readonly supportOptions = computed(() =>
    buildSpanSupportOptions(this.spanService.section()?.supports ?? [], this.measureData().span)
  );
  readonly showParameterField = computed(() => this.measureData().calculationType === 'parametre');
  readonly showTangentAngleField = computed(() => this.measureData().calculationType === 'tangente');

  /** Span length computed by the engine for the selected span, or null when unavailable. */
  readonly calculatedSpanLength = computed(() =>
    getCalculatedSpanLength(this.measureData().span, this.plotService.litData()?.output_parameters.span_length)
  );

  readonly calculationTypeOptions = computed(() => {
    this.activeLang();
    return buildCalculationTypeOptions(this.translocoService);
  });

  constructor() {
    // A span change must not leave a left support outside the span (RG.VIS-SUP.SUP.3).
    effect(() => {
      const { tangentLeftSupport, span } = this.measureData();
      const { resolved, state } = nextLeftSupportState(tangentLeftSupport, span, untracked(this.leftSupportState));
      untracked(() => this.leftSupportState.set(state));
      if (resolved !== tangentLeftSupport) {
        this.measureData.update((d) => ({
          ...d,
          tangentLeftSupport: resolved,
          outputs: { ...d.outputs, tangentAimingSupport: null }
        }));
      }
    });

    // Model -> form: only differing values are written, so a value being typed is never overwritten.
    effect(() => {
      const data = this.measureData();
      const displayed = getDisplayedInputFields(data.calculationType);
      syncDisplayedControls(this.form, displayed);
      for (const field of displayed) {
        const value = data[field] ?? null;
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
      this.measureData.update((d) => ({
        ...d,
        ...Object.fromEntries(getDisplayedInputFields(d.calculationType).map((field) => [field, values[field]])),
        outputs: { ...d.outputs, tangentAimingSupport: null }
      }));
    });
  }

  updateCalculationType(calculationType: FieldMeasure['calculationType']): void {
    this.measureData.update((d) => ({
      ...d,
      calculationType,
      outputs: { ...d.outputs, tangentAimingSupport: null }
    }));
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
      const { result, error } = await calculateTangentAimingMock(toTangentAimingSupportInputs(this.measureData()));
      if (error || !result) throw new Error(error ?? 'Empty tangent aiming result');
      this.measureData.update((d) => ({ ...d, outputs: { ...d.outputs, tangentAimingSupport: result } }));
    } catch (error) {
      this.logger.error('Failed to calculate the tangent aiming (support) parameter', error);
      this.hasError.set(true);
      this.notificationService.error(this.translocoService.translate('common.tangent-aiming-calculation-failed'));
    } finally {
      this.isCalculating.set(false);
    }
  }
}
