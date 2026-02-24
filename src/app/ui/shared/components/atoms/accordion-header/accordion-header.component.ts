import { Component } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-accordion-header',
  imports: [AccordionModule, IconComponent],
  templateUrl: './accordion-header.component.html',
  host: {
    class: 'app-accordion-header'
  }
})
/** Reusable accordion header component that wraps PrimeNG accordion with a custom icon. */
export class AccordionHeaderComponent {}
