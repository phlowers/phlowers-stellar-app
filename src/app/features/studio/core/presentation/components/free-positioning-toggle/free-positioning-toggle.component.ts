/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TranslocoModule } from '@jsverse/transloco';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotService } from '@services/plot/plot.service';
import { FreePositioningSource } from '@features/studio/core/presentation/components/free-positioning/free-positioning.interfaces';

/** Toggle switch shared by every studio tab driving free positioning mode (obstacle, floor, loads, distance). */
@Component({
  selector: 'app-free-positioning-toggle',
  standalone: true,
  imports: [FormsModule, ToggleSwitchModule, TranslocoModule],
  templateUrl: './free-positioning-toggle.component.html',
  styleUrl: './free-positioning-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreePositioningToggleComponent {
  readonly plotOptionsService = inject(PlotOptionsService);
  private readonly plotService = inject(PlotService);

  /** Feature owning this toggle instance; passed on every mode change. */
  readonly source = input.required<FreePositioningSource>();
  readonly disabled = input<boolean>(false);
  /** Span index selected in the owning tab; frozen as the fp span when the mode is switched on. */
  readonly spanIndex = input<number | null>(null);
  /** Full transloco key for the visible label (e.g. 'studio.floor.free-positioning-label'). */
  readonly labelKey = input.required<string>();
  readonly inputId = input<string>('freePositioning');

  onChange(enabled: boolean): void {
    if (enabled) {
      // Reproject in 2D on the tab-selected (frozen) span so litData's x-origin is that span's
      // left support. Free positioning needs span-projected 2D coordinates, and the reference
      // support must follow the tab selection, not the studio's last-shown span.
      const span = this.spanIndex() ?? this.plotOptionsService.plotOptions().startSupport;
      this.plotService.plotOptionsChange({ view: '2d', startSupport: span, endSupport: span + 1 });
    }
    this.plotOptionsService.setFreePositioningMode(enabled, this.source(), this.spanIndex());
  }
}
