import { PlotService } from '@ui/pages/studio/services/plot.service';
import { effect, Injectable } from '@angular/core';
import { cloneDeep } from 'lodash';
import { ChargesService } from '@src/app/core/services/charges/charges.service';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { Task } from '@src/app/core/services/worker_python/tasks/types';
import { recheckSpanLoads } from './helpers';

@Injectable({
  providedIn: 'root'
})
export class LoadFormsService {
  /**
   * Initialize the temporary load data by getting the selected charge case and checking the span loads
   */
  initTemporaryLoadData = () => {
    const currentChargeUuid = this.plotService.section()?.selected_charge_uuid;
    if (!currentChargeUuid) {
      this.plotService.temporaryLoadData = null;
      return;
    }
    const charge = this.plotService
      .section()
      ?.charges?.find((c) => c.uuid === currentChargeUuid);
    if (!charge) {
      this.plotService.temporaryLoadData = null;
      return;
    }
    const newData = cloneDeep(charge.data);
    newData.spanLoads = recheckSpanLoads(
      newData.spanLoads || [],
      this.plotService.section()?.supports ?? []
    );
    this.plotService.temporaryLoadData = newData;
  };

  constructor(
    private readonly plotService: PlotService,
    private readonly chargesService: ChargesService,
    private readonly workerPythonService: WorkerPythonService
  ) {
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
    const sectionUuid = this.plotService.section()?.uuid;
    if (!studyUuid || !sectionUuid || !temporaryLoadData) {
      return;
    }
    const currentCharge = await this.chargesService.getSelectedChargeCase(
      studyUuid,
      sectionUuid
    );
    if (!currentCharge) {
      return;
    }
    currentCharge.data = temporaryLoadData;
    await this.chargesService.createOrUpdateCharge(
      studyUuid,
      sectionUuid,
      currentCharge
    );
  };

  /**
   * Calculate the load by running the change state task
   */
  calculateLoad = async () => {
    const temporaryLoadData = this.plotService.temporaryLoadData;
    if (!temporaryLoadData) {
      return;
    }
    this.plotService.refreshCamera();
    this.plotService.loading.set(true);
    const currentSection = this.plotService.section();
    const { result, error } = await this.workerPythonService.runTask(
      Task.changeState,
      {
        climate: temporaryLoadData!.climate,
        spanLoads: recheckSpanLoads(
          temporaryLoadData!.spanLoads,
          currentSection?.supports ?? []
        )
      }
    );
    this.plotService.litData.set(result);
    this.plotService.error.set(error);
    this.plotService.loading.set(false);
  };

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
