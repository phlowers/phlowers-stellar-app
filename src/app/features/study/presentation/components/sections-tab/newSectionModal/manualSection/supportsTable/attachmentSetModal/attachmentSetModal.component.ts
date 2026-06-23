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
import { truncateNumberToOneDecimal } from '@shared/helpers/truncateDecimals';

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
          const existingTowerModel = this.support()?.towerModel;
          if (existingTowerModel) {
            this.towerModel.set(existingTowerModel);
          } else if (name) {
            void this.attachmentService.getAttachmentDetails(name, attachmentSet).then((attachmentDetails) => {
              if (attachmentDetails) {
                this.towerModel.set(attachmentDetails.support_tower);
              }
            });
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
        const attachmentDetails = await this.attachmentService.getAttachmentDetails(
          currentSupportName,
          event.value as number
        );
        if (attachmentDetails) {
          this.armLength.set(
            attachmentDetails.cross_arm_length == null
              ? undefined
              : truncateNumberToOneDecimal(attachmentDetails.cross_arm_length)
          );
          this.heightBelowConsole.set(attachmentDetails.attachment_altitude);
          this.towerModel.set(attachmentDetails.support_tower);
        }
      }
    }
  }
}
