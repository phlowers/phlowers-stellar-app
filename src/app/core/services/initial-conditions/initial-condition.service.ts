/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { Section } from '../../data/database/interfaces/section';
import { Study } from '../../data/database/interfaces/study';
import { InitialCondition } from '../../data/database/interfaces/initialCondition';
import { StudiesService } from '../studies/studies.service';
import { v4 as uuidv4 } from 'uuid';

export interface InitialConditionFunctionsInput {
  section: Section;
  initialCondition: InitialCondition;
}

@Injectable({
  providedIn: 'root'
})
export class InitialConditionService {
  constructor(private readonly studiesService: StudiesService) {}

  /**
   * Update an initial condition in a section
   * @param study The study containing the section
   * @param section The section containing the initial condition
   * @param initialCondition The initial condition to update
   * @returns Promise that resolves when the operation is complete
   */
  async updateInitialCondition(
    study: Study,
    section: Section,
    initialCondition: InitialCondition
  ): Promise<void> {
    study.sections = study.sections.map((s) =>
      s?.uuid === section?.uuid
        ? {
            ...s,
            initial_conditions: s.initial_conditions?.map((ic) =>
              ic?.uuid === initialCondition?.uuid ? initialCondition : ic
            )
          }
        : s
    );
    await this.studiesService.updateStudy(study);
  }

  /**
   * Add an initial condition to a section
   * @param study The study containing the section
   * @param section The section to add the initial condition to
   * @param initialCondition The initial condition to add
   * @returns Promise that resolves when the operation is complete
   */
  async addInitialCondition(
    study: Study,
    section: Section,
    initialCondition: InitialCondition
  ): Promise<void> {
    study.sections = study.sections.map((s) =>
      s?.uuid === section?.uuid
        ? {
            ...s,
            initial_conditions: [
              ...(s.initial_conditions || []),
              initialCondition
            ]
          }
        : s
    );
    await this.studiesService.updateStudy(study);
  }

  /**
   * Delete an initial condition from a section
   * @param study The study containing the section
   * @param section The section containing the initial condition
   * @param initialCondition The initial condition to delete
   * @returns Promise that resolves when the operation is complete
   */
  async deleteInitialCondition(
    study: Study,
    section: Section,
    initialCondition: InitialCondition
  ): Promise<void> {
    study.sections = study.sections.map((s) =>
      s?.uuid === section?.uuid
        ? {
            ...s,
            initial_conditions: s.initial_conditions?.filter(
              (ic) => ic?.uuid !== initialCondition?.uuid
            )
          }
        : s
    );
    await this.studiesService.updateStudy(study);
  }

  /**
   * Duplicate an initial condition in a section
   * @param study The study containing the section
   * @param section The section containing the initial condition
   * @param initialCondition The initial condition to duplicate
   * @returns Promise that resolves when the operation is complete
   */
  async duplicateInitialCondition(
    study: Study,
    section: Section,
    initialCondition: InitialCondition
  ): Promise<void> {
    study.sections = study.sections.map((s) =>
      s?.uuid === section?.uuid
        ? {
            ...s,
            initial_conditions: [
              ...(s.initial_conditions || []),
              { ...initialCondition, uuid: uuidv4() }
            ]
          }
        : s
    );
    await this.studiesService.updateStudy(study);
  }
}
