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
import { toNumber, uniq } from 'lodash';

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

  async searchAttachmentsBySupportName(value: string) {
    return this.storageService.db?.attachments
      .where('support_name')
      .startsWithIgnoreCase(value)
      .limit(100)
      .toArray();
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
        .filter((item) => item.support_adr)
        .map((item) => ({
          uuid: uuidv4(),
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          support_name: item.support_adr,
          attachment_set: toNumber(item.position),
          attachment_altitude: parseFloat(item.Z),
          cross_arm_length: parseFloat(item.L),
          attachment_set_x: parseFloat(item.X),
          attachment_set_y: parseFloat(item.Y),
          attachment_set_z: parseFloat(item.Z)
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
            await this.storageService.db?.catalogSupports.clear();
            const attachmentsTable: Attachment[] = mapData(data).slice(0, 1000);
            const supportNames = uniq(
              attachmentsTable.map(
                (attachment) => attachment.support_name || ''
              )
            ).map((name) => ({
              name
            }));
            console.log('adding attachments data', attachmentsTable.length);
            console.log('adding supports catalog data', supportNames.length);
            await this.storageService.db?.attachments.bulkAdd(attachmentsTable);
            await this.storageService.db?.catalogSupports.bulkAdd(supportNames);
            resolve();
          }) as (jsonResults: Papa.ParseResult<RteAttachmentsCsvFile>) => void
        });
      });
    });
  }
}
