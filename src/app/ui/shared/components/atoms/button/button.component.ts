import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  ViewEncapsulation
} from '@angular/core';
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
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Custom button component supporting multiple sizes, styles, and a loading state.
 * Applied as an attribute directive on `<button>` or `<a>` elements.
 */
export class ButtonComponent implements OnInit, OnDestroy {
  private clickListener?: (e: Event) => void;
  private readonly elementRef = inject(ElementRef<HTMLButtonElement | HTMLLinkElement>);

  /** Button size: 's' (small), 'm' (medium), or 'l' (large). */
  btnSize = input<'s' | 'm' | 'l'>('m');
  /** Visual style variant of the button. */
  btnStyle = input<'base' | 'outlined' | 'text' | 'danger'>('base');
  /** Whether the button is in a loading state, disabling click events. */
  btnLoading = input<boolean>(false);

  classesList = computed(() => {
    const classes: string[] = [`app-btn-${this.btnSize()}`, `app-btn-${this.btnStyle()}`];

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
