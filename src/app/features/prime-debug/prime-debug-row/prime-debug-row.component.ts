/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * One showcase line: renders a projected PrimeNG widget alongside its
 * name, the override class(es) it exercises, and where it's used in the app.
 */
@Component({
  selector: 'app-prime-debug-row',
  standalone: true,
  templateUrl: './prime-debug-row.component.html',
  styleUrl: './prime-debug-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrimeDebugRowComponent {
  name = input.required<string>();
  overrideClass = input<string>('base styling only');
  usage = input<string>('—');
  /** Path to a baseline screenshot of this row, captured before a PrimeNG/Angular upgrade. */
  screenshot = input<string | undefined>();
}
