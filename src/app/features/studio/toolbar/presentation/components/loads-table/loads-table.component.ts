import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  TemplateRef,
  viewChild
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { FormsModule } from '@angular/forms';
import { TranslocoService, TranslocoModule } from '@jsverse/transloco';
import {
  CABLE_MANIP_METHOD_LABEL_KEYS,
  CABLE_MANIP_TYPE_LABEL_KEYS,
  CABLE_MODIF_TYPE_LABEL_KEYS,
  LOAD_TYPE_LABEL_KEYS,
  SPAN_ANCHORING_LABEL_KEYS,
  SUPPORT_ANCHORING_LABEL_KEYS,
  SUPPORT_MANIP_TYPE_LABEL_KEYS,
  SYMMETRY_TYPE_LABEL_KEYS
} from '@shared/constants/loads-label-keys.constantes';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { ChargesService } from '@services/charges/charges.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { ClimateCharge, LoadType, SpanLoad, SymmetryType } from '@shared/domain/models/charge.model';
import {
  CableModification,
  CableSpanManipulation,
  CableSupportManipulation,
  SupportAnchoringType,
  SupportManipType
} from '@shared/domain';
import { LoadsReportData } from '@features/studio/toolbar/presentation/services/loads-data-report/loads-data-report.interfaces';
import { LoadsReportService } from '@features/studio/toolbar/presentation/services/loads-data-report/loads-data-report.service';
import { ClimateRow, CableModifRow, SpanLoadRow, SupportManipRow, SpanManipRow } from './loads-table.interfaces';

@Component({
  selector: 'app-loads-table',
  imports: [
    DecimalPipe,
    IconComponent,
    ButtonComponent,
    ToggleSwitchModule,
    InputTextModule,
    TextareaModule,
    FormsModule,
    TableModule,
    TranslocoModule
  ],
  templateUrl: './loads-table.component.html',
  styleUrl: './loads-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Dialog component for viewing and editing charge case details and associated loads. */
export class LoadsTableComponent {
  readonly headerTemplate = viewChild<TemplateRef<unknown>>('header');
  readonly footerTemplate = viewChild<TemplateRef<unknown>>('footer');

  private readonly toolbarDialogService = inject(ToolbarDialogService);
  private readonly chargesService = inject(ChargesService);
  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly translocoService = inject(TranslocoService);
  private readonly loadsReportService = inject(LoadsReportService);

  mode = signal<'view' | 'edit'>('view');
  name = signal<string>('');
  personnelPresence = signal<boolean>(false);
  description = signal<string>('');
  chargeUuid = signal<string | null>(null);
  climate = signal<ClimateCharge | null>(null);
  spanLoads = signal<SpanLoad[]>([]);
  cableModifParams = signal<CableModification[]>([]);
  supportManips = signal<CableSupportManipulation[]>([]);
  spanManips = signal<CableSpanManipulation[]>([]);

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

    return loads
      .filter((load) => {
        if (load.type === LoadType.MARKING) {
          return load.loadPosition !== 0;
        }
        return load.loadWeight !== 0 || load.loadPosition !== 0;
      })
      .map((load) => {
        const { spanLabel, referenceSupportLabel } = this.resolveSpanAndRefSupportLabels(
          load.supportUuid,
          load.referenceSupport
        );

        return {
          spanLabel,
          referenceSupport: referenceSupportLabel,
          type: load.type,
          loadWeight: load.loadWeight,
          loadPosition: load.loadPosition
        };
      });
  });

  cableModifRows = computed<CableModifRow[]>(() =>
    this.cableModifParams().map((modif) => {
      const { spanLabel, referenceSupportLabel } = this.resolveSpanAndRefSupportLabels(
        modif.spanUuid,
        modif.supportRef
      );
      return {
        spanLabel,
        referenceSupport: referenceSupportLabel,
        modificationType: modif.modificationType,
        modifiedLengthCable: modif.modifiedLengthCable,
        distanceSupportRef: modif.distanceSupportRef
      };
    })
  );

  supportManipRows = computed<SupportManipRow[]>(() => {
    const supports = this.spanService.section()?.supports ?? [];
    const rows: SupportManipRow[] = [];

    this.supportManips().forEach((manip, index) => {
      const support = supports.find((s) => s.uuid === manip.supportUuid);
      const supportLabel = support ? formatSupportNumber(support.number) : '-';

      rows.push({ displayIndex: index + 1, supportLabel, ...manip.manip1 });
      if (manip.manip2) {
        rows.push({ displayIndex: null, supportLabel, ...manip.manip2 });
      }
    });

    return rows;
  });

  hasShiftingSupportManip = computed(() => this.supportManipRows().some((row) => row.type === 'shifting'));
  hasCraneSupportManip = computed(() => this.supportManipRows().some((row) => row.type === 'crane'));
  hasRopeSupportManip = computed(() => this.supportManipRows().some((row) => row.type === 'rope'));
  hasChainSupportManip = computed(() => this.supportManipRows().some((row) => row.anchoring === 'with_chain'));

  hasSlingSpanManip = computed(() => this.spanManipRows().some((row) => row.anchoring === 'with_sling'));
  hasChainSpanManip = computed(() => this.spanManipRows().some((row) => row.anchoring === 'with_chain'));

  spanManipRows = computed<SpanManipRow[]>(() =>
    this.spanManips().map((manip) => {
      const { spanLabel, referenceSupportLabel } = this.resolveSpanAndRefSupportLabels(
        manip.spanUuid,
        manip.referenceSupport
      );
      return {
        spanLabel,
        referenceSupport: referenceSupportLabel,
        distanceToRefSupport: manip.distanceToRefSupport,
        cableManipType: manip.cableManipType,
        cableManipMethod: manip.cableManipMethod,
        longitudinalDistance: manip.longitudinalDistance,
        lateralDistance: manip.lateralDistance,
        altitude: manip.altitude,
        anchoring: manip.anchoring,
        slingLength: manip.anchoring === 'with_sling' ? manip.slingLength : null,
        chainName: manip.chainName,
        chainLength: manip.chainLength,
        chainWeight: manip.chainWeight,
        chainSurface: manip.chainSurface,
        counterWeight: manip.counterWeight
      };
    })
  );

  /** Resolves the span label (left - right supports) and the reference support label for a given support/reference pair. */
  private resolveSpanAndRefSupportLabels(
    supportUuid: string,
    referenceSupport: 'LEFT' | 'RIGHT'
  ): { spanLabel: string; referenceSupportLabel: string } {
    const supports = this.spanService.section()?.supports ?? [];
    const supportIndex = supports.findIndex((s) => s.uuid === supportUuid);
    const hasNextSupport = supportIndex >= 0 && supportIndex + 1 < supports.length;

    if (!hasNextSupport) {
      return { spanLabel: '-', referenceSupportLabel: '-' };
    }

    const leftNum = supports[supportIndex]?.number;
    const rightNum = supports[supportIndex + 1]?.number;
    const left = leftNum ? formatSupportNumber(leftNum) : String(supportIndex + 1);
    const right = rightNum ? formatSupportNumber(rightNum) : String(supportIndex + 2);
    const spanLabel = `${left} - ${right}`;
    const referenceSupportLabel = referenceSupport === 'LEFT' ? left : right;

    return { spanLabel, referenceSupportLabel };
  }

  constructor() {
    effect(() => {
      const header = this.headerTemplate();
      const footer = this.footerTemplate();
      if (header && footer) {
        this.toolbarDialogService.setTemplates({ header, footer });
      }
    });

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
          const selectedUuid = this.spanService.section()?.selected_charge_uuid;
          if (selectedUuid) {
            this.mode.set('view');
            this.chargeUuid.set(selectedUuid);
            await this.loadChargeData(selectedUuid);
          }
        }
      }
    });
  }

  private async loadChargeData(uuid: string): Promise<void> {
    const charge = await this.chargesService.getCharge(
      this.plotService.study()?.uuid ?? '',
      this.spanService.section()?.uuid ?? '',
      uuid
    );
    if (charge) {
      this.name.set(charge.name);
      this.personnelPresence.set(charge.personnelPresence);
      this.description.set(charge.description);
      this.climate.set(charge.data?.climate ?? null);
      this.spanLoads.set(charge.data?.spanLoads ?? []);
      this.cableModifParams.set(charge.data?.cableModifParams ?? []);
      const supportManipulations = this.spanService.section()?.cable_support_manipulations ?? [];
      this.supportManips.set(supportManipulations.filter((m) => m.chargeUuid === uuid));
      const spanManipulations = this.spanService.section()?.cable_span_manipulations ?? [];
      // Legacy span manipulations (persisted before per-charge tracking) have no chargeUuid;
      // include them regardless of the active charge, matching the cable-span-manip form's
      // own legacy-compatible lookup (CableSpanManipComponent.normalizeLegacyManipulations).
      this.spanManips.set(spanManipulations.filter((m) => m.chargeUuid === uuid || m.chargeUuid == null));
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
    const sectionUuid = this.spanService.section()?.uuid;
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

  async deleteChargeCase(): Promise<void> {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.spanService.section()?.uuid;
    const uuid = this.chargeUuid();

    if (!studyUuid || !sectionUuid || !uuid) {
      return;
    }

    await this.chargesService.deleteCharge(studyUuid, sectionUuid, uuid);
    this.toolbarDialogService.closeTool();
  }

  async duplicateChargeCase(): Promise<void> {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.spanService.section()?.uuid;
    const uuid = this.chargeUuid();

    if (!studyUuid || !sectionUuid || !uuid) {
      return;
    }

    const newCharge = await this.chargesService.duplicateChargeWithoutSelecting(studyUuid, sectionUuid, uuid);
    this.chargeUuid.set(newCharge.uuid);
    this.mode.set('edit');
    await this.loadChargeData(newCharge.uuid);
  }

  /** Builds the loads report data from the current charge case and triggers PDF generation. */
  async onGenerateReport(): Promise<void> {
    const study = this.plotService.study();
    const section = this.spanService.section();
    const initialCondition = section?.initial_conditions.find(
      (ic) => ic.uuid === section.selected_initial_condition_uuid
    );

    const data: LoadsReportData = {
      date: new Date().toLocaleDateString(this.getLocaleForDate()),
      author: study?.author_email ?? '-',
      studyTitle: study?.title ?? '-',
      studyDescription: study?.description ?? '',
      cantonName: section?.name ?? '-',
      cantonComment: section?.comment ?? '',
      icName: initialCondition?.name ?? '-',
      chargeName: this.name(),
      chargeDescription: this.description(),
      personnelPresence: this.personnelPresence(),
      climate: this.climate() ?? {
        windPressure: null,
        cableTemperature: null,
        symmetryType: SymmetryType.SYMMETRIC,
        iceThickness: null,
        frontierSupportNumber: null,
        iceThicknessBefore: null,
        iceThicknessAfter: null
      },
      frontierSupportLabel: this.getFrontierSupportLabel(this.climate()?.frontierSupportNumber ?? null),
      spanLoads: this.spanLoadRows().map((row) => ({ ...row, type: this.getLoadTypeLabel(row.type) })),
      cableModifications: this.cableModifRows().map((row) => ({
        ...row,
        modificationType: this.getModificationTypeLabel(row.modificationType)
      })),
      supportManipulations: this.supportManipRows().map((row) => ({
        ...row,
        displayIndex: row.displayIndex != null ? String(row.displayIndex) : '',
        type: this.getSupportManipTypeLabel(row.type),
        anchoring: row.anchoring ? this.getSupportAnchoringLabel(row.anchoring) : null
      })),
      spanManipulations: this.spanManipRows().map((row) => ({
        ...row,
        cableManipType: this.getCableManipTypeLabel(row.cableManipType),
        cableManipMethod: this.getCableManipMethodLabel(row.cableManipMethod),
        anchoring: this.getSpanAnchoringLabel(row.anchoring)
      }))
    };

    await this.loadsReportService.generateReport(data);
  }

  private getLocaleForDate(): string {
    const activeLang = this.translocoService.getActiveLang();
    return activeLang === 'en' ? 'en-US' : 'fr-FR';
  }

  getSymmetryLabel(type: SymmetryType): string {
    return this.translocoService.translate(SYMMETRY_TYPE_LABEL_KEYS[type]);
  }

  getLoadTypeLabel(type: string): string {
    const key = LOAD_TYPE_LABEL_KEYS[type as LoadType];
    return key ? this.translocoService.translate(key) : type;
  }

  getModificationTypeLabel(type: 'lengthening' | 'shortening'): string {
    return this.translocoService.translate(CABLE_MODIF_TYPE_LABEL_KEYS[type]);
  }

  getSupportManipTypeLabel(type: SupportManipType): string {
    return this.translocoService.translate(SUPPORT_MANIP_TYPE_LABEL_KEYS[type]);
  }

  getSupportAnchoringLabel(anchoring: SupportAnchoringType | null): string {
    const key = anchoring ? SUPPORT_ANCHORING_LABEL_KEYS[anchoring] : null;
    return key ? this.translocoService.translate(key) : '-';
  }

  getCableManipTypeLabel(type: CableSpanManipulation['cableManipType']): string {
    return this.translocoService.translate(CABLE_MANIP_TYPE_LABEL_KEYS[type]);
  }

  getCableManipMethodLabel(method: CableSpanManipulation['cableManipMethod']): string {
    return this.translocoService.translate(CABLE_MANIP_METHOD_LABEL_KEYS[method]);
  }

  getSpanAnchoringLabel(anchoring: CableSpanManipulation['anchoring']): string {
    return this.translocoService.translate(SPAN_ANCHORING_LABEL_KEYS[anchoring]);
  }

  /** Converts a frontier support index to its formatted support number label (e.g., 2 → 'AC2'). */
  private getFrontierSupportLabel(frontierSupportNumber: number | null): string | null {
    if (frontierSupportNumber === null) return null;
    const supports = this.spanService.section()?.supports ?? [];
    const index = frontierSupportNumber - 1; // Value is 1-based, supports array is 0-based
    const support = supports[index];
    if (!support) return String(frontierSupportNumber);
    return support.number ? formatSupportNumber(support.number) : String(frontierSupportNumber);
  }

  isFormValid(): boolean {
    const existingLoadCases = this.spanService.section()?.charges;
    const currentUuid = this.chargeUuid();
    return this.nameLength() > 0 && !existingLoadCases?.some((c) => c.name === this.name() && c.uuid !== currentUuid);
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.toolbarDialogService.closeTool();
    }
  }
}
