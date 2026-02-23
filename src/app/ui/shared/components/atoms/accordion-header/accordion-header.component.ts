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
/** Reusable header component for PrimeNG accordion panels, providing a consistent look with an icon. */
export class AccordionHeaderComponent {}
