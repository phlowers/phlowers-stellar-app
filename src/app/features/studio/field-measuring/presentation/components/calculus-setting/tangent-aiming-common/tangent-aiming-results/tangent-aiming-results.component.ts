import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MessageModule } from 'primeng/message';
import { TranslocoModule } from '@jsverse/transloco';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { TangentAimingSupportResult } from '@features/studio/field-measuring/domain/types';

/** Calculation error and results (parameter, uncertainty, criterion) of a tangent aiming form. */
@Component({
  selector: 'app-tangent-aiming-results',
  imports: [DecimalPipe, MessageModule, IconComponent, TranslocoModule],
  templateUrl: './tangent-aiming-results.component.html',
  styleUrl: './tangent-aiming-results.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TangentAimingResultsComponent {
  readonly result = input<TangentAimingSupportResult | null>(null);
  readonly hasError = input(false);
  /** Transloco key of the calculation failure message (one per tangent aiming mode). */
  readonly errorKey = input.required<string>();
  readonly isCalculating = input(false);
  /** Prefix of the result `data-testid`s, e.g. `tangent-aiming-support`. */
  readonly testIdPrefix = input.required<string>();
  /** `percent`: rounded uncertainty and criterion in % (support); `validity`: 1-decimal uncertainty and yes/no criterion. */
  readonly format = input<'percent' | 'validity'>('validity');
}
