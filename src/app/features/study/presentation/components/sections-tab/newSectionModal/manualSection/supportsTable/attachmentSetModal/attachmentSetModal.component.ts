import { ChangeDetectionStrategy, Component, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { Select } from 'primeng/select';
import { CatalogAttachment, Section, Support } from '@shared/domain';
import { DividerModule } from 'primeng/divider';
import { AttachmentService } from '@shared/catalog/services/attachment.service';
import { FormsModule } from '@angular/forms';
import { UniquePipe } from '@shared/service/autocomplete/unique.pipe';
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
    UniquePipe,
    IconFieldModule,
    InputIconModule,
    SupportPlotComponent
  ],
  styleUrls: ['./attachmentSetModal.component.scss'],
  templateUrl: './attachmentSetModal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttachmentSetModalComponent implements OnInit {
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

  supportsFilterTable = signal<CatalogAttachment[]>([]);
  attachmentsFilterTable = signal<CatalogAttachment[]>([]);
  private readonly attachmentService = inject(AttachmentService);

  onVisibleChange() {
    this.isOpenChange.emit(false);
  }

  async findCoordinates(supportName: string) {
    const attachments = await this.attachmentService.getAttachments();
    const attachmentSets = attachments.filter((attachment) => attachment.support_name === supportName);
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
        this.resetValues(true);
        const name = this.support()?.name;
        if (name) {
          this.supportName.set(name);
        }
        const attachmentSet = this.support()?.attachmentSet;
        if (attachmentSet) {
          this.attachmentSet.set(attachmentSet);
          this.armLength.set(this.support()?.armLength ?? undefined);
          this.heightBelowConsole.set(this.support()?.heightBelowConsole ?? undefined);
          this.towerModel.set(this.support()?.towerModel ?? undefined);
        }
      }
    });
    effect(() => {
      if (this.supportName()) {
        this.findCoordinates(this.supportName()!);
      }
    });
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

  async getData() {
    const attachments = await this.attachmentService.getAttachments();
    const attachmentsFilterTable = (attachments || []).sort((a, b) =>
      (a.support_name || '').localeCompare(b.support_name || '')
    );

    this.supportsFilterTable.set(attachmentsFilterTable);
    const items = (attachments || [])
      .filter((item) => (this.supportName() ? item.support_name === this.supportName() : true))
      .sort((a, b) => (a.attachment_set || 0) - (b.attachment_set || 0));
    this.attachmentsFilterTable.set(items);
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
    }
    this.getData();
  }

  ngOnInit() {
    this.getData();
  }

  async onAttachmentSelect(event: { value: string | number | null }, key: keyof CatalogAttachment) {
    if (event.value === null || event.value === undefined) {
      this.resetValues(key === 'support_name');
      return;
    }
    if (key === 'support_name') {
      this.resetAttachmentSetValues();
      const attachments = await this.attachmentService.getAttachments();
      const items = (attachments || [])
        .filter((item) => item.support_name === event.value)
        .sort((a, b) => (a.attachment_set || 0) - (b.attachment_set || 0));
      this.attachmentsFilterTable.set(items);
    }

    if (key === 'attachment_set') {
      const attachments = await this.attachmentService.getAttachments();
      const items = (attachments || []).filter(
        (item) => item.attachment_set === event.value && item.support_name === this.supportName()
      );
      if (items[0]) {
        this.armLength.set(items[0].cross_arm_length);
        this.heightBelowConsole.set(items[0].attachment_altitude);
        this.towerModel.set(items[0].support_tower);
      }
    }
  }
}
