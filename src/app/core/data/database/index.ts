/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Dexie, { Table } from 'dexie';
import { userTable } from './tables/user';
import { studyTable } from './tables/study';
import { lineTable } from './tables/line';
import { Study } from './interfaces/study';
import { User } from './interfaces/user';
import { attachmentTable } from './tables/attachment';
import { sectionTable } from './tables/section';
import { Attachment } from './interfaces/attachment';
import { Section } from './interfaces/section';
import { Line } from './interfaces/line';
import { Cable } from './interfaces/cable';
import { cableTable } from './tables/cable';
import mockData from './mock_data.json';
import { createStudiesMockData } from './helpers/createMocks';
import { MaintenanceData } from './interfaces/maintenance';
import { maintenance } from './tables/maintenance';
import { Chain } from './interfaces/chain';
import { chainTable } from './tables/chain';

export class AppDB extends Dexie {
  users!: Table<User, number>;
  studies!: Table<Study, string>;
  attachments!: Table<Attachment, string>;
  lines!: Table<Line, string>;
  maintenance!: Table<MaintenanceData, string>;
  sections!: Table<Section, string>;
  cables!: Table<Cable, string>;
  chains!: Table<Chain, string>;

  constructor() {
    super('stellar-db');
    this.version(1).stores({
      ...chainTable,
      ...attachmentTable,
      ...lineTable,
      ...maintenance,
      ...sectionTable,
      ...studyTable,
      ...userTable,
      ...cableTable
    });
  }

  async loadMockDataFromJson(jsonContent: any) {
    const mockData = jsonContent;
    await this.attachments.bulkPut(mockData.attachments);
    await this.lines.bulkPut(mockData.lines);
    await this.sections.bulkPut(mockData.sections);
    await this.cables.bulkPut(mockData.cables);
  }

  async fillDatabaseWithSectionsMockData() {
    try {
      if ((await this.attachments.count()) === 0) {
        await this.loadMockDataFromJson(mockData);
      }
    } catch (error) {
      console.error('Error filling database with mock data', error);
    }
  }

  async fillDatabaseWithStudiesMockData() {
    try {
      await this.studies.bulkPut(createStudiesMockData());
    } catch (error) {
      console.error('Error filling database with mock data', error);
    }
  }
}
