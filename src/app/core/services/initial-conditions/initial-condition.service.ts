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
import { findDuplicateTitle } from '@src/app/ui/shared/helpers/duplicate';
import { cloneDeep } from 'lodash';

export interface InitialConditionFunctionsInput {
  section: Section;
  initialCondition: InitialCondition;
  generateState?: boolean;
}

export interface DuplicateInitialConditionFunctionsInput
  extends InitialConditionFunctionsInput {
  newUuid: string;
}

@Injectable({
  providedIn: 'root'
})
export class InitialConditionService {
  constructor(private readonly studiesService: StudiesService) {}

  /**
   * Helper method to clone a study, apply modifications, and update it
   * @param study The study to clone and update
   * @param modifier Function that modifies the cloned study
   * @returns Promise that resolves when the operation is complete
   */
  private async updateStudyWithModification(
    study: Study,
    modifier: (studyCopy: Study) => void,
    overrideAuthorCheck = false
  ): Promise<void> {
    const studyCopy = cloneDeep(study);
    modifier(studyCopy);
    await this.studiesService.updateStudy(studyCopy, overrideAuthorCheck);
  }

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
    await this.updateStudyWithModification(study, (studyCopy) => {
      studyCopy.sections = study.sections.map((s) =>
        s?.uuid === section?.uuid
          ? {
              ...s,
              initial_conditions: s.initial_conditions?.map((ic) =>
                ic?.uuid === initialCondition?.uuid ? initialCondition : ic
              )
            }
          : s
      );
    });
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
    await this.updateStudyWithModification(study, (studyCopy) => {
      studyCopy.sections = studyCopy.sections.map((s) =>
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
    });
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
    await this.updateStudyWithModification(study, (studyCopy) => {
      studyCopy.sections = study.sections.map((s) =>
        s?.uuid === section?.uuid
          ? {
              ...s,
              initial_conditions: s.initial_conditions?.filter(
                (ic) => ic?.uuid !== initialCondition?.uuid
              ),
              selected_initial_condition_uuid:
                s.selected_initial_condition_uuid === initialCondition?.uuid
                  ? undefined
                  : s.selected_initial_condition_uuid
            }
          : s
      );
    });
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
    initialCondition: InitialCondition,
    newUuid: string
  ): Promise<string> {
    await this.updateStudyWithModification(study, (studyCopy) => {
      studyCopy.sections = study.sections.map((s) =>
        s?.uuid === section?.uuid
          ? {
              ...s,
              initial_conditions: [
                ...(s.initial_conditions || []),
                {
                  ...initialCondition,
                  uuid: newUuid,
                  name: findDuplicateTitle(
                    s.initial_conditions?.map((ic) => ic.name),
                    initialCondition.name
                  )
                }
              ]
            }
          : s
      );
    });
    return newUuid;
  }

  /**
   * Set an initial condition as the selected initial condition in a section
   * @param study The study containing the section
   * @param section The section containing the initial condition
   * @param initialCondition The initial condition to set as the selected initial condition
   * @returns Promise that resolves when the operation is complete
   */
  async setInitialCondition(
    study: Study,
    section: Section,
    initialConditionUuid: string
  ): Promise<void> {
    const studyToUpdate = await this.studiesService.getStudy(study.uuid);
    if (!studyToUpdate) {
      return;
    }
    await this.updateStudyWithModification(
      studyToUpdate,
      (studyCopy) => {
        studyCopy.sections = studyCopy.sections.map((s) =>
          s?.uuid === section?.uuid
            ? { ...s, selected_initial_condition_uuid: initialConditionUuid }
            : s
        );
      },
      true
    );
  }

  async getInitialCondition(
    studyUuid: string,
    sectionUuid: string,
    initialConditionUuid: string
  ): Promise<InitialCondition | undefined> {
    const study = await this.studiesService.getStudy(studyUuid);
    const section = study?.sections.find((s) => s?.uuid === sectionUuid);
    const initialCondition = section?.initial_conditions?.find(
      (ic) => ic?.uuid === initialConditionUuid
    );
    return initialCondition;
  }
}
