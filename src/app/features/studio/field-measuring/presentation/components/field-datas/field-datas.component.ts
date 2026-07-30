import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SelectModule } from 'primeng/select';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { WIND_SPEED_UNIT_OPTIONS } from '../../constants';
import { buildTimeModeOptions, buildWindDirectionOptions, buildSkyCoverOptions } from '../../helpers';
import { MessageModule } from 'primeng/message';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-field-datas',
  imports: [
    FormsModule,
    InputTextModule,
    DatePickerModule,
    SelectButtonModule,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    IconComponent,
    MessageModule,
    TranslocoModule
  ],
  templateUrl: './field-datas.component.html',
  styleUrls: ['./field-datas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Component for editing field measurement data (date, wind, temperature, sky cover). */
export class FieldDatasComponent {
  /** Whether the measure name is already used by another measure. */
  isNameAlreadyTaken = input.required<boolean>();
  /** Current field measure data. */
  measureData = input.required<FieldMeasure>();
  /** Emits when a field value changes. */
  fieldChange = output<{
    field: keyof FieldMeasure;
    value: FieldMeasure[keyof FieldMeasure];
  }>();

  private readonly translocoService = inject(TranslocoService);
  private readonly activeLang = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang()
  });

  readonly windSpeedUnitOptions = WIND_SPEED_UNIT_OPTIONS;

  readonly timeModeOptions = computed(() => {
    this.activeLang();
    return buildTimeModeOptions(this.translocoService);
  });

  readonly windDirectionOptions = computed(() => {
    this.activeLang();
    return buildWindDirectionOptions(this.translocoService);
  });

  readonly skyCoverOptions = computed(() => {
    this.activeLang();
    return buildSkyCoverOptions(this.translocoService);
  });

  onFieldChange(field: keyof FieldMeasure, value: FieldMeasure[keyof FieldMeasure]): void {
    this.fieldChange.emit({ field, value });
  }
}
