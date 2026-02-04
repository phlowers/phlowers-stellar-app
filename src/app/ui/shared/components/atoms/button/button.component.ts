import { Component, effect, ElementRef, input, OnDestroy, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: `button[app-btn], button[app-button], a[app-btn], a[app-button]`,
  imports: [IconComponent],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-btn',
    '[class]': 'classesList()'
  }
})
/**
 * Custom button component supporting multiple sizes, styles, and a loading state.
 * Applied as an attribute directive on `<button>` or `<a>` elements.
 */
export class ButtonComponent implements OnInit, OnDestroy {
  private clickListener?: (e: Event) => void;

  constructor(private readonly elementRef: ElementRef<HTMLButtonElement | HTMLLinkElement>) {
    effect((): void => {
      const classes: string[] = [];

      classes.push(
        `app-btn-${this.btnSize()}`,
        `app-btn-${this.btnStyle()}`,
        ...(this.btnLoading() ? ['disabled app-btn-loading'] : '')
      );

      this.classesList.set(classes.join(' '));
    });
  }

  /** Button size: 's' (small), 'm' (medium), or 'l' (large). */
  btnSize = input<'s' | 'm' | 'l'>('m');
  /** Visual style variant of the button. */
  btnStyle = input<'base' | 'outlined' | 'text' | 'danger'>('base');
  /** Whether the button is in a loading state, disabling click events. */
  btnLoading = input<boolean>(false);

  classesList = signal<string>('');

  ngOnInit(): void {
    this.clickListener = (e: Event) => {
      if (this.btnLoading()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    this.elementRef.nativeElement.addEventListener('click', this.clickListener, true);
  }

  ngOnDestroy(): void {
    if (this.clickListener) {
      this.elementRef.nativeElement.removeEventListener('click', this.clickListener, true);
    }
  }
}
