/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Dexie, { Table } from 'dexie';
import { userTable } from './tables/user';
import { studyTable } from './tables/study';
import { branchTable } from './tables/branch';
import { lineTable } from './tables/line';
import { tensionTable } from './tables/tension';
import { transitLinkTable } from './tables/transitLink';
import { Study } from './interfaces/study';
import { User } from './interfaces/user';
import { attachmentTable } from './tables/attachment';
import { sectionTable } from './tables/section';
import { spanTable } from './tables/span';
import { Attachment } from './interfaces/attachment';
import { Branch } from './interfaces/branch';
import { Section } from './interfaces/section';
import { Line } from './interfaces/line';
import { Span } from './interfaces/span';
import { Tension } from './interfaces/tension';
import { TransitLink } from './interfaces/transitLink';
import { Cable } from './interfaces/cable';
import { cableTable } from './tables/cable';
import mockData from './mock_data.json';
import { createStudiesMockData } from './helpers/createMocks';
import { MaintenanceData } from './interfaces/maintenance';
import { maintenance } from './tables/maintenance';

export class AppDB extends Dexie {
  users!: Table<User, number>;
  studies!: Table<Study, string>;
  attachments!: Table<Attachment, string>;
  branches!: Table<Branch, string>;
  lines!: Table<Line, string>;
  maintenance!: Table<MaintenanceData, string>;
  sections!: Table<Section, string>;
  spans!: Table<Span, string>;
  tensions!: Table<Tension, string>;
  transit_links!: Table<TransitLink, string>;
  cables!: Table<Cable, string>;

  constructor() {
    super('stellar-db');
    this.version(1).stores({
      ...attachmentTable,
      ...branchTable,
      ...lineTable,
      ...maintenance,
      ...sectionTable,
      ...spanTable,
      ...studyTable,
      ...tensionTable,
      ...transitLinkTable,
      ...userTable,
      ...cableTable
    });
    //fill the database with mock data
    // this.fillDatabaseWithMockData();
  }

  // async loadMockDataFromFile(file: File) {
  //   const reader = new FileReader();
  //   reader.onload = (e) => {
  //     const jsonContent = e.target?.result as string;
  //     const mockData = JSON.parse(jsonContent);
  //     this.loadMockDataFromJson(mockData);
  //   };
  //   reader.readAsText(file);
  // }

  async loadMockDataFromJson(jsonContent: any) {
    const mockData = jsonContent;
    await this.attachments.bulkPut(mockData.attachments);
    await this.branches.bulkPut(mockData.branches);
    await this.lines.bulkPut(mockData.lines);
    await this.sections.bulkPut(mockData.sections);
    await this.spans.bulkPut(mockData.spans);
    await this.tensions.bulkPut(mockData.tensions);
    await this.transit_links.bulkPut(mockData.transit_links);
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
