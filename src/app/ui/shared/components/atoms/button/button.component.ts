import {
  Component,
  computed,
  ElementRef,
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
  }
})
export class ButtonComponent implements OnInit, OnDestroy {
  private clickListener?: (e: Event) => void;

  constructor(
    private readonly elementRef: ElementRef<HTMLButtonElement | HTMLLinkElement>
  ) {}

  btnSize = input<'s' | 'm' | 'l'>('m');
  btnStyle = input<'base' | 'outlined' | 'text' | 'danger'>('base');
  btnLoading = input<boolean>(false);

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

    this.elementRef.nativeElement.addEventListener(
      'click',
      this.clickListener,
      true
    );
  }

  ngOnDestroy(): void {
    if (this.clickListener) {
      this.elementRef.nativeElement.removeEventListener(
        'click',
        this.clickListener,
        true
      );
    }
  }
}
