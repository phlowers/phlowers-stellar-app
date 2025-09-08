import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-top-toolbar',
  templateUrl: './top-toolbar.component.html'
})
export class TopToolbarComponent {
  checked = signal<boolean>(false);
}
