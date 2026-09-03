import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  untracked
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { CreateEditView } from '@shared/types';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import { TableModule } from 'primeng/table';
import { Section, Support, CatalogChain } from '@shared/domain';
import { ChainsService } from '@shared/catalog/services/chains.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Localization, Task } from '@core/services/worker_python/tasks/types';
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
import { KeyedLatestRequestTracker } from '@shared/helpers/latestRequestTracker';
import { twoDecimalValidator } from '@shared/helpers/numberValidators';
import { LOCATION_CONFIG } from '../location/location.constantes';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

/**
 * Editable table of supports within a section.
 *
 * Displays support properties in a paginated table with inline editing,
 * column copy, chain and attachment set selection, and support CRUD actions.
 */
@Component({
  selector: 'app-supports-table',
  imports: [
    DecimalPipe,
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
    PaginatorModule,
    TranslocoModule
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
  /** Section containing geolocation starting values. */
  section = input<Section | null>(null);
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
  private readonly attachmentSetRestrictionsBySupportUuid = signal<Record<string, number[]>>({});
  private readonly chainsService = inject(ChainsService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly allCatalogSupportNames = toSignal(this.attachmentService.distinctSupportNames$);
  readonly catalogLoaded = computed(() => this.allCatalogSupportNames() !== undefined);
  private readonly workerPythonService = inject(WorkerPythonService);
  readonly workerReady = toSignal(this.workerPythonService.ready$, { initialValue: false });
  private readonly transloco = inject(TranslocoService);
  localization = signal<Localization | null>(null);
  localizationLoading = signal<boolean>(false);
  private readonly _localizationEffect = effect(() => {
    if (this.workerReady()) {
      untracked(() => void this.computeLocalization());
    }
  });
  optionsAttachmentPosition = new Array(20).fill(0).map((_, index) => ({
    label: String(index + 1),
    value: String(index + 1)
  }));
  readonly limits = SUPPORT_FIELD_LIMITS;
  /** Exposed for template use, mirrors the shared reactive-forms validator (see cable-span-manip). */
  readonly twoDecimalValidator = twoDecimalValidator;

  public onlyPositiveNumbers = /^\d*$/;

  optionsChainV = [
    { label: this.transloco.translate('common.yes'), value: true },
    { label: this.transloco.translate('common.no'), value: false }
  ];

  constructor() {
    effect(() => {
      this.updateSupportFilterTables(this.allCatalogSupportNames() ?? []);
    });
    // Drop derived-field request tokens for supports that no longer exist so the tracker
    // cannot grow unbounded across a long editing session (e.g. rows added then deleted).
    effect(() => {
      const activeUuids = this.supports().map((support) => support.uuid);
      this.derivedFieldsRequests.retain(activeUuids);
      this.restrictionRequests.retain(activeUuids);
    });
  }

  private updateSupportFilterTables(catalogNames: string[]): void {
    const { catalogSupportNames, supplementarySupportNames } = buildSupportNameFilterTables(
      this.supports(),
      catalogNames
    );
    this.supportFilterTable.set(catalogSupportNames);
    this.supplementarySupportFilterTable.set(supplementarySupportNames);
  }

  async getData() {
    const chains = (await this.chainsService.getChains()) || [];
    this.chainsOptions.set(chains.toSorted((a, b) => a.chain_name.localeCompare(b.chain_name)));
    this.supplementaryChainsOptions.set(
      buildSupplementaryChains(
        getSupportFieldValues(this.supports(), 'chainName'),
        chains.map((c) => c.chain_name)
      )
    );
  }

  ngOnInit() {
    this.getData();
    this.supports().forEach((support) => {
      void this.refreshAttachmentSetRestriction(support.uuid, support.name, support.attachmentSet);
    });
  }

  private hasLocalizationInputs(section: Section | null | undefined, supports: Support[]): boolean {
    return (
      supports.length > 0 &&
      !!section &&
      !supports.slice(0, -1).some((s) => s.spanLength == null || s.spanAngle == null)
    );
  }

  private buildLocalizationPayload(section: Section, supports: Support[]) {
    const lastIndex = supports.length - 1;
    return {
      startLatitude: section.start_latitude ?? LOCATION_CONFIG.latitude.default,
      startLongitude: section.start_longitude ?? LOCATION_CONFIG.longitude.default,
      startAzimuth: section.start_azimuth ?? LOCATION_CONFIG.azimuth.default,
      spanLength: supports.map((s, i) => (i === lastIndex ? Number.NaN : s.spanLength!)),
      lineAngle: supports.map((s, i) => (i === lastIndex ? 0 : s.spanAngle!))
    };
  }

  private async computeLocalization(): Promise<void> {
    if (this.mode() !== 'view') return;

    const section = this.section();
    const supports = this.supports();

    if (!this.hasLocalizationInputs(section, supports)) return;
    if (!this.workerReady()) return;

    this.localizationLoading.set(true);

    try {
      const { result, error } = await this.workerPythonService.runTask(
        Task.computeLocalization,
        this.buildLocalizationPayload(section!, supports)
      );
      if (result && !error) {
        this.localization.set(result);
      }
    } catch {
      // runTask failure — localizationLoading is cleared in finally
    } finally {
      this.localizationLoading.set(false);
    }
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

  /** Latest derived-field resolution per support UUID, used to drop stale async results. */
  private readonly derivedFieldsRequests = new KeyedLatestRequestTracker<string>();
  /** Latest attachment-set restriction lookup per support UUID, used to drop stale async results. */
  private readonly restrictionRequests = new KeyedLatestRequestTracker<string>();

  getRestrictedAttachmentSets(uuid: string): number[] {
    return this.attachmentSetRestrictionsBySupportUuid()[uuid] ?? [];
  }

  private async refreshAttachmentSetRestriction(
    uuid: string,
    supportName: string | null,
    attachmentSet: number | null
  ): Promise<void> {
    // Invalidate any in-flight lookup from a previous call so a stale resolution doesn't re-populate restrictions.
    const requestId = this.restrictionRequests.begin(uuid);

    if (!supportName || attachmentSet == null) {
      this.attachmentSetRestrictionsBySupportUuid.update((prev) => {
        const rest = { ...prev };
        delete rest[uuid];
        return rest;
      });
      return;
    }

    const matchedEntry = await this.attachmentService
      .resolveGeoLiaisonCatalogAttachment(supportName, null, attachmentSet)
      .catch(() => undefined);
    if (!this.restrictionRequests.isCurrent(uuid, requestId)) {
      return;
    }
    if (!matchedEntry) {
      if (!this.restrictionRequests.isCurrent(uuid, requestId)) {
        return;
      }
      this.attachmentSetRestrictionsBySupportUuid.update((prev) => {
        const rest = { ...prev };
        delete rest[uuid];
        return rest;
      });
      return;
    }

    const allowedSets = await this.attachmentService
      .getCompleteAttachmentSetsBySupportName(supportName)
      .catch(() => [] as number[]);
    if (!this.restrictionRequests.isCurrent(uuid, requestId)) {
      return;
    }
    this.attachmentSetRestrictionsBySupportUuid.update((prev) => ({
      ...prev,
      [uuid]: allowedSets
    }));
  }

  async onSupportFieldChange(uuid: string, field: keyof Support, value: unknown) {
    if (field === 'attachmentSet') {
      const restrictedSets = this.getRestrictedAttachmentSets(uuid);
      if (restrictedSets.length > 0 && value != null && !restrictedSets.includes(value as number)) {
        return;
      }
    }

    const changes = buildFieldChangeUpdates(uuid, field, value, this.chainsOptions());
    changes.forEach((change) => this.supportChange.emit(change));

    // The attachment-set restriction and the catalog-derived fields (tower model, arm length,
    // height below console) both depend on the (support name, attachment set) pair, so
    // re-resolve them together whenever either side changes.
    if (field === 'name' || field === 'attachmentSet') {
      const support = this.supports().find((currentSupport) => currentSupport.uuid === uuid);
      const supportName = field === 'name' ? (value as string | null) : (support?.name ?? null);
      const attachmentSet =
        field === 'attachmentSet' ? ((value as number | null) ?? null) : (support?.attachmentSet ?? null);

      await this.refreshAttachmentSetRestriction(uuid, supportName, attachmentSet);

      // Guard against a stale update race: a faster edit of the same row (e.g. typing successive
      // digits into the attachment-set field) must not be overwritten by an older lookup resolving late.
      const requestId = this.derivedFieldsRequests.begin(uuid);
      const catalogFields = await this.attachmentService.resolveDerivedSupportFields(supportName, attachmentSet);
      if (catalogFields && this.derivedFieldsRequests.isCurrent(uuid, requestId)) {
        this.supportChange.emit({ uuid, support: catalogFields });
      }
    }
  }

  async copyColumn(header: keyof Support) {
    // Snapshot the supports once: the list is read again after the await below, so a
    // reference captured up front keeps the resolved fields aligned to the same rows.
    const supports = this.supports();
    const changes = buildCopyColumnChanges(supports, header);
    if (header === 'attachmentSet' || header === 'name') {
      const firstSupport = supports[0];
      // The copied column is taken from the first support; the other half of the
      // (support name, attachment set) pair stays per-row, so each row's derived
      // fields (tower model, arm length, height below console) resolve correctly.
      const resolveName = (support: Support) => (header === 'name' ? firstSupport?.name : support.name);
      const resolveSet = (support: Support) =>
        header === 'attachmentSet' ? firstSupport?.attachmentSet : support.attachmentSet;
      // Register a lookup per row up front so a later inline edit of any of these rows
      // supersedes this copy's derived fields rather than being overwritten by them.
      const rows = supports.map((support) => ({
        support,
        requestId: this.derivedFieldsRequests.begin(support.uuid)
      }));
      // Resolve each DISTINCT support name's attachment sets in a single DB read, then derive each
      // row locally. Copying one name onto many rows would otherwise re-fetch its group once per row.
      const distinctNames = [...new Set(supports.map(resolveName).filter((name): name is string => !!name))];
      const fieldsByName = new Map(
        await Promise.all(
          distinctNames.map(
            async (name) =>
              [name, await this.attachmentService.getDerivedSupportFieldsBySet(name).catch(() => undefined)] as const
          )
        )
      );
      rows.forEach(({ support, requestId }) => {
        const name = resolveName(support);
        const attachmentSet = resolveSet(support);
        const catalogFields =
          name != null && attachmentSet != null ? fieldsByName.get(name)?.get(attachmentSet) : undefined;
        if (catalogFields && this.derivedFieldsRequests.isCurrent(support.uuid, requestId)) {
          changes.push({ uuid: support.uuid, support: catalogFields });
        }
      });
    }
    changes.forEach((change) => this.supportChange.emit(change));
  }

  onSupportNumberDoubleClick(header: keyof Support) {
    if (this.mode() === 'view') {
      return;
    }
    void this.copyColumn(header);
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
