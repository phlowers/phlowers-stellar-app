import {
  Component,
  effect,
  input,
  OnInit,
  output,
  signal
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { Select } from 'primeng/select';
import { Attachment } from '@core/data/database/interfaces/attachment';
import { DividerModule } from 'primeng/divider';
import { AttachmentService } from '@core/services/attachment/attachment.service';
import { Support } from '@core/data/database/interfaces/support';
import { FormsModule } from '@angular/forms';
import { UniquePipe } from '@ui/shared/service/autocomplete/unique.pipe';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Section } from '@core/data/database/interfaces/section';
import { SupportPlotComponent } from '@ui/shared/components/studio/support/support-plot.component';

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
  templateUrl: './attachmentSetModal.component.html'
})
export class AttachmentSetModalComponent implements OnInit {
  isOpen = input<boolean>(false);
  support = input<Support>();
  isOpenChange = output<boolean>();
  section = input.required<Section | null>();
  attachmentSet = signal<number | undefined>(undefined);
  supportName = signal<string | undefined>(undefined);
  armLength = signal<number | undefined>(undefined);
  heightBelowConsole = signal<number | undefined>(undefined);
  validateForm = output<{
    uuid: string;
    supportName: string;
    attachmentSet: number;
    armLength: number;
    heightBelowConsole: number;
  }>();

  supportsFilterTable = signal<Attachment[]>([]);
  attachmentsFilterTable = signal<Attachment[]>([]);

  onVisibleChange() {
    this.isOpenChange.emit(false);
  }

  constructor(private readonly attachmentService: AttachmentService) {
    effect(() => {
      if (this.isOpen()) {
        this.resetValues();
        const name = this.support()?.name;
        if (name) {
          this.supportName.set(name);
        }
      }
    });
  }

  validate() {
    this.validateForm.emit({
      supportName: this.supportName() || '',
      attachmentSet: this.attachmentSet() || 0,
      armLength: this.armLength() || 0,
      heightBelowConsole: this.heightBelowConsole() || 0,
      uuid: this.support()?.uuid || ''
    });
    this.onVisibleChange();
  }

  async getData() {
    const attachments = await this.attachmentService.getAttachments();
    const attachmentsFilterTable = (attachments || []).sort(
      (a, b) => (a.attachment_set || 0) - (b.attachment_set || 0)
    );

    this.supportsFilterTable.set(attachmentsFilterTable);
    const items = (attachments || [])
      .filter((item) =>
        this.supportName() ? item.support_name === this.supportName() : true
      )
      .sort((a, b) => (a.attachment_set || 0) - (b.attachment_set || 0));

    this.attachmentsFilterTable.set(items);
  }

  resetValues() {
    this.armLength.set(undefined);
    this.heightBelowConsole.set(undefined);
    this.attachmentSet.set(undefined);
    this.supportName.set(undefined);
    this.getData();
  }

  ngOnInit() {
    this.getData();
  }

  async onAttachnementSelect(event: any, key: keyof Attachment) {
    if (!event.value) {
      this.resetValues();
      return;
    }
    if (key === 'support_name') {
      const attachments = await this.attachmentService.getAttachments();
      const items = (attachments || [])
        .filter((item) => item.support_name === event.value)
        .sort((a, b) => (a.attachment_set || 0) - (b.attachment_set || 0));
      this.attachmentsFilterTable.set(items);
    }

    if (key === 'attachment_set') {
      const attachments = await this.attachmentService.getAttachments();
      const items = (attachments || []).filter(
        (item) =>
          item.attachment_set === event.value &&
          item.support_name === this.supportName()
      );
      if (items[0]) {
        this.armLength.set(items[0].cross_arm_length);
        this.heightBelowConsole.set(items[0].attachment_altitude);
      }
    }
  }
}
