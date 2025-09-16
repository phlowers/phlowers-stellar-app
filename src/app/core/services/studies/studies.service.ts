/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { StudyModel } from '../../data/models/study.model';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../storage/storage.service';
import { BehaviorSubject } from 'rxjs';
import { Study } from '../../data/database/interfaces/study';
import {
  ProtoV4Parameters,
  ProtoV4Support
} from '../../data/database/interfaces/protoV4';
import { createEmptySection, createEmptySupport } from '../sections/helpers';
import { Support } from '../../data/database/interfaces/support';
import { findDuplicateTitle } from '@src/app/ui/shared/helpers/duplicate';

@Injectable({
  providedIn: 'root'
})
export class StudiesService {
  public readonly ready = new BehaviorSubject<boolean>(false);

  public readonly studies = new BehaviorSubject<Study[]>([]);

  constructor(private readonly storageService: StorageService) {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  /**
   * Create a new study
   * @param study The study to create
   */
  async createStudy(
    study: Pick<StudyModel, 'title' | 'description' | 'shareable' | 'sections'>
  ): Promise<string> {
    const uuid = uuidv4();
    const user = (await this.storageService.db?.users.toArray())?.[0];
    await this.storageService.db?.studies.add({
      ...study,
      uuid,
      author_email: user.email,
      created_at_offline: new Date().toISOString(),
      updated_at_offline: new Date().toISOString(),
      saved: false
    });
    const studies = await this.getStudies();
    this.studies.next(studies);
    return uuid;
  }

  /**
   * Get all studies
   * @returns The studies
   */
  getStudies() {
    return this.storageService.db?.studies.toArray();
  }

  /**
   * Get a study by uuid
   * @param uuid The uuid of the study to get
   * @returns The study
   */
  getStudy(uuid: string) {
    return this.storageService.db?.studies.get(uuid);
  }

  /**
   * Duplicate a study
   * @param uuid The uuid of the study to duplicate
   */
  async duplicateStudy(uuid: string): Promise<Study | null> {
    const study = await this.storageService.db?.studies.get(uuid);
    if (!study) {
      return null;
    }
    const allStudies = await this.storageService.db?.studies.toArray();
    const allStudyTitles = allStudies?.map((study) => study.title);
    const duplicateTitle = findDuplicateTitle(allStudyTitles, study.title);
    const newStudy = {
      ...study,
      title: duplicateTitle,
      uuid: uuidv4(),
      created_at_offline: new Date().toISOString(),
      updated_at_offline: new Date().toISOString(),
      saved: false
    };
    await this.storageService.db?.studies.add(newStudy);
    const studies = await this.getStudies();
    this.studies.next(studies);
    return newStudy;
  }

  /**
   * Delete a study
   * @param uuid The uuid of the study to delete
   */
  async deleteStudy(uuid: string) {
    await this.storageService.db?.studies.delete(uuid);
    const studies = await this.getStudies();
    this.studies.next(studies);
  }

  /**
   * Delete all studies
   */
  async deleteAllStudies() {
    await this.storageService.db?.studies.clear();
    const studies = await this.getStudies();
    this.studies.next(studies);
  }

  /**
   * Get the latest studies
   * @returns The latest studies
   */
  getLatestStudies() {
    return this.storageService.db?.studies
      .orderBy('created_at_offline')
      .reverse()
      .limit(4)
      .toArray();
  }

  /**
   * Update a study
   * @param study The study to update
   */
  async updateStudy(study: { uuid: string } & Partial<Study>) {
    await this.storageService.db?.studies.update(study.uuid, {
      ...study,
      updated_at_offline: new Date().toISOString()
    });
  }

  /**
   * Create a study from a proto v4 project
   * @param protoV4Supports The supports of the proto v4 project
   * @param parameters The parameters of the proto v4 project
   * @returns The study
   */
  async createStudyFromProtoV4(
    protoV4Supports: ProtoV4Support[],
    parameters: ProtoV4Parameters
  ): Promise<StudyModel> {
    const section = createEmptySection();
    section.name = parameters.project_name;
    section.type = 'phase';
    section.cables_amount = parameters.cable_amount;
    section.cable_name = parameters.conductor;
    const supports: Support[] = protoV4Supports.map((support) => {
      return {
        ...createEmptySupport(),
        uuid: uuidv4(),
        number: support.num,
        name: support.nom,
        spanLength: support.portée,
        spanAngle: support.angle_ligne,
        attachmentHeight: support.alt_acc,
        cableType: parameters.conductor,
        armLength: support.long_bras,
        chainName: support.suspension ? 'suspension' : 'chain',
        chainLength: support.long_ch,
        chainWeight: support.ctr_poids,
        chainV: support.ch_en_V
      };
    });
    section.supports = supports;
    const uuid = await this.createStudy({
      title: parameters.project_name,
      description: $localize`Study imported from protoV4`,
      shareable: false,
      sections: [section]
    });
    const study = await this.getStudy(uuid);
    return study as StudyModel;
  }
}
