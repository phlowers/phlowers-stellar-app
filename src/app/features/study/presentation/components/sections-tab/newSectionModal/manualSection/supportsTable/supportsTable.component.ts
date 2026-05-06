import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { CreateEditView } from '@shared/types';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import { TableModule } from 'primeng/table';
import { Support, CatalogChain } from '@shared/domain';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { SelectModule } from 'primeng/select';
import { AttachmentSetModalComponent } from './attachmentSetModal/attachmentSetModal.component';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import { isNumber } from 'lodash';
import { PaginatorModule } from 'primeng/paginator';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { TABLE_ROWS_PER_PAGE_OPTIONS } from '@shared/constants/tablePagination';
import {
  buildCopyColumnChanges,
  buildFieldChangeUpdates,
  buildSupportNameFilterTables,
  buildSupplementaryChains,
  findSupplementaryNames,
  getSupportFieldValues,
  SUPPORT_FIELD_LIMITS
} from './helpers';
import { truncateTwoDecimals } from '@shared/helpers/truncateDecimals';

/**
 * Editable table of supports within a section.
 *
 * Displays support properties in a paginated table with inline editing,
 * column copy, chain and attachment set selection, and support CRUD actions.
 */
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
    KeyFilterModule,
    MessageModule,
    PaginatorModule
  ],
  templateUrl: './supportsTable.component.html',
  styleUrls: ['./supportsTable.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupportsTableComponent implements OnInit {
  /** List of supports to display in the table. */
  supports = input<Support[]>([]);
  /** Current mode: create, edit, or view. */
  mode = input.required<CreateEditView>();
  /** Emits when a support should be added at a given index and position. */
  addSupport = output<{ index: number; position: 'before' | 'after' }>();
  /** Emits the UUID of a support to delete. */
  deleteSupport = output<string>();
  /** Emits the UUID of a support to duplicate. */
  duplicateSupport = output<string>();
  /** Emits a partial support update keyed by UUID. */
  supportChange = output<{ uuid: string; support: Partial<Support> }>();
  chainsOptions = signal<CatalogChain[]>([]);
  supplementaryChainsOptions = signal<CatalogChain[]>([]);
  allChainsOptions = computed(() =>
    [...this.chainsOptions(), ...this.supplementaryChainsOptions()].sort((a, b) =>
      a.chain_name.localeCompare(b.chain_name)
    )
  );
  attachmentSetModalOpen = signal<boolean>(false);
  supportForAttachmentSetModal = signal<Support | undefined>(undefined);
  first = input.required<number>();
  rows = input.required<number>();
  rowsPerPageOptions = signal(TABLE_ROWS_PER_PAGE_OPTIONS);
  supportFilterTable = signal<string[]>([]);
  supplementarySupportFilterTable = signal<string[]>([]);
  allSupportFilterTable = computed(() => [...this.supportFilterTable(), ...this.supplementarySupportFilterTable()]);
  private readonly chainsService = inject(ChainsService);
  private readonly attachmentService = inject(AttachmentService);
  optionsAttachmentPosition = new Array(20).fill(0).map((_, index) => ({
    label: String(index + 1),
    value: String(index + 1)
  }));
  readonly limits = SUPPORT_FIELD_LIMITS;

  public onlyPositiveNumbers = /^\d*$/;

  readonly truncateTwoDecimals = truncateTwoDecimals;

  optionsChainV = [
    { label: $localize`Yes`, value: true },
    { label: $localize`No`, value: false }
  ];

  async getData() {
    const chains = (await this.chainsService.getChains()) || [];
    this.chainsOptions.set(chains.toSorted((a, b) => a.chain_name.localeCompare(b.chain_name)));
    this.supplementaryChainsOptions.set(
      buildSupplementaryChains(
        getSupportFieldValues(this.supports(), 'chainName'),
        chains.map((c) => c.chain_name)
      )
    );
    const attachments = (await this.attachmentService.getAttachments()) || [];
    const { catalogSupportNames, supplementarySupportNames } = buildSupportNameFilterTables(
      this.supports(),
      attachments
    );
    this.supportFilterTable.set(catalogSupportNames);
    this.supplementarySupportFilterTable.set(supplementarySupportNames);
  }

  ngOnInit() {
    this.getData();
  }

  onChainNameFilter(event: { filter: string }) {
    const supplementaryChains = buildSupplementaryChains(
      [...getSupportFieldValues(this.supports(), 'chainName'), event.filter],
      this.chainsOptions().map((c) => c.chain_name)
    );
    if (supplementaryChains.length) {
      this.supplementaryChainsOptions.set(supplementaryChains);
    }
  }

  onSupportNameFilter(event: { filter: string }) {
    const notFoundNames = findSupplementaryNames(
      [...getSupportFieldValues(this.supports(), 'name'), event.filter],
      this.supportFilterTable()
    );
    if (notFoundNames.length) {
      this.supplementarySupportFilterTable.set(notFoundNames);
    }
  }

  onSupportFieldChange(uuid: string, field: keyof Support, value: unknown) {
    const changes = buildFieldChangeUpdates(uuid, field, value, this.chainsOptions());
    changes.forEach((change) => this.supportChange.emit(change));
  }

  copyColumn(header: keyof Support) {
    const changes = buildCopyColumnChanges(this.supports(), header);
    changes.forEach((change) => this.supportChange.emit(change));
  }

  onSupportNumberDoubleClick(header: keyof Support) {
    if (this.mode() === 'view') {
      return;
    }
    this.copyColumn(header);
  }

  openAttachmentSetModal(uuid: string) {
    this.supportForAttachmentSetModal.set(this.supports().find((support) => support.uuid === uuid));
    this.attachmentSetModalOpen.set(true);
  }

  onValidateFormAttachmentSetModal(event: {
    uuid: string;
    supportName: string;
    attachmentSet: number;
    armLength: number;
    heightBelowConsole: number;
    towerModel: string;
  }) {
    const support = this.supports().find((support) => support.uuid === event.uuid);
    if (support) {
      support.name = event.supportName;
      support.attachmentSet = event.attachmentSet;
      support.armLength = event.armLength;
      support.heightBelowConsole = event.heightBelowConsole;
      support.towerModel = event.towerModel;
    }
  }

  isNumber(value: unknown) {
    return isNumber(value);
  }
}
