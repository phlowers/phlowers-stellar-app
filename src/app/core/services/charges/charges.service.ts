/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Charge, Section } from '@shared/domain';
import { StudyEntity } from '@infrastructure/database';
import { StudiesService } from '@services/studies/studies.service';
import { v4 as uuidv4 } from 'uuid';
import { findDuplicateTitle } from '@shared/helpers/duplicate';
import { MessageService } from 'primeng/api';

/**
 * Service for managing charge cases within sections.
 *
 * @remarks
 * The ChargesService provides CRUD operations for charge cases, which
 * represent different loading scenarios for mechanical calculations.
 * Each section can have multiple charges with one selected as active.
 *
 * @example
 * ```typescript
 * // Create a new charge
 * await this.chargesService.createOrUpdateCharge(studyUuid, sectionUuid, charge);
 *
 * // Get the selected charge
 * const selectedCharge = await this.chargesService.getSelectedChargeCase(studyUuid, sectionUuid);
 * ```
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class ChargesService {
  private readonly studiesService = inject(StudiesService);
  private readonly messageService = inject(MessageService);
  private readonly translocoService = inject(TranslocoService);

  /**
   * Helper method to get study and section, throwing errors if not found
   * @param studyUuid The uuid of the study
   * @param sectionUuid The uuid of the section
   * @returns Promise that resolves with both study and section
   */
  private async getStudyAndSection(
    studyUuid: string,
    sectionUuid: string
  ): Promise<{ study: StudyEntity; section: Section }> {
    const study = await this.studiesService.getStudy(studyUuid);
    if (!study) {
      throw new Error(`Study with uuid ${studyUuid} not found`);
    }

    const section = study.sections.find((s) => s?.uuid === sectionUuid);
    if (!section) {
      throw new Error(`Section with uuid ${sectionUuid} not found`);
    }

    return { study, section };
  }

  /**
   * Create or update a charge in a section
   * @param studyUuid The uuid of the study containing the section
   * @param sectionUuid The uuid of the section containing the charge
   * @param charge The charge to create or update
   * @returns Promise that resolves when the operation is complete
   */
  async createOrUpdateCharge(studyUuid: string, sectionUuid: string, charge: Charge): Promise<void> {
    const { study, section } = await this.getStudyAndSection(studyUuid, sectionUuid);

    const existingCharge = section.charges?.find((c) => c?.uuid === charge?.uuid) || null;

    if (existingCharge) {
      section.charges = section.charges?.filter((c) => existingCharge?.uuid !== c?.uuid) ?? [];
      section.charges = [charge, ...(section.charges?.filter((c) => c?.uuid !== charge?.uuid) ?? [])];
    } else {
      section.charges = [charge, ...(section.charges || [])];
    }
    section.selected_charge_uuid = charge?.uuid ?? null;

    await this.studiesService.updateStudy(study);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('common.notification.severity-successful'),
      detail: existingCharge
        ? this.translocoService.translate('shared.charges-service.update-detail')
        : this.translocoService.translate('shared.charges-service.create-detail')
    });
  }

  /**
   * Delete a charge from a section
   * @param studyUuid The uuid of the study containing the section
   * @param sectionUuid The uuid of the section containing the charge
   * @param chargeUuid The uuid of the charge to delete
   * @returns Promise that resolves when the operation is complete
   */
  async deleteCharge(studyUuid: string, sectionUuid: string, chargeUuid: string): Promise<void> {
    const { study, section } = await this.getStudyAndSection(studyUuid, sectionUuid);

    section.charges = section.charges.filter((c) => c?.uuid !== chargeUuid);
    if (section.selected_charge_uuid === chargeUuid) {
      section.selected_charge_uuid = null;
    }
    await this.studiesService.updateStudy(study);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('common.notification.severity-successful'),
      detail: this.translocoService.translate('shared.charges-service.delete-detail'),
      life: 500
    });
  }

  /**
   * Duplicate a charge in a section
   * @param studyUuid The uuid of the study containing the section
   * @param sectionUuid The uuid of the section containing the charge
   * @param chargeUuid The uuid of the charge to duplicate
   * @returns Promise that resolves with the duplicated charge
   */
  async duplicateCharge(studyUuid: string, sectionUuid: string, chargeUuid: string): Promise<Charge> {
    const { study, section } = await this.getStudyAndSection(studyUuid, sectionUuid);

    const charge = section.charges?.find((c) => c?.uuid === chargeUuid) ?? null;
    if (!charge) {
      throw new Error(`Charge with uuid ${chargeUuid} not found`);
    }

    const newCharge: Charge = {
      ...charge,
      uuid: uuidv4(),
      name: findDuplicateTitle(
        section.charges.map((c) => c.name),
        charge.name,
        this.translocoService.translate('shared.duplicate.copy-suffix')
      )
    };

    section.charges = [newCharge, ...section.charges];
    section.selected_charge_uuid = newCharge.uuid;
    await this.studiesService.updateStudy(study);
    return newCharge;
  }

  /**
   * Set the selected charge for a section.
   *
   * @param studyUuid - The UUID of the study containing the section
   * @param sectionUuid - The UUID of the section
   * @param chargeUuid - The UUID of the charge to select
   * @returns Promise that resolves when the operation is complete
   */
  async setSelectedCharge(studyUuid: string, sectionUuid: string, chargeUuid: string): Promise<void> {
    const { study, section } = await this.getStudyAndSection(studyUuid, sectionUuid);

    section.selected_charge_uuid = chargeUuid;
    await this.studiesService.updateStudy(study, true);
  }

  /**
   * Get a charge by uuid
   * @param studyUuid The uuid of the study containing the section
   * @param sectionUuid The uuid of the section containing the charge
   * @param chargeUuid The uuid of the charge to get
   * @returns The charge
   */
  async getCharge(studyUuid: string, sectionUuid: string, chargeUuid: string): Promise<Charge | null> {
    const { section } = await this.getStudyAndSection(studyUuid, sectionUuid);

    return section.charges?.find((c) => c?.uuid === chargeUuid) ?? null;
  }

  /**
   * Get the selected charge case by uuid
   * @param studyUuid The uuid of the study containing the section
   * @param sectionUuid The uuid of the section containing the charge
   * @returns The selected charge case
   */
  async getSelectedChargeCase(studyUuid: string, sectionUuid: string): Promise<Charge | null> {
    const { section } = await this.getStudyAndSection(studyUuid, sectionUuid);
    if (!section.selected_charge_uuid) {
      return null;
    }
    return section.charges?.find((c) => c?.uuid === section.selected_charge_uuid) ?? null;
  }
}
