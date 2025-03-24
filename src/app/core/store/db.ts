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
