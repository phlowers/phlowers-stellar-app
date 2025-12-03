import { Component, input, model, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { DialogModule } from 'primeng/dialog';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { FieldMeasureData } from '../../../types';

@Component({
  selector: 'app-papoto',
  imports: [
    FormsModule,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    IconComponent,
    ButtonComponent,
    DialogModule
  ],
  templateUrl: './papoto.component.html',
  styleUrl: './papoto.component.scss',
  animations: [
    trigger('expandCollapse', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate('300ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class PapotoComponent {
  leftSupportOption = input.required<{ label: string; value: string }[]>();
  measureData = model.required<FieldMeasureData>();

  papotoHelpDialog = signal<boolean>(false);
  papotoResults = signal<boolean>(false);
  criterion = signal<boolean>(true);

  isFormValid = computed(() => {
    const data = this.measureData();
    return !!(
      data.leftSupport &&
      data.spanLength != null &&
      data.measuredElevationDifference != null &&
      data.HG != null &&
      data.H1 != null &&
      data.H2 != null &&
      data.H3 != null &&
      data.HD != null &&
      data.VG != null &&
      data.V1 != null &&
      data.V2 != null &&
      data.V3 != null &&
      data.VD != null
    );
  });

  updateField<K extends keyof FieldMeasureData>(
    field: K,
    value: FieldMeasureData[K]
  ) {
    this.measureData.update((d) => ({ ...d, [field]: value }));
  }

  openHelp() {
    this.papotoHelpDialog.set(true);
  }

  calculatePapoto() {
    const data = this.measureData();

    console.log('PAPOTO Calculation Values:', {
      leftSupport: data.leftSupport,
      spanLength: data.spanLength,
      measuredElevationDifference: data.measuredElevationDifference,
      HG: data.HG,
      H1: data.H1,
      H2: data.H2,
      H3: data.H3,
      HD: data.HD,
      VG: data.VG,
      V1: data.V1,
      V2: data.V2,
      V3: data.V3,
      VD: data.VD
    });

    this.papotoResults.set(true);
  }
}
