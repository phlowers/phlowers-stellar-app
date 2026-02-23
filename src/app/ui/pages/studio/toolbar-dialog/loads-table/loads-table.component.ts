import { AfterViewInit, Component, computed, effect, inject, signal, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToolbarDialogService } from '../toolbar-dialog.service';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { ChargesService } from '@services/charges/charges.service';
import { PlotService } from '../../services/plot.service';
import { ClimateCharge, LoadType, SpanLoad, SymmetryType } from '@core/domain/models/charge.model';

interface ClimateRow {
  windPressure: number | null;
  cableTemperature: number | null;
  symmetryType: SymmetryType;
  iceThickness: number | null;
  frontierSupportNumber: number | null;
  iceThicknessBefore: number | null;
  iceThicknessAfter: number | null;
}

interface SpanLoadRow {
  spanLabel: string;
  referenceSupport: number;
  type: string;
  loadWeight: number;
  loadPosition: number;
}

@Component({
  selector: 'app-loads-table',
  imports: [
    IconComponent,
    ButtonComponent,
    ToggleSwitchModule,
    InputTextModule,
    TextareaModule,
    FormsModule,
    TableModule
  ],
  templateUrl: './loads-table.component.html',
  styleUrl: './loads-table.component.scss'
})
/** Component displaying a charge's climatic and span load data in tabular form, with view and edit modes. */
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
  climate = signal<ClimateCharge | null>(null);
  spanLoads = signal<SpanLoad[]>([]);

  nameLength = computed(() => this.name().length ?? 0);
  descriptionLength = computed(() => this.description().length ?? 0);

  readonly SymmetryType = SymmetryType;
  readonly LoadType = LoadType;

  climateRows = computed<ClimateRow[]>(() => {
    const climate = this.climate();
    if (!climate) return [];
    return [
      {
        windPressure: climate.windPressure,
        cableTemperature: climate.cableTemperature,
        symmetryType: climate.symmetryType,
        iceThickness: climate.iceThickness,
        frontierSupportNumber: climate.frontierSupportNumber,
        iceThicknessBefore: climate.iceThicknessBefore,
        iceThicknessAfter: climate.iceThicknessAfter
      }
    ];
  });

  spanLoadRows = computed<SpanLoadRow[]>(() => {
    const loads = this.spanLoads();
    const supports = this.plotService.section()?.supports ?? [];

    return loads
      .filter((load) => {
        if (load.type === LoadType.MARKING) {
          return load.loadPosition !== 0;
        }
        return load.loadWeight !== 0 || load.loadPosition !== 0;
      })
      .map((load) => {
        const supportIndex = supports.findIndex((s) => s.uuid === load.supportUuid);
        const hasNextSupport = supportIndex >= 0 && supportIndex + 1 < supports.length;
        const spanLabel = hasNextSupport ? `${supportIndex + 1} - ${supportIndex + 2}` : '-';
        const referenceSupport = load.referenceSupport === 'LEFT' ? supportIndex + 1 : supportIndex + 2;
        return {
          spanLabel,
          referenceSupport,
          type: load.type,
          loadWeight: load.loadWeight,
          loadPosition: load.loadPosition
        };
      });
  });

  constructor() {
    effect(async () => {
      if (
        this.toolbarDialogService.isOpen() &&
        this.toolbarDialogService.phase() === 'main' &&
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
      this.climate.set(charge.data?.climate ?? null);
      this.spanLoads.set(charge.data?.spanLoads ?? []);
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

    const existingCharge = await this.chargesService.getCharge(studyUuid, sectionUuid, uuid);
    if (!existingCharge) {
      return;
    }

    const updatedCharge = {
      ...existingCharge,
      name: this.name(),
      personnelPresence: this.personnelPresence(),
      description: this.description()
    };

    await this.chargesService.createOrUpdateCharge(studyUuid, sectionUuid, updatedCharge);
    this.mode.set('view');
  }

  getSymmetryLabel(type: SymmetryType): string {
    switch (type) {
      case SymmetryType.SYMMETRIC:
        return $localize`Symmetric`;
      case SymmetryType.DIS_SYMMETRIC:
        return $localize`Dis Symmetric`;
    }
  }

  getLoadTypeLabel(type: string): string {
    switch (type) {
      case LoadType.PUNCTUAL:
        return $localize`Punctual`;
      case LoadType.MARKING:
        return $localize`Marking`;
      default:
        return type;
    }
  }

  isFormValid(): boolean {
    const existingLoadCases = this.plotService.section()?.charges;
    const currentUuid = this.chargeUuid();
    return this.nameLength() > 0 && !existingLoadCases?.some((c) => c.name === this.name() && c.uuid !== currentUuid);
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.toolbarDialogService.closeTool();
    }
  }
}
