import { Component, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  trigger,
  transition,
  style,
  animate
} from '@angular/animations';
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

  leftSupport = model<string | null>(null);
  spanLength = model<number | null>(null);
  measuredElevationDifference = model<number | null>(null);

  HG = model<number | null>(null);
  H1 = model<number | null>(null);
  H2 = model<number | null>(null);
  H3 = model<number | null>(null);
  HD = model<number | null>(null);

  VG = model<number | null>(null);
  V1 = model<number | null>(null);
  V2 = model<number | null>(null);
  V3 = model<number | null>(null);
  VD = model<number | null>(null);

  papotoResults = signal<boolean>(false);
  criterion = signal<boolean>(true);
}
