import { Component, input } from '@angular/core';

@Component({
  selector: 'button[app-button], a[app-button]',
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  host: {
    class: 'btn-class'
  }
})
export class ButtonComponent {
  btnLabel = input.required<string>();
  btnIcon = input<string>()
}
