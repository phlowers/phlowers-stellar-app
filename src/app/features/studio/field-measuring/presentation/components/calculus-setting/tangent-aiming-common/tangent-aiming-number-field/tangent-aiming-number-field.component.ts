import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MessageModule } from 'primeng/message';
import { TranslocoModule } from '@jsverse/transloco';
import { TangentAimingFieldRule, TangentAimingNumberFieldView } from '../tangent-aiming-common.interfaces';

/** Labelled numeric input of a tangent aiming form, placed in the parent grid by its `view.area` class. */
@Component({
  selector: 'app-tangent-aiming-number-field',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    MessageModule,
    TranslocoModule
  ],
  templateUrl: './tangent-aiming-number-field.component.html',
  styleUrl: './tangent-aiming-number-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'view().area' }
})
export class TangentAimingNumberFieldComponent {
  readonly control = input.required<FormControl<number | null>>();
  readonly view = input.required<TangentAimingNumberFieldView>();
  readonly rule = input.required<TangentAimingFieldRule>();
  /** Message of the active error, computed by the parent form (empty when valid or untouched). */
  readonly error = input('');
  /** Id of the mandatory message of the form. */
  readonly mandatoryId = input.required<string>();
  /** Id of an extra description of the input, if any. */
  readonly describedBy = input<string | null>(null);

  readonly ariaDescribedBy = computed(() => [this.mandatoryId(), this.describedBy()].filter(Boolean).join(' '));
}
