/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { Section } from '../../data/database/interfaces/section';
import { Study } from '../../data/database/interfaces/study';
import { StudiesService } from '../studies/studies.service';
import { v4 as uuidv4 } from 'uuid';

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
  async createOrUpdateSection(study: Study, section: Section): Promise<void> {
    const existingSection = study.sections.find(
      (s) => s?.uuid === section?.uuid
    );

    const nowDate = new Date().toISOString();
    section.updated_at = nowDate;
    if (existingSection) {
      study.sections = study.sections.map((s) =>
        s?.uuid === section?.uuid ? section : s
      );
    } else {
      section.created_at = nowDate;
      study.sections = [...study.sections, section];
    }

    await this.studiesService.updateStudy(study);
  }

  /**
   * Delete a section from a study
   * @param study The study containing the section
   * @param section The section to delete
   * @returns Promise that resolves when the operation is complete
   */
  async deleteSection(study: Study, section: Section): Promise<void> {
    study.sections = study.sections.filter((s) => s?.uuid !== section?.uuid);
    await this.studiesService.updateStudy(study);
  }

  /**
   * Duplicate a section in a study
   * @param study The study containing the section
   * @param section The section to duplicate
   * @returns Promise that resolves when the operation is complete
   */
  async duplicateSection(study: Study, section: Section): Promise<void> {
    study.sections = [
      ...study.sections,
      {
        ...section,
        uuid: uuidv4(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    await this.studiesService.updateStudy(study);
  }
}
