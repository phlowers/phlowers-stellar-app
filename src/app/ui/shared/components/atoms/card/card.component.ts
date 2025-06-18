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
export class CardComponent {
  role = input.required<string>();

  tabIndexValue = computed(() => {
    const roleValue = this.role();
    return roleValue === 'button' || roleValue === 'link' ? '0' : null;
  });
}
