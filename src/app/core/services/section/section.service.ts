/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Section } from '@shared/domain';
import { StudyEntity } from '@infrastructure/database';
import { StudiesService } from '@services/studies/studies.service';
import { v4 as uuidv4 } from 'uuid';
import { findDuplicateTitle } from '@shared/helpers/duplicate';
import { cloneDeep } from 'lodash';
import { sanitizeSectionGeometry } from './section-geometry.helpers';
import { SectionUpdateResult } from './section-geometry.interfaces';

@Injectable({
  providedIn: 'root'
})
/**
 * Service for creating, updating, duplicating, deleting, and retrieving
 * sections within a study.
 */
export class SectionService {
  private readonly studiesService = inject(StudiesService);
  private readonly translocoService = inject(TranslocoService);

  /**
   * Create or update a section in a study. Obstacles and loads referencing a support/span
   * that no longer exists in the section geometry are pruned before persisting.
   * @param study The study containing the section
   * @param section The section to create or update
   * @returns Promise resolving with whether obstacles/loads were removed to match the geometry
   */
  async createOrUpdateSection(study: StudyEntity, section: Section): Promise<SectionUpdateResult> {
    const existingSection = study.sections.find((s) => s?.uuid === section?.uuid);
    const studyKeep = cloneDeep(study);

    const { section: sanitizedSection, removedGeometryBoundObjects } = sanitizeSectionGeometry(section);

    const nowDate = new Date().toISOString();
    sanitizedSection.updated_at = nowDate;
    if (existingSection) {
      study.sections = study.sections.map((s) => (s?.uuid === sanitizedSection?.uuid ? sanitizedSection : s));
    } else {
      sanitizedSection.created_at = nowDate;
      study.sections = [...study.sections, sanitizedSection];
    }

    await this.studiesService.updateStudy(study).catch((error: Error) => {
      study.sections = studyKeep.sections;
      throw error;
    });

    return { removedGeometryBoundObjects };
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
        section.name,
        this.translocoService.translate('shared.duplicate.copy-suffix')
      ),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    study.sections = [...study.sections, newSection];
    await this.studiesService.updateStudy(study);
    return newSection;
  }

  /**
   * Retrieves a section by its UUID within a given study.
   * @param studyUuid - UUID of the study (may be `undefined`).
   * @param sectionUuid - UUID of the section to find.
   * @returns The matching `Section` or `undefined`.
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
