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

@Injectable({
  providedIn: 'root'
})
export class StudiesService {
  public readonly ready = new BehaviorSubject<boolean>(false);

  constructor(private readonly storageService: StorageService) {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  /**
   * Create a new study
   * @param study The study to create
   */
  async createStudy(study: StudyModel) {
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
  }

  getStudies() {
    return this.storageService.db?.studies.toArray();
  }

  getLatestStudies() {
    return this.storageService.db?.studies
      .orderBy('created_at_offline')
      .reverse()
      .limit(4)
      .toArray();
  }
}
