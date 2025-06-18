import { Component, input } from '@angular/core';
import { PossibleIconNames } from '../../../model/icons/icon.model';

@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.component.html',
  host: {
    role: 'img',
    class: 'app-icon',
    '[attr.aria-label]': 'icon()'
  }
})
export class IconComponent {
  icon = input.required<PossibleIconNames>();
}
