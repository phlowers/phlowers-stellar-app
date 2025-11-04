/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { StorageService } from '../storage/storage.service';
import { BehaviorSubject, catchError, of } from 'rxjs';
import Papa from 'papaparse';
import { HttpClient } from '@angular/common/http';
import {
  Attachment,
  RteAttachmentsCsvFile
} from '../../data/database/interfaces/attachment';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class AttachmentService {
  public readonly ready = new BehaviorSubject<boolean>(false);

  constructor(
    private readonly storageService: StorageService,
    private readonly http: HttpClient
  ) {
    this.storageService.ready$.subscribe((value) => {
      this.ready.next(value);
    });
  }

  async getAttachments() {
    return this.storageService.db?.attachments.toArray();
  }

  /**
   * Import attachments from csv file
   */
  async importFromFile() {
    const attachments = this.http
      .get(`${window.location.origin}/data/attachments.csv`, {
        responseType: 'text'
      })
      .pipe(
        catchError((error) => {
          console.error('Error importing attachments', error);
          return of('');
        })
      );

    const mapData = (data: RteAttachmentsCsvFile[]): Attachment[] => {
      return data
        .filter((item) => item.support_name)
        .map((item) => ({
          uuid: uuidv4(),
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          support_name: item.support_name,
          attachment_set: item.set_number,
          support_order: parseInt(item.set_number),
          attachment_altitude: parseFloat(item.altitude),
          cross_arm_length: parseFloat(item.arm_length)
        }));
    };

    await new Promise<void>((resolve) => {
      attachments.subscribe(async (attachments) => {
        Papa.parse(attachments, {
          header: true,
          skipEmptyLines: true,
          complete: (async (
            jsonResults: Papa.ParseResult<RteAttachmentsCsvFile>
          ) => {
            const data = jsonResults.data;
            if (!data || data.length === 0) {
              resolve();
              return;
            }
            await this.storageService.db?.attachments.clear();
            const attachmentsTable: Attachment[] = mapData(data);
            console.log('adding attachments data', attachmentsTable.length);
            await this.storageService.db?.attachments.bulkAdd(attachmentsTable);
            resolve();
          }) as (jsonResults: Papa.ParseResult<RteAttachmentsCsvFile>) => void
        });
      });
    });
  }
}
