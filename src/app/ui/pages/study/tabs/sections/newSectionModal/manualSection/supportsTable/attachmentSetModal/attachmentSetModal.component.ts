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
import { uniq } from 'lodash';
import { CatalogSupportsService } from '@src/app/core/services/catalogSupports/catalogSupports.service';

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
  coordinates = signal<(number | undefined)[][]>([]);
  attachmentSetNumbers = signal<number[]>([]);

  supportsFilterTable = signal<string[]>([]);
  attachmentsFilterTable = signal<Attachment[]>([]);

  onVisibleChange() {
    this.isOpenChange.emit(false);
  }

  async findCoordinates(supportName: string) {
    const attachments =
      await this.attachmentService.searchAttachmentsBySupportName(supportName);
    this.coordinates.set(
      attachments.map((attachment) => [
        attachment.attachment_set_x,
        attachment.attachment_set_y,
        attachment.attachment_set_z
      ])
    );
    this.attachmentsFilterTable.set(attachments);
    this.attachmentSetNumbers.set(
      uniq(attachments.map((attachment) => attachment.attachment_set ?? 0))
    );
  }

  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly catalogSupportsService: CatalogSupportsService
  ) {
    effect(() => {
      if (this.isOpen()) {
        this.resetValues();
        const name = this.support()?.name;
        if (name) {
          this.supportName.set(name);
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
      uuid: this.support()?.uuid || ''
    });
    this.onVisibleChange();
  }

  async getData() {
    const catalogSupports =
      await this.catalogSupportsService.getCatalogSupports();
    this.supportsFilterTable.set(
      catalogSupports.map((support) => support.name) || []
    );
  }

  resetValues() {
    this.armLength.set(undefined);
    this.heightBelowConsole.set(undefined);
    this.attachmentSet.set(undefined);
    this.supportName.set(undefined);
    this.coordinates.set([]);
    this.getData();
  }

  ngOnInit() {
    this.getData();
  }

  async onAttachnementSelect(event: any, key: keyof Attachment) {
    if (event.value === null || event.value === undefined) {
      this.resetValues();
      return;
    }
    if (key === 'support_name') {
      const attachments =
        await this.attachmentService.searchAttachmentsBySupportName(
          event.value
        );
      const items = (attachments || [])
        .filter((item) => item.support_name === event.value)
        .sort((a, b) => (a.attachment_set || 0) - (b.attachment_set || 0));
      this.attachmentsFilterTable.set(items);
    }

    if (key === 'attachment_set') {
      const attachments =
        await this.attachmentService.searchAttachmentsBySupportName(
          this.supportName() || ''
        );
      const items = (attachments || []).filter(
        (item) => item.attachment_set === event.value
      );
      if (items[0]) {
        this.armLength.set(items[0].cross_arm_length);
        this.heightBelowConsole.set(items[0].attachment_altitude);
      }
    }
  }
}
