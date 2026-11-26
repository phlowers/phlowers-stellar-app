import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';

/** Header of a tangent aiming form: help button and mandatory data message. */
@Component({
  selector: 'app-tangent-aiming-header',
  imports: [IconComponent, ButtonComponent, TranslocoModule],
  templateUrl: './tangent-aiming-header.component.html',
  styleUrl: './tangent-aiming-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TangentAimingHeaderComponent {
  /** Id of the mandatory message, referenced by the `aria-describedby` of the form inputs. */
  readonly mandatoryId = input.required<string>();
}
