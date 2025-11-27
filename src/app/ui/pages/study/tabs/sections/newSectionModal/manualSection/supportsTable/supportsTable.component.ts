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
import { AttachmentSetModalComponent } from './attachmentSetModal/attachmentSetModal.component';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ButtonModule } from 'primeng/button';
import { KeyFilterModule } from 'primeng/keyfilter';
import { isNumber, uniq } from 'lodash';
import { PaginatorModule } from 'primeng/paginator';
import { AttachmentService } from '@core/services/attachment/attachment.service';

const calculateSupportNumber = (
  firstSupport: Support,
  header: keyof Support
) => {
  if (header !== 'number') {
    return { firstNumber: null, restOfString: '', isNumberField: false };
  }
  let firstNumber = null;
  let restOfString = '';
  let isNumberField = false;
  let unit = 1;
  while (
    /^[0-9]+$/.test(firstSupport['number']?.slice(-unit) || '') &&
    unit <= (firstSupport['number']?.length || 0)
  ) {
    unit++;
  }
  if (unit > 1) {
    unit = unit - 1;
    firstNumber = Number(firstSupport['number']?.slice(-unit));
    restOfString = firstSupport['number']?.slice(0, -unit) || '';
    isNumberField = true;
  }
  return { firstNumber, restOfString, isNumberField };
};

@Component({
  selector: 'app-supports-table',
  imports: [
    FormsModule,
    TableModule,
    InputTextModule,
    PopoverModule,
    ButtonComponent,
    IconComponent,
    SelectModule,
    AttachmentSetModalComponent,
    IconFieldModule,
    InputIconModule,
    InputGroupModule,
    InputGroupAddonModule,
    ButtonModule,
    KeyFilterModule,
    PaginatorModule
  ],
  templateUrl: './supportsTable.component.html',
  styleUrls: ['./supportsTable.component.scss']
})
export class SupportsTableComponent implements OnInit {
  supports = input<Support[]>([]);
  mode = input.required<CreateEditView>();
  addSupport = output<{ index: number; position: 'before' | 'after' }>();
  deleteSupport = output<string>();
  duplicateSupport = output<string>();
  supportChange = output<{ uuid: string; field: keyof Support; value: any }>();
  chains = signal<Chain[]>([]);
  attachmentSetModalOpen = signal<boolean>(false);
  supportForAttachmentSetModal = signal<Support | undefined>(undefined);
  first = input.required<number>();
  rows = input.required<number>();
  supportFilterTable = signal<string[]>([]);
  constructor(
    private readonly chainsService: ChainsService,
    private readonly attachmentService: AttachmentService
  ) {}

  public onlyPositiveNumbers = /^[0-9]*$/;
  public onlyPositiveNumbersWithDecimal = /^[0-9]*[,.]?[0-9]{0,20}$/;
  public positiveAndNegativeNumbersWithDecimal = /^-?[0-9]*[,.]?[0-9]{0,20}$/;

  optionsChainV = [
    { label: $localize`Yes`, value: true },
    { label: $localize`No`, value: false }
  ];

  async getData() {
    const chains = await this.chainsService.getChains();
    this.chains.set(chains || []);
    const attachments = await this.attachmentService.getAttachments();
    this.supportFilterTable.set(
      uniq(
        (attachments || []).map((attachment) => attachment.support_name || '')
      )
    );
  }

  ngOnInit() {
    this.getData();
  }

  calculateSupportFootAltitude(attachmentHeight: number) {
    return attachmentHeight - 30 > 0 ? attachmentHeight - 30 : 0;
  }

  onSupportFieldChange(uuid: string, field: keyof Support, value: any) {
    if (field === 'chainName') {
      const chain = this.chains().find((chain) => chain.chain_name === value);
      if (chain) {
        this.supportChange.emit({
          uuid,
          field: 'chainLength',
          value: chain.mean_length
        });
        this.supportChange.emit({
          uuid,
          field: 'chainWeight',
          value: chain.mean_mass
        });
        this.supportChange.emit({
          uuid,
          field: 'chainSurface',
          value: 0
        });
        this.supportChange.emit({
          uuid,
          field: 'chainV',
          value: false
        });
      }
    }
    if (field === 'attachmentHeight') {
      this.supportChange.emit({
        uuid,
        field: 'supportFootAltitude',
        value: this.calculateSupportFootAltitude(value)
      });
    }
    this.supportChange.emit({ uuid, field, value });
  }

  copyColumn(header: keyof Support) {
    const firstSupport = this.supports()[0];
    if (!firstSupport) return;
    const isChainName = header === 'chainName';
    const isSpanLength = header === 'spanLength';
    const isAttachmentHeight = header === 'attachmentHeight';
    const { firstNumber, restOfString, isNumberField } = calculateSupportNumber(
      firstSupport,
      header
    );
    for (const [index, support] of this.supports().entries()) {
      if (isSpanLength && index === this.supports().length - 1) {
        continue;
      }

      if (isNumberField && isNumber(firstNumber)) {
        this.supportChange.emit({
          uuid: support.uuid,
          field: header,
          value: restOfString + String(firstNumber + index)
        });
        continue;
      }
      this.supportChange.emit({
        uuid: support.uuid,
        field: header,
        value: firstSupport[header]
      });
      if (isChainName) {
        this.supportChange.emit({
          uuid: support.uuid,
          field: 'chainLength',
          value: firstSupport['chainLength']
        });
        this.supportChange.emit({
          uuid: support.uuid,
          field: 'chainWeight',
          value: firstSupport['chainWeight']
        });
        this.supportChange.emit({
          uuid: support.uuid,
          field: 'chainSurface',
          value: 0
        });
        this.supportChange.emit({
          uuid: support.uuid,
          field: 'chainV',
          value: false
        });
      }
      if (isAttachmentHeight) {
        if (firstSupport['attachmentHeight'] === null) {
          continue;
        }
        this.supportChange.emit({
          uuid: support.uuid,
          field: 'supportFootAltitude',
          value: this.calculateSupportFootAltitude(
            firstSupport['attachmentHeight']
          )
        });
      }
    }
  }

  onSupportNumberDoubleClick(header: keyof Support) {
    if (this.mode() === 'view') {
      return;
    }
    this.copyColumn(header);
  }

  openAttachmentSetModal(uuid: string) {
    this.supportForAttachmentSetModal.set(
      this.supports().find((support) => support.uuid === uuid)
    );
    this.attachmentSetModalOpen.set(true);
  }

  onValidateFormAttachmentSetModal(event: {
    uuid: string;
    supportName: string;
    attachmentSet: number;
    armLength: number;
    heightBelowConsole: number;
  }) {
    const support = this.supports().find(
      (support) => support.uuid === event.uuid
    );
    if (support) {
      support.name = event.supportName;
      support.attachmentSet = event.attachmentSet;
      support.armLength = event.armLength;
      support.heightBelowConsole = event.heightBelowConsole;
    }
  }

  isNumber(value: any) {
    return isNumber(value);
  }
}
