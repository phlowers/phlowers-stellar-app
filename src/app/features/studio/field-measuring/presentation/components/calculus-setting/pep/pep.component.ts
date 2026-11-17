import { ChangeDetectionStrategy, Component, computed, inject, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { TranslocoModule } from '@jsverse/transloco';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { buildSpanSupportOptions } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-common.helpers';
import { PEP_SIGHTS } from '@features/studio/field-measuring/presentation/components/calculus-setting/pep/pep.constantes';

@Component({
  selector: 'app-pep',
  imports: [
    FormsModule,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    IconComponent,
    ButtonComponent,
    TranslocoModule
  ],
  templateUrl: './pep.component.html',
  styleUrl: './pep.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Form of the PEP (Points d'Egalisation des Paramètres) calculation. The engine calculation is not available yet. */
export class PepComponent {
  /** Field measure data model bound two-way. */
  measureData = model.required<FieldMeasure>();

  private readonly spanService = inject(PlotSpanService);

  readonly sights = PEP_SIGHTS;

  readonly leftSupportOptions = computed(() =>
    buildSpanSupportOptions(this.spanService.section()?.supports ?? [], this.measureData().span)
  );

  updateField<K extends keyof FieldMeasure>(field: K, value: FieldMeasure[K]) {
    this.measureData.update((d) => ({ ...d, [field]: value }));
  }
}
