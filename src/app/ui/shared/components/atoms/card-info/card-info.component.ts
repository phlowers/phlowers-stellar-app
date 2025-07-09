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
export class CardInfoComponent {
  title = input.required<string>();
  statusState = input<CardState>();
  text = input.required<string>();
  linkText = input<string>();
  linkAriaLabel = input<string>();
  linkRoute = input<string>();
  additionalClass = input<string>();

  computedClass = computed(() => {
    return [
      this.statusState() ? 'card-' + this.statusState() : '',
      this.additionalClass() ?? ''
    ]
      .filter(Boolean)
      .join(' ');
  });
}
