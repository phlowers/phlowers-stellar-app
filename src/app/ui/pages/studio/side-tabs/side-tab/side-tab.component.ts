import { Component, ContentChild, input, TemplateRef } from '@angular/core';

@Component({
  selector: 'app-side-tab',
  imports: [],
  template: ``
})
/** Represents a single side tab, providing a label and content template. */
export class SideTabComponent {
  /** Display label for the tab button. */
  label = input.required<string>();
  /** Whether this tab is disabled. */
  disabled = input<boolean>(false);
  /** Content template projected into the tab panel. */
  @ContentChild(TemplateRef) template!: TemplateRef<unknown>;
}
