/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputText } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TranslocoModule } from '@jsverse/transloco';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { FloorFormService } from '@services/floor-form/floor-form.service';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { FreePositioningToggleComponent } from '@features/studio/core/presentation/components/free-positioning-toggle/free-positioning-toggle.component';

/** Floor tab: select a span and its reference support. */
@Component({
  selector: 'app-floor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    SelectModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputText,
    ToggleSwitchModule,
    ButtonComponent,
    IconComponent,
    DecimalPipe,
    TranslocoModule,
    FreePositioningToggleComponent
  ],
  templateUrl: './floor.component.html',
  styleUrl: './floor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloorComponent {
  readonly plotOptionsService = inject(PlotOptionsService);
  readonly floorFormService = inject(FloorFormService);
  private readonly spanService = inject(PlotSpanService);

  /** Index of the span currently selected in the tab; frozen when free positioning is switched on. */
  readonly selectedSpanIndex = computed(() => {
    const uuid = this.floorFormService.spanValue();
    if (!uuid) {
      return null;
    }
    const index = this.spanService.getSupportIndex(uuid);
    return index >= 0 ? index : null;
  });

  /** Leaves floor free positioning mode once its last free point is removed, since there's nothing left to place. */
  private readonly clearFreePositioningWhenNoPointsEffect = effect(() => {
    const hasEditablePoints = this.floorFormService.hasEditablePoints();
    const source = this.plotOptionsService.freePositioningSource();
    if (!hasEditablePoints && source === 'floor') {
      untracked(() => this.plotOptionsService.setFreePositioningMode(false, 'floor'));
    }
  });

  /** Toggles free positioning mode on/off, tagging this session as floor-driven so the right plot renders. */
  setFreePositioningMode(enabled: boolean): void {
    this.plotOptionsService.setFreePositioningMode(enabled, 'floor');
  }
}
