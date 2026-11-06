/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, effect, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { TabsModule } from 'primeng/tabs';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { EffortEstimationComponent } from '@features/studio/estimations/presentation/components/effort-estimation/effort-estimation.component';
import { TemperatureEstimationComponent } from '@features/studio/estimations/presentation/components/temperature-estimation/temperature-estimation.component';
import { EstimationTab } from '@features/studio/estimations/domain/estimations.interfaces';

@Component({
  selector: 'app-estimations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TabsModule, TranslocoModule, IconComponent, TemperatureEstimationComponent, EffortEstimationComponent],
  templateUrl: './estimations.component.html'
})
/** Dialog gathering the estimation tools of the studio, one per tab. */
export class EstimationsComponent {
  readonly headerTemplate = viewChild<TemplateRef<unknown>>('header');

  private readonly toolbarDialogService = inject(ToolbarDialogService);

  readonly activeTab = signal<EstimationTab>('temperature');

  constructor() {
    effect(() => {
      const header = this.headerTemplate();
      if (header) {
        this.toolbarDialogService.setTemplates({ header });
      }
    });
  }
}
