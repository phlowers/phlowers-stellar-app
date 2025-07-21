import { Component } from '@angular/core';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-supports-table',
  imports: [TableModule],
  templateUrl: './supportsTable.component.html'
})
export class SupportsTableComponent {
  supports = [
    {
      type: 'Guard',
      name: 'Guard 1',
      position: 'Position 1'
    }
  ];
}
