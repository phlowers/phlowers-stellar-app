import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { RouterLink } from '@angular/router';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { CardState } from '@shared/model/card-info.model';

@Component({
  selector: 'app-card-info',
  imports: [RouterLink, IconComponent, ButtonComponent],
  templateUrl: './card-info.component.html',
  styleUrl: './card-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Informational card component displaying a title, status, text, and an optional link. */
export class CardInfoComponent {
  /** Card title text. */
  title = input.required<string>();
  /** Visual status state controlling the card's style (success, warning, error, unknown). */
  statusState = input<CardState>();
  /** Main descriptive text displayed in the card. */
  text = input.required<string>();
  /** Text for the optional action link. */
  linkText = input<string>();
  /** Aria label for the optional action link. */
  linkAriaLabel = input<string>();
  /** Route path for the optional action link. */
  linkRoute = input<string>();
  /** Additional CSS class appended to the card element. */
  additionalClass = input<string>();

  computedClass = computed(() => {
    return [this.statusState() ? 'card-' + this.statusState() : '', this.additionalClass() ?? '']
      .filter(Boolean)
      .join(' ');
  });
}
