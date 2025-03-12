import Dexie, { Table } from 'dexie';

export interface User {
  email: string;
}
export interface Study {
  uuid: string;
  name: string;
  description: string;
}

export class AppDB extends Dexie {
  users!: Table<User, number>;
  studies!: Table<Study, string>;

  constructor() {
    super('stellar-db');
    this.version(1).stores({
      users: 'email',
      studies: '&uuid, title, description'
    });
  }
}
