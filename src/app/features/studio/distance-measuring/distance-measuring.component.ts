/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { DistanceMeasuringService } from './distance-measuring.service';

/** Distance-measuring tab: place three points and read back the distances and angle between them. */
@Component({
  selector: 'app-distance-measuring',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    SelectModule,
    InputText,
    InputGroupModule,
    InputGroupAddonModule,
    ToggleSwitchModule,
    TranslocoModule,
    ButtonComponent,
    IconComponent,
    DecimalPipe
  ],
  templateUrl: './distance-measuring.component.html',
  styleUrl: './distance-measuring.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('expandHeight', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ])
    ])
  ]
})
export class DistanceMeasuringComponent {
  readonly service = inject(DistanceMeasuringService);
}
