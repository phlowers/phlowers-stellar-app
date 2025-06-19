import { Component } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-accordion-header',
  imports: [AccordionModule, IconComponent],
  templateUrl: './accordion-header.component.html'
})
export class AccordionHeaderComponent {}
