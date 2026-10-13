import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { DecimalPipe } from '@angular/common';
import { PlotService } from '@services/plot/plot.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';

@Component({
  selector: 'app-tangent-aiming-support',
  imports: [
    FormsModule,
    SelectModule,
    SelectButtonModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    IconComponent,
    ButtonComponent,
    DecimalPipe,
    TranslocoModule
  ],
  templateUrl: './tangent-aiming-support.component.html',
  styleUrl: './tangent-aiming-support.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Form for tangent aiming (support) parameter calculation; inputs only, no calculation yet. */
export class TangentAimingSupportComponent {
  /** Available support options for the left support selector. */
  leftSupportOption = input.required<{ label: string; value: string }[]>();
  /** Field measure data model bound two-way. */
  measureData = model.required<FieldMeasure>();

  private readonly plotService = inject(PlotService);

  /** Span length computed by the engine for the selected span, or null when unavailable. */
  readonly calculatedSpanLength = computed(() => {
    const span = this.measureData().span;
    const lengths = this.plotService.litData()?.output_parameters.span_length;
    return span?.length === 2 ? (lengths?.[span[0]] ?? null) : null;
  });

  private readonly translocoService = inject(TranslocoService);
  private readonly activeLang = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang()
  });

  readonly calculationTypeOptions = computed(() => {
    this.activeLang();
    return [
      {
        label: this.translocoService.translate('common.parameter-label'),
        value: 'parametre'
      },
      {
        label: this.translocoService.translate('field-measuring.tangent-aiming-support.calculation-type-tangent'),
        value: 'tangente'
      }
    ];
  });

  updateField<K extends keyof FieldMeasure>(field: K, value: FieldMeasure[K]) {
    this.measureData.update((d) => ({ ...d, [field]: value }));
  }
}
