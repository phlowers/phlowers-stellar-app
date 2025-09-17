import { Component, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { CreateEditView } from '@src/app/ui/shared/types';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import { TableModule } from 'primeng/table';
import { Support } from 'src/app/core/data/database/interfaces/support';
import { Chain } from '@src/app/core/data/database/interfaces/chain';
import { ChainsService } from '@src/app/core/services/chains/chains.service';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-supports-table',
  imports: [
    FormsModule,
    TableModule,
    InputTextModule,
    PopoverModule,
    ButtonComponent,
    IconComponent,
    SelectModule
  ],
  templateUrl: './supportsTable.component.html',
  styleUrls: ['./supportsTable.component.scss']
})
export class SupportsTableComponent implements OnInit {
  supports = input<Support[]>([]);
  mode = input.required<CreateEditView>();
  addSupport = output<{ index: number; position: 'before' | 'after' }>();
  deleteSupport = output<string>();
  supportChange = output<{ uuid: string; field: keyof Support; value: any }>();
  chains = signal<Chain[]>([]);

  constructor(private readonly chainsService: ChainsService) {}

  ngOnInit() {
    this.chainsService.getChains().then((chains) => {
      this.chains.set(chains || []);
    });
  }

  onSupportFieldChange(uuid: string, field: keyof Support, value: any) {
    if (field === 'chainName') {
      const chain = this.chains().find((chain) => chain.name === value);
      if (chain) {
        this.supportChange.emit({
          uuid,
          field: 'chainLength',
          value: chain.length
        });
        this.supportChange.emit({
          uuid,
          field: 'chainWeight',
          value: chain.weight
        });
      }
    }
    this.supportChange.emit({ uuid, field, value });
  }
}
