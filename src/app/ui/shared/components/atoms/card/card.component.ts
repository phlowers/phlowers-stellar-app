import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  host: {
    '[role]': 'role()',
    '[attr.tabindex]': 'tabIndexValue()'
  }
})
/** Generic card wrapper component that sets the appropriate ARIA role and tab index on its host element. */
export class CardComponent {
  /** ARIA role applied to the host element (e.g. `'button'`, `'link'`). */
  role = input.required<string>();

  /** Computed tab index: focusable (`'0'`) when the role is `'button'` or `'link'`, otherwise `null`. */
  tabIndexValue = computed(() => {
    const roleValue = this.role();
    return roleValue === 'button' || roleValue === 'link' ? '0' : null;
  });
}
