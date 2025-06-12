import { Component, computed, input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: `button[app-btn], button[app-button], a[app-btn], a[app-button]`,
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-btn',
    '[class]': 'classesList()'
  }
})
export class ButtonComponent {
  btnSize = input<'s' | 'm' | 'l'>('m');
  btnStyle = input<'base' | 'outlined' | 'text'>('base');

  classesList = computed(() => {
    const classes: string[] = [];

    classes.push(`app-btn-${this.btnSize()}`);
    classes.push(`app-btn-${this.btnStyle()}`);

    return classes.join(' ');
  });
}
