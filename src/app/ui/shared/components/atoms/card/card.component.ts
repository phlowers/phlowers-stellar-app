import { Component, input, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  host: {
    '[role]': 'role()',
    '[tabindex]': 'focusable ? "0" : null'
  }
})
export class CardComponent implements OnInit {
  role = input.required<string>();

  focusable = signal<boolean>(false);

  ngOnInit(): void {
    if (this.role() === 'button' || this.role() === 'link') {
      this.focusable.set(true);
    }
  }
}
