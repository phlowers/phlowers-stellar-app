import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import { TableModule } from 'primeng/table';
import { Support } from 'src/app/core/data/database/interfaces/support';

@Component({
  selector: 'app-supports-table',
  imports: [
    FormsModule,
    TableModule,
    InputTextModule,
    PopoverModule,
    ButtonComponent,
    IconComponent
  ],
  templateUrl: './supportsTable.component.html',
  styleUrls: ['./supportsTable.component.scss']
})
export class SupportsTableComponent {
  supports = input<Support[]>([]);
  addSupport = output<{ index: number; position: 'before' | 'after' }>();
  deleteSupport = output<string>();
  supportChange = output<{ uuid: string; field: keyof Support; value: any }>();

  onSupportFieldChange(uuid: string, field: keyof Support, value: any) {
    this.supportChange.emit({ uuid, field, value });
  }
}
