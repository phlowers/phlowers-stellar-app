import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  host: {
    '[attr.role]': 'role()',
    '[attr.tabindex]': 'tabIndexValue()'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Generic card wrapper component with configurable ARIA role and keyboard accessibility. */
export class CardComponent {
  /** ARIA role for the card element (e.g. 'button', 'link'). */
  role = input.required<string>();

  /** Computed tab index: focusable when role is 'button' or 'link', otherwise null. */
  tabIndexValue = computed(() => {
    const roleValue = this.role();
    return roleValue === 'button' || roleValue === 'link' ? '0' : null;
  });
}
