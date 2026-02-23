/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { Section } from '@core/domain';
import { StudyEntity } from '@core/infrastructure/database';
import { StudiesService } from '@services/studies/studies.service';
import { v4 as uuidv4 } from 'uuid';
import { findDuplicateTitle } from '@ui/shared/helpers/duplicate';
import { cloneDeep } from 'lodash';

/**
 * Service for managing sections within studies.
 *
 * @remarks
 * The SectionService provides CRUD operations for sections, which are
 * the primary organizational unit for grouping supports, charges, and
 * initial conditions within a study.
 *
 * @example
 * ```typescript
 * // Injecting and using the service
 * constructor(private sectionService: SectionService) {}
 *
 * // Create a new section
 * await this.sectionService.createOrUpdateSection(study, newSection);
 *
 * // Get current section from signal
 * const section = this.sectionService.currentSection();
 * ```
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class SectionService {
  constructor(private readonly studiesService: StudiesService) {}

  /**
   * Create or update a section in a study
   * @param study The study containing the section
   * @param section The section to create or update
   * @returns Promise that resolves when the operation is complete
   */
  async createOrUpdateSection(study: StudyEntity, section: Section): Promise<void> {
    const existingSection = study.sections.find((s) => s?.uuid === section?.uuid);
    const studyKeep = cloneDeep(study);

    const nowDate = new Date().toISOString();
    section.updated_at = nowDate;
    if (existingSection) {
      study.sections = study.sections.map((s) => (s?.uuid === section?.uuid ? section : s));
    } else {
      section.created_at = nowDate;
      study.sections = [...study.sections, section];
    }

    await this.studiesService.updateStudy(study).catch((error: Error) => {
      study.sections = studyKeep.sections;
      throw error;
    });
  }

  /**
   * Delete a section from a study
   * @param study The study containing the section
   * @param section The section to delete
   * @returns Promise that resolves when the operation is complete
   */
  async deleteSection(study: StudyEntity, section: Section): Promise<void> {
    study.sections = study.sections.filter((s) => s?.uuid !== section?.uuid);
    await this.studiesService.updateStudy(study);
  }

  /**
   * Duplicate a section in a study
   * @param study The study containing the section
   * @param section The section to duplicate
   * @returns Promise that resolves when the operation is complete
   */
  async duplicateSection(study: StudyEntity, section: Section): Promise<Section> {
    const newSection = {
      ...section,
      uuid: uuidv4(),
      name: findDuplicateTitle(
        study.sections.map((s) => s.name),
        section.name
      ),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    study.sections = [...study.sections, newSection];
    await this.studiesService.updateStudy(study);
    return newSection;
  }

  /**
   * Retrieve a section by its UUID from a specific study.
   *
   * @param studyUuid - The UUID of the study containing the section, or undefined
   * @param sectionUuid - The UUID of the section to retrieve
   * @returns Promise resolving to the section if found, undefined otherwise
   */
  getSectionByUuid(studyUuid: string | undefined, sectionUuid: string): Promise<Section | undefined> {
    if (!studyUuid) {
      return Promise.resolve(undefined);
    }
    return this.studiesService.getStudy(studyUuid).then((study) => {
      return study?.sections.find((s) => s?.uuid === sectionUuid);
    });
  }
}
