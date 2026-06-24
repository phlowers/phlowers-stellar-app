import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DialogModule } from 'primeng/dialog';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { Select } from 'primeng/select';
import { CatalogAttachment, Section, Support } from '@shared/domain';
import { DividerModule } from 'primeng/divider';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SupportPlotComponent } from '@shared/components/studio/support/support-plot.component';
import { uniq } from 'lodash';

/**
 * Modal dialog for selecting and configuring an attachment set for a support.
 *
 * Allows choosing a support name and attachment set from the catalog,
 * auto-populating arm length, height below console, and tower model.
 */
@Component({
  selector: 'app-attachment-set-modal',
  imports: [
    DialogModule,
    IconComponent,
    ButtonComponent,
    Select,
    DividerModule,
    FormsModule,

    IconFieldModule,
    InputIconModule,
    SupportPlotComponent
  ],
  styleUrls: ['./attachmentSetModal.component.scss'],
  templateUrl: './attachmentSetModal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttachmentSetModalComponent {
  /** Whether the modal dialog is open. */
  isOpen = input<boolean>(false);
  /** The support being configured. */
  support = input<Support>();
  /** Emits when the modal open state changes. */
  isOpenChange = output<boolean>();
  /** The parent section for context. */
  section = input.required<Section | null>();
  attachmentSet = signal<number | undefined>(undefined);
  supportName = signal<string | undefined>(undefined);
  armLength = signal<number | undefined>(undefined);
  heightBelowConsole = signal<number | undefined>(undefined);
  towerModel = signal<string | undefined>(undefined);
  validateForm = output<{
    uuid: string;
    supportName: string;
    attachmentSet: number;
    armLength: number;
    heightBelowConsole: number;
    towerModel: string;
  }>();
  coordinates = signal<(number | undefined)[][]>([]);
  attachmentSetNumbers = signal<number[]>([]);

  private readonly attachmentService = inject(AttachmentService);
  /**
   * Monotonic id for derived-field resolutions. Bumped on every open and on every user-driven
   * name/set change, so any lookup (open-effect backfill or an earlier selection) still in flight
   * is discarded once a newer one supersedes it.
   */
  private derivedFieldsRequestId = 0;
  readonly supportsFilterTable = toSignal(this.attachmentService.distinctSupportNames$);
  readonly catalogLoading = computed(() => this.supportsFilterTable() === undefined);

  onVisibleChange() {
    this.isOpenChange.emit(false);
  }

  async findCoordinates(supportName: string) {
    const attachmentSets = await this.attachmentService.getAttachmentsBySupportName(supportName);
    this.coordinates.set(
      attachmentSets.map((attachment) => [
        attachment.attachment_set_x,
        attachment.attachment_set_y,
        attachment.attachment_set_z
      ])
    );
    this.attachmentSetNumbers.set(uniq(attachmentSets.map((attachment) => attachment.attachment_set ?? 0)));
  }

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        // Opening (for a new support, or reopening) invalidates any backfill still in flight,
        // even when this open does not start a new one (e.g. a support without an attachment set).
        const requestId = ++this.derivedFieldsRequestId;
        this.resetValues(true);
        const support = this.support();
        const name = support?.name;
        if (name) {
          this.supportName.set(name);
        }
        const attachmentSet = support?.attachmentSet;
        if (attachmentSet) {
          this.attachmentSet.set(attachmentSet);
          const armLength = support?.armLength ?? undefined;
          const heightBelowConsole = support?.heightBelowConsole ?? undefined;
          const towerModel = support?.towerModel ?? undefined;
          this.armLength.set(armLength);
          this.heightBelowConsole.set(heightBelowConsole);
          this.towerModel.set(towerModel);
          // Backfill any catalog-derived field the support is missing (e.g. an attachment set
          // assigned via inline edit / column copy before these fields were resolved). Resolving
          // them all together keeps arm length / height / tower consistent — a tower-only backfill
          // would leave the others undefined and validate() would emit 0.
          if (name && (armLength == null || heightBelowConsole == null || !towerModel)) {
            void this.backfillDerivedFields(name, attachmentSet, requestId);
          }
        }
      }
    });
    effect(() => {
      if (this.supportName()) {
        this.findCoordinates(this.supportName()!);
      }
    });
  }

  /**
   * Fills the catalog-derived fields (tower model, arm length, height below console) that the
   * support does not already carry. Only empty signals are set, so user-edited values are kept.
   * The `requestId` (assigned by the open effect) guards against stale resolutions: the result is
   * dropped if a newer open/close or a user name/set change invalidated it while the lookup was in flight.
   */
  private async backfillDerivedFields(supportName: string, attachmentSet: number, requestId: number): Promise<void> {
    const derivedFields = await this.attachmentService
      .getDerivedSupportFields(supportName, attachmentSet)
      .catch(() => undefined);
    if (requestId !== this.derivedFieldsRequestId || !this.isOpen() || !derivedFields) {
      return;
    }
    if (this.armLength() == null) {
      this.armLength.set(derivedFields.armLength ?? undefined);
    }
    if (this.heightBelowConsole() == null) {
      this.heightBelowConsole.set(derivedFields.heightBelowConsole ?? undefined);
    }
    if (!this.towerModel()) {
      this.towerModel.set(derivedFields.towerModel ?? undefined);
    }
  }

  validate() {
    this.validateForm.emit({
      supportName: this.supportName() || '',
      attachmentSet: this.attachmentSet() ?? 0,
      armLength: this.armLength() || 0,
      heightBelowConsole: this.heightBelowConsole() || 0,
      uuid: this.support()?.uuid || '',
      towerModel: this.towerModel() || ''
    });
    this.onVisibleChange();
  }

  resetAttachmentSetValues() {
    this.attachmentSet.set(undefined);
    this.armLength.set(undefined);
    this.heightBelowConsole.set(undefined);
    this.towerModel.set(undefined);
  }

  resetValues(resetSupportName: boolean) {
    this.resetAttachmentSetValues();
    if (resetSupportName) {
      this.supportName.set(undefined);
      this.coordinates.set([]);
      this.attachmentSetNumbers.set([]);
    }
  }

  async onAttachmentSelect(event: { value: string | number | null }, key: keyof CatalogAttachment) {
    // A user-driven name/set change supersedes any derived-field resolution already in flight
    // (the open-effect backfill, or an earlier selection), so late results can't clobber it.
    const requestId = ++this.derivedFieldsRequestId;

    if (event.value === null || event.value === undefined) {
      this.resetValues(key === 'support_name');
      return;
    }
    if (key === 'support_name') {
      this.supportName.set(event.value as string);
      this.resetAttachmentSetValues();
    }

    if (key === 'attachment_set') {
      this.attachmentSet.set(event.value as number);
      const currentSupportName = this.supportName();
      if (currentSupportName) {
        // Swallow lookup failures so selecting an attachment set never rejects this event
        // handler (which would surface in Angular's global error handler).
        const derivedFields = await this.attachmentService
          .getDerivedSupportFields(currentSupportName, event.value as number)
          .catch(() => undefined);
        if (requestId !== this.derivedFieldsRequestId || !derivedFields) {
          return;
        }
        this.armLength.set(derivedFields.armLength ?? undefined);
        this.heightBelowConsole.set(derivedFields.heightBelowConsole ?? undefined);
        this.towerModel.set(derivedFields.towerModel ?? undefined);
      }
    }
  }
}
