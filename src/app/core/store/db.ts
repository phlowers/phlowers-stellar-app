/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Dexie, { Table } from 'dexie';
import { UserModel } from '../api/models/user.model';
import { StudyModelLocal } from './models/study.model';

export class AppDB extends Dexie {
  users!: Table<UserModel, number>;
  studies!: Table<StudyModelLocal, string>;

  constructor() {
    super('stellar-db');
    this.version(1).stores({
      users: 'email',
      studies: '&uuid, title, description'
    });
  }
}
