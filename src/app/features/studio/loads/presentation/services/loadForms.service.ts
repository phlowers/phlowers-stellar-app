import { PlotService } from '@services/plot/plot.service';
import { effect, inject, Injectable, signal } from '@angular/core';
import { cloneDeep } from 'lodash';
import { ChargesService } from '@services/charges/charges.service';
import { recheckSpanLoads } from '@shared/domain/helpers/span-loads.helpers';
import { emptySpanLoad } from '../helpers';

@Injectable({
  providedIn: 'root'
})
/** Service coordinating load form state, persisting charge data, and triggering load calculations via the Python worker. */
export class LoadFormsService {
  /** Active tab value for the load p-tabs panel ("0" = Climate, "1" = Load/Marking). */
  readonly activeLoadTab = signal<string>('0');

  /** UUID of the span support to select in the span form, set when clicking a load annotation. Cleared after consumption. */
  readonly selectedSpanSupportUuid = signal<string | null>(null);
  /**
   * Initialize the temporary load data by getting the selected charge case and checking the span loads
   */
  initTemporaryLoadData = () => {
    const currentChargeUuid = this.plotService.section()?.selected_charge_uuid;
    if (!currentChargeUuid) {
      this.plotService.temporaryLoadData = null;
      return;
    }
    const charge = this.plotService.section()?.charges?.find((c) => c.uuid === currentChargeUuid);
    if (!charge) {
      this.plotService.temporaryLoadData = null;
      return;
    }
    const newData = cloneDeep(charge.data);
    newData.spanLoads = recheckSpanLoads(newData.spanLoads || [], this.plotService.section()?.supports ?? []);
    this.plotService.temporaryLoadData = newData;
  };

  private readonly plotService = inject(PlotService);
  private readonly chargesService = inject(ChargesService);

  constructor() {
    effect(() => {
      this.initTemporaryLoadData();
    });
  }

  /**
   * Save the temporary load data in the section by creating or updating the charge case
   */
  saveTemporaryLoadDataInSection = async () => {
    const temporaryLoadData = this.plotService.temporaryLoadData;
    const studyUuid = this.plotService.study()?.uuid;
    const section = this.plotService.section();
    const sectionUuid = section?.uuid;
    if (!studyUuid || !sectionUuid || !temporaryLoadData) {
      return;
    }
    const chargeUuid = section.selected_charge_uuid;
    if (!chargeUuid) {
      return;
    }
    const currentCharge = section.charges?.find((c) => c.uuid === chargeUuid);
    if (!currentCharge) {
      return;
    }
    await this.chargesService.createOrUpdateCharge(studyUuid, sectionUuid, {
      ...currentCharge,
      data: temporaryLoadData
    });
  };

  /**
   * Calculate the load by running the change state task, then re-apply all saved obstacles on top.
   */
  calculateLoad = async () => {
    const temporaryLoadData = this.plotService.temporaryLoadData;
    if (!temporaryLoadData) {
      return;
    }
    this.plotService.refreshCamera();
    this.plotService.loading.set(true);

    const currentSection = this.plotService.section();
    // Ensure spanLoads are valid against current supports before storing in temporaryLoadData
    this.plotService.temporaryLoadData = {
      ...temporaryLoadData,
      spanLoads: recheckSpanLoads(temporaryLoadData.spanLoads, currentSection?.supports ?? [])
    };

    // Delegate full computation (changeState + obstacle re-application) to reapplyObstacles
    await this.plotService.reapplyObstacles();

    this.plotService.loading.set(false);
  };

  /**
   * Reset the span load for the given support UUID to its empty state.
   */
  deleteSpanLoad(supportUuid: string): void {
    const temporaryLoadData = this.plotService.temporaryLoadData;
    if (!temporaryLoadData) return;

    const spanLoad = temporaryLoadData.spanLoads.find((s) => s.supportUuid === supportUuid);
    if (!spanLoad) return;

    const reset = { ...emptySpanLoad, supportUuid };
    Object.assign(spanLoad, reset);
  }

  /**
   * Delete the load by deleting the charge case
   */
  deleteLoad() {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.plotService.section()?.uuid;
    const chargeUuid = this.plotService.section()?.selected_charge_uuid;
    if (!studyUuid || !sectionUuid || !chargeUuid) return;
    this.chargesService.deleteCharge(studyUuid, sectionUuid, chargeUuid);
  }
}
