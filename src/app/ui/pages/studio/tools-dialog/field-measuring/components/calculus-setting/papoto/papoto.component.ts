import { Component, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';

@Component({
  selector: 'app-papoto',
  imports: [
    FormsModule,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    IconComponent,
    ButtonComponent
  ],
  templateUrl: './papoto.component.html',
  styleUrl: './papoto.component.scss'
})
export class PapotoComponent {
  leftSupportOption = input.required<{ label: string; value: string }[]>();

  leftSupport: string | null = null;
  spanLength: number | null = null;
  measuredElevationDifference: number | null = null;

  HG: number | null = null;
  H1: number | null = null;
  H2: number | null = null;
  H3: number | null = null;
  HD: number | null = null;

  VG: number | null = null;
  V1: number | null = null;
  V2: number | null = null;
  V3: number | null = null;
  VD: number | null = null;
}
