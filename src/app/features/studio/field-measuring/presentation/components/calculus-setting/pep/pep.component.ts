import { ChangeDetectionStrategy, Component, computed, inject, model } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MessageModule } from 'primeng/message';
import { TranslocoModule } from '@jsverse/transloco';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { clearAutoParameter15C } from '@features/studio/field-measuring/presentation/helpers';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { getCalculatedSpanLength } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-common.helpers';
import {
  PEP_FIELD_RULES,
  PEP_MOCK_RESULT,
  PEP_SIGHTS
} from '@features/studio/field-measuring/presentation/components/calculus-setting/pep/pep.constantes';
import { PepNumericField } from '@features/studio/field-measuring/presentation/components/calculus-setting/pep/pep.interfaces';
import {
  buildPepSupportOptions,
  getPepFieldError,
  isPepDataValid
} from '@features/studio/field-measuring/presentation/components/calculus-setting/pep/pep.helpers';

@Component({
  selector: 'app-pep',
  imports: [
    FormsModule,
    DecimalPipe,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    MessageModule,
    IconComponent,
    ButtonComponent,
    TranslocoModule
  ],
  templateUrl: './pep.component.html',
  styleUrl: './pep.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Form of the PEP (Points d'Egalisation des Paramètres) calculation. The result is mocked until the engine implements PEP. */
export class PepComponent {
  /** Field measure data model bound two-way. */
  measureData = model.required<FieldMeasure>();

  private readonly spanService = inject(PlotSpanService);
  private readonly plotService = inject(PlotService);

  readonly sights = PEP_SIGHTS;

  private readonly supports = computed(() => this.spanService.section()?.supports ?? []);

  readonly leftSupportOptions = computed(() => buildPepSupportOptions(this.supports()));

  readonly isFormValid = computed(() => isPepDataValid(this.measureData()));

  /** Validation error of each numeric input. */
  readonly fieldErrors = computed(() => {
    const data = this.measureData();
    return Object.fromEntries(
      (Object.keys(PEP_FIELD_RULES) as PepNumericField[]).map((field) => [field, getPepFieldError(field, data[field])])
    ) as Record<PepNumericField, ReturnType<typeof getPepFieldError>>;
  });

  /** Span starting at the selected left support, none for the last support of the section. */
  private readonly selectedSpan = computed(() => {
    const leftIndex = Number(this.measureData().pepLeftSupport ?? Number.NaN);
    return Number.isNaN(leftIndex) || leftIndex + 1 >= this.supports().length ? null : [leftIndex, leftIndex + 1];
  });

  readonly calculatedSpanLength = computed(() =>
    getCalculatedSpanLength(this.selectedSpan(), this.plotService.litData()?.output_parameters.span_length)
  );

  /** Difference between the altitudes of the two supports of the span (same engine output as PAPOTO). */
  readonly calculatedElevation = computed(() =>
    getCalculatedSpanLength(this.selectedSpan(), this.plotService.litData()?.output_parameters.elevation)
  );

  /** Writes an input; the previous result, and the automatic 15°C one derived from it, no longer match the inputs. */
  updateField<K extends keyof FieldMeasure>(field: K, value: FieldMeasure[K]) {
    this.measureData.update((d) =>
      clearAutoParameter15C({ ...d, [field]: value, outputs: { ...d.outputs, pep: null } })
    );
  }

  calculate() {
    if (!this.isFormValid()) return;
    this.measureData.update((d) => ({ ...d, outputs: { ...d.outputs, pep: PEP_MOCK_RESULT } }));
  }
}
