import { Component, computed, ElementRef, input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
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
 * Attribute-based button component applied to `<button>` or `<a>` elements.
 * Supports multiple sizes, style variants, and a loading state that blocks user interaction.
 */
export class ButtonComponent implements OnInit, OnDestroy {
  private clickListener?: (e: Event) => void;

  constructor(private readonly elementRef: ElementRef<HTMLButtonElement | HTMLLinkElement>) {}

  /** Size of the button: `'s'` (small), `'m'` (medium), or `'l'` (large). */
  btnSize = input<'s' | 'm' | 'l'>('m');
  /** Visual style variant of the button. */
  btnStyle = input<'base' | 'outlined' | 'text' | 'danger'>('base');
  /** When `true`, the button enters a loading state that prevents clicks. */
  btnLoading = input<boolean>(false);

  /** Computed CSS class list derived from size, style, and loading state. */
  classesList = computed(() => {
    const classes: string[] = [];

    classes.push(`app-btn-${this.btnSize()}`);
    classes.push(`app-btn-${this.btnStyle()}`);
    if (this.btnLoading()) {
      classes.push('disabled app-btn-loading');
    }

    return classes.join(' ');
  });

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
