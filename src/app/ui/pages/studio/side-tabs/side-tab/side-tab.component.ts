import { Component, ContentChild, input, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-side-tab',
  imports: [],
  template: ``
})
/** Component representing a single side tab with a label, disabled state, and content template. */
export class SideTabComponent {
  label = input.required<string>();
  disabled = input<boolean>(false);
  @ContentChild(TemplateRef) template!: TemplateRef<unknown>;
}
