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
import { regionalMaintenanceCenterTable } from './tables/regionalMaintenanceCenter';
import { maintenanceCenterTable } from './tables/maintenanceCenter';
import { tensionTable } from './tables/tension';
import { transitLinkTable } from './tables/transitLink';
import { Study } from './interfaces/study';
import { User } from './interfaces/user';
import { attachmentTable } from './tables/attachment';
import { sectionTable } from './tables/section';
import { spanTable } from './tables/span';
import { Attachment } from './interfaces/attachment';
import { Branch } from './interfaces/branch';
import { MaintenanceCenter } from './interfaces/maintenanceCenter';
import { Section } from './interfaces/section';
import { RegionalMaintenanceCenter } from './interfaces/regionalMaintenanceCenter';
import { Line } from './interfaces/line';
import { Span } from './interfaces/span';
import { Tension } from './interfaces/tension';
import { TransitLink } from './interfaces/transitLink';
import { Cable } from './interfaces/cable';
import { cableTable } from './tables/cable';
import mockData from './mock_data.json';

export class AppDB extends Dexie {
  users!: Table<User, number>;
  studies!: Table<Study, string>;
  attachments!: Table<Attachment, string>;
  branches!: Table<Branch, string>;
  lines!: Table<Line, string>;
  maintenance_centers!: Table<MaintenanceCenter, string>;
  regional_maintenance_centers!: Table<RegionalMaintenanceCenter, string>;
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
      ...maintenanceCenterTable,
      ...regionalMaintenanceCenterTable,
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
    await this.maintenance_centers.bulkPut(mockData.maintenance_centers);
    await this.regional_maintenance_centers.bulkPut(
      mockData.regional_maintenance_centers
    );
    await this.sections.bulkPut(mockData.sections);
    await this.spans.bulkPut(mockData.spans);
    await this.tensions.bulkPut(mockData.tensions);
    await this.transit_links.bulkPut(mockData.transit_links);
    await this.cables.bulkPut(mockData.cables);
  }

  async fillDatabaseWithMockData() {
    try {
      if ((await this.attachments.count()) === 0) {
        await this.loadMockDataFromJson(mockData);
      }
    } catch (error) {
      console.error('Error filling database with mock data', error);
    }
  }
}
