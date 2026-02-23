import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { CardState } from '@ui/shared/model/card-info.model';

@Component({
  selector: 'app-card-info',
  imports: [CommonModule, RouterLink, IconComponent, ButtonComponent],
  templateUrl: './card-info.component.html',
  styleUrl: './card-info.component.scss'
})
/** Informational card component that displays a title, descriptive text, an optional status badge, and an optional link. */
export class CardInfoComponent {
  /** Title displayed at the top of the card. */
  title = input.required<string>();
  /** Visual state applied to the card (e.g. success, warning, error). */
  statusState = input<CardState>();
  /** Main descriptive text content of the card. */
  text = input.required<string>();
  /** Label for the optional link displayed in the card. */
  linkText = input<string>();
  /** Accessible label for the optional link. */
  linkAriaLabel = input<string>();
  /** Router path the optional link navigates to. */
  linkRoute = input<string>();
  /** Extra CSS class(es) appended to the card element. */
  additionalClass = input<string>();

  /** Combined CSS class string derived from the status state and any additional classes. */
  computedClass = computed(() => {
    return [this.statusState() ? 'card-' + this.statusState() : '', this.additionalClass() ?? '']
      .filter(Boolean)
      .join(' ');
  });
}
