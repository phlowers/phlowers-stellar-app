/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable, signal } from '@angular/core';
import { ProtoV4Parameters, ProtoV4Support, Support, InitialCondition } from '@core/domain';
import { StudyEntity } from '@core/infrastructure/database';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '@services/storage/storage.service';
import { BehaviorSubject } from 'rxjs';
import { createEmptySection, createEmptySupport } from '@services/sections/helpers';
import { findDuplicateTitle } from '@ui/shared/helpers/duplicate';
import { liveQuery } from 'dexie';
import { MessageService } from 'primeng/api';
import { createEmptyStudy } from '@ui/pages/studies/components/new-study-modal/new-study-modal.component';

@Injectable({
  providedIn: 'root'
})
/**
 * Service for managing study entities stored in the local IndexedDB database.
 * Provides CRUD operations, duplication, import/export, and live-query capabilities.
 */
export class StudiesService {
  /** Emits `true` when the underlying storage is ready. */
  public readonly ready = new BehaviorSubject<boolean>(false);

  /** Emits the current list of all studies whenever it changes. */
  public readonly studies = new BehaviorSubject<StudyEntity[]>([]);
  /** Signal holding the data for the export dialog (UUID, title, open state). */
  public readonly exportDialogData = signal<{
    uuid: string;
    title: string;
    isOpen: boolean;
  } | null>(null);

  constructor(
    private readonly storageService: StorageService,
    private readonly messageService: MessageService
  ) {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  private get db() {
    return this.storageService.db;
  }

  private async refreshStudies(): Promise<StudyEntity[]> {
    const studies = (await this.getStudies()) ?? [];
    this.studies.next(studies);
    return studies;
  }

  private async getUserEmail(): Promise<string> {
    const user = (await this.db?.users.toArray())?.[0];
    return user?.email ?? '';
  }

  /**
   * Create a new study
   * @param study The study to create
   */
  async createStudy(
    study: Pick<StudyEntity, 'title' | 'description' | 'shareable' | 'sections' | 'author_email'>,
    newUuid?: string
  ): Promise<string> {
    const uuid = newUuid || uuidv4();
    const userEmail = await this.getUserEmail();
    await this.db?.studies.add({
      ...study,
      author_email: study.author_email || userEmail,
      uuid,
      created_at_offline: new Date().toISOString(),
      updated_at_offline: new Date().toISOString(),
      saved: false
    });
    await this.refreshStudies();
    return uuid;
  }

  /**
   * Get all studies
   * @returns The studies
   */
  getStudies() {
    return this.db?.studies.toArray();
  }

  /**
   * Get a study by uuid
   * @param uuid The uuid of the study to get
   * @returns The study
   */
  getStudy(uuid: string) {
    return this.db?.studies.get(uuid);
  }

  /**
   * Duplicate a study
   * @param uuid The uuid of the study to duplicate
   */
  async duplicateStudy(uuid: string): Promise<StudyEntity | null> {
    const study = await this.db?.studies.get(uuid);
    if (!study) {
      return null;
    }
    const userEmail = await this.getUserEmail();
    const allStudies = (await this.db?.studies.toArray()) ?? [];
    const allStudyTitles = allStudies.map((studyItem) => studyItem.title);
    const duplicateTitle = findDuplicateTitle(allStudyTitles, study.title);
    const newStudy = {
      ...study,
      title: duplicateTitle,
      author_email: userEmail || study.author_email,
      uuid: uuidv4(),
      created_at_offline: new Date().toISOString(),
      updated_at_offline: new Date().toISOString(),
      saved: false
    };
    await this.db?.studies.add(newStudy);
    await this.refreshStudies();
    return newStudy;
  }

  /**
   * Delete a study
   * @param uuid The uuid of the study to delete
   */
  async deleteStudy(uuid: string) {
    await this.db?.studies.delete(uuid);
    await this.refreshStudies();
  }

  /**
   * Delete all studies
   */
  async deleteAllStudies() {
    await this.db?.studies.clear();
    await this.refreshStudies();
  }

  /**
   * Get the latest studies
   * @returns The latest studies
   */
  getLatestStudies() {
    return this.db?.studies.orderBy('created_at_offline').reverse().limit(4).toArray();
  }

  /**
   * Update a study
   * @param study The study to update
   */
  async updateStudy(study: { uuid: string; author_email: string } & Partial<StudyEntity>, overrideAuthorCheck = false) {
    const userEmail = await this.getUserEmail();
    if (!overrideAuthorCheck && userEmail !== study.author_email) {
      const errorMessage = $localize`You cannot update a study that you did not create, please duplicate it instead.`;
      this.messageService.add({
        severity: 'error',
        summary: $localize`Unauthorized`,
        detail: errorMessage
      });
      throw new Error(errorMessage);
    }
    await this.db?.studies.update(study.uuid, {
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
  async createStudyFromProtoV4(protoV4Supports: ProtoV4Support[], parameters: ProtoV4Parameters): Promise<StudyEntity> {
    const section = this.buildSectionFromProtoV4(parameters, protoV4Supports);
    const uuid = await this.createStudy({
      ...createEmptyStudy(),
      author_email: '',
      title: parameters.project_name,
      description: $localize`Study imported from protoV4`,
      shareable: false,
      sections: [section]
    });
    const study = await this.getStudy(uuid);
    return study!;
  }

  /**
   * Export a study
   * @param uuid The uuid of the study to export
   */
  async downloadStudy(uuid: string, filename: string) {
    const study = await this.getStudy(uuid);
    if (!study) {
      return;
    }
    const studyBase64 = btoa(JSON.stringify(study));
    const blob = new Blob([studyBase64], {
      type: 'application/octet-stream'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.clst`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  /**
   * Get a study as an observable
   * @param uuid The uuid of the study to get
   * @returns
   */
  getStudyAsObservable(uuid: string) {
    return liveQuery(() => this.db?.studies.get(uuid));
  }

  private buildSectionFromProtoV4(parameters: ProtoV4Parameters, protoV4Supports: ProtoV4Support[]) {
    const section = createEmptySection();
    section.name = parameters.section_name;
    section.type = 'phase';
    section.cables_amount = parameters.cable_amount;
    section.cable_name = parameters.conductor;
    section.supports = this.buildSupportsFromProtoV4(protoV4Supports, parameters.conductor);
    const initialCondition = this.buildInitialCondition(parameters);
    section.initial_conditions = [initialCondition];
    section.selected_initial_condition_uuid = initialCondition.uuid;
    return section;
  }

  private buildSupportsFromProtoV4(protoV4Supports: ProtoV4Support[], conductor: string): Support[] {
    return protoV4Supports.map((support) => ({
      ...createEmptySupport(),
      uuid: uuidv4(),
      number: support.nom,
      spanLength: support.portée,
      spanAngle: support.angle_ligne,
      attachmentHeight: support.alt_acc,
      cableType: conductor,
      armLength: support.long_bras,
      chainLength: support.long_ch,
      chainWeight: support.pds_ch,
      counterWeight: support.ctr_poids,
      chainV: support.ch_en_V,
      chainSurface: support.surf_ch,
      supportFootAltitude: support.alt_acc - 30 > 0 ? support.alt_acc - 30 : 0
    }));
  }

  private buildInitialCondition(parameters: ProtoV4Parameters): InitialCondition {
    return {
      uuid: uuidv4(),
      name: $localize`IC 1`,
      base_parameters: parameters.parameter,
      base_temperature: parameters.temperature_reference,
      cable_pretension: parameters.cra,
      min_temperature: parameters.temp_load,
      max_wind_pressure: parameters.wind_load,
      max_frost_width: parameters.frost_load
    };
  }
}
