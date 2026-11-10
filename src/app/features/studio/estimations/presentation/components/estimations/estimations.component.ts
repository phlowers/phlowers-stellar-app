/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
  TemplateRef,
  viewChild
} from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { TabsModule } from 'primeng/tabs';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { DEFAULT_ESTIMATION_TAB, ESTIMATION_TABS } from '@features/studio/estimations/domain/estimations.constantes';
import { EstimationTabValue } from '@features/studio/estimations/domain/estimations.interfaces';
import { TemperatureEstimationComponent } from '@features/studio/estimations/presentation/components/temperature-estimation/temperature-estimation.component';

@Component({
  selector: 'app-estimations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoModule, TabsModule, IconComponent, TemperatureEstimationComponent],
  templateUrl: './estimations.component.html'
})
/** "Estimations" studio tool dialog: one tab per estimation (US.EST). */
export class EstimationsComponent {
  readonly headerTemplate = viewChild<TemplateRef<unknown>>('header');

  private readonly toolbarDialogService = inject(ToolbarDialogService);

  readonly tabs = ESTIMATION_TABS;
  readonly activeTab = signal<EstimationTabValue>(DEFAULT_ESTIMATION_TAB);

  constructor() {
    effect(() => {
      const header = this.headerTemplate();
      if (header) {
        this.toolbarDialogService.setTemplates({ header });
      }
    });

    inject(DestroyRef).onDestroy(() => this.toolbarDialogService.setTemplates({}));
  }
}
