import { Component, input } from '@angular/core';
import { PossibleIconNames } from './icon.model';

@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
  host: {
    role: 'img',
    class: 'app-icon',
    '[attr.aria-label]': 'icon()'
  }
})
export class IconComponent {
  icon = input.required<PossibleIconNames>();
}
