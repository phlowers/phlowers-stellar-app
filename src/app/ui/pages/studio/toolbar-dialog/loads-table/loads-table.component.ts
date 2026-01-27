import {
  AfterViewInit,
  Component,
  computed,
  effect,
  inject,
  signal,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToolbarDialogService } from '../toolbar-dialog.service';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ChargesService } from '@services/charges/charges.service';
import { PlotService } from '../../services/plot.service';

@Component({
  selector: 'app-loads-table',
  imports: [
    IconComponent,
    ButtonComponent,
    ToggleSwitchModule,
    InputTextModule,
    TextareaModule,
    FormsModule
  ],
  templateUrl: './loads-table.component.html',
  styleUrl: './loads-table.component.scss'
})
export class LoadsTableComponent implements AfterViewInit {
  @ViewChild('header', { static: false }) headerTemplate!: TemplateRef<unknown>;
  @ViewChild('footer', { static: false }) footerTemplate!: TemplateRef<unknown>;

  private readonly toolbarDialogService = inject(ToolbarDialogService);
  private readonly chargesService = inject(ChargesService);
  private readonly plotService = inject(PlotService);

  mode = signal<'view' | 'edit'>('view');
  name = signal<string>('');
  personnelPresence = signal<boolean>(false);
  description = signal<string>('');
  chargeUuid = signal<string | null>(null);

  nameLength = computed(() => this.name().length ?? 0);
  descriptionLength = computed(() => this.description().length ?? 0);

  constructor() {
    effect(async () => {
      if (
        this.toolbarDialogService.isMainOpen() &&
        this.toolbarDialogService.currentTool() === 'load-table'
      ) {
        const context = this.toolbarDialogService.loadTableContext();
        if (context) {
          this.mode.set(context.mode);
          this.chargeUuid.set(context.chargeUuid);
          await this.loadChargeData(context.chargeUuid);
        } else {
          const selectedUuid = this.plotService.section()?.selected_charge_uuid;
          if (selectedUuid) {
            this.mode.set('view');
            this.chargeUuid.set(selectedUuid);
            await this.loadChargeData(selectedUuid);
          }
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.toolbarDialogService.setTemplates({
      header: this.headerTemplate,
      footer: this.footerTemplate
    });
  }

  private async loadChargeData(uuid: string): Promise<void> {
    const charge = await this.chargesService.getCharge(
      this.plotService.study()?.uuid ?? '',
      this.plotService.section()?.uuid ?? '',
      uuid
    );
    if (charge) {
      this.name.set(charge.name);
      this.personnelPresence.set(charge.personnelPresence);
      this.description.set(charge.description);
    }
  }

  updateName(value: string): void {
    this.name.set(value);
  }

  updateDescription(value: string): void {
    this.description.set(value);
  }

  updatePersonnelPresence(value: boolean): void {
    this.personnelPresence.set(value);
  }

  switchToEditMode(): void {
    this.mode.set('edit');
  }

  cancelEdit(): void {
    const uuid = this.chargeUuid();
    if (uuid) {
      this.loadChargeData(uuid);
    }
    this.mode.set('view');
  }

  async saveChanges(): Promise<void> {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.plotService.section()?.uuid;
    const uuid = this.chargeUuid();

    if (!studyUuid || !sectionUuid || !uuid) {
      return;
    }

    const existingCharge = await this.chargesService.getCharge(
      studyUuid,
      sectionUuid,
      uuid
    );
    if (!existingCharge) {
      return;
    }

    const updatedCharge = {
      ...existingCharge,
      name: this.name(),
      personnelPresence: this.personnelPresence(),
      description: this.description()
    };

    await this.chargesService.createOrUpdateCharge(
      studyUuid,
      sectionUuid,
      updatedCharge
    );
    this.mode.set('view');
  }

  isFormValid(): boolean {
    const existingLoadCases = this.plotService.section()?.charges;
    const currentUuid = this.chargeUuid();
    return (
      this.nameLength() > 0 &&
      !existingLoadCases?.some(
        (c) => c.name === this.name() && c.uuid !== currentUuid
      )
    );
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.toolbarDialogService.closeTool();
    }
  }
}
