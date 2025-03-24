import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { TableModule } from 'primeng/table';
import { randomString, rowsToInsert } from './databases/helpers';
import { PGliteWorker } from '@electric-sql/pglite/worker';

const firstLoop = rowsToInsert / 100;
const searchString = 'searchString';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ButtonModule, FormsModule, TableModule],
  template: `<div>
    <!-- <p-button (click)="setUp()">set up database</p-button> -->
    <!-- <p-button (click)="launchSecondWorker()">launch second worker</p-button> -->
    <!-- <p-button (click)="createDatabase()">create database</p-button> -->
    <!--<p-button (click)="setupDatabase()">set up database</p-button> -->
    <p-button (click)="fillDatabase()">fill database</p-button>
    <p-button (click)="searchInDatabase()">Search in database</p-button>
    <!-- <p-button (click)="sendCommit()">Send commit</p-button> -->
    <!-- (change)="onSelected(options.value)" -->
    <div style="display: flex; align-items: center; margin-bottom: 1rem;">
      <select [(ngModel)]="selected" (change)="onSelected($event)">
        <option *ngFor="let opt of options" [value]="opt.value">
          {{ opt.value }}
        </option>
      </select>
      <div style="margin-left: 1rem;">
        <p-button (click)="launch()">Launch</p-button>
      </div>
    </div>
    <!-- <button (click)="cleanDatabase()">clean database</button> -->
    <p-table [value]="database" [tableStyle]="{ 'min-width': '50rem' }">
      <ng-template #header>
        <tr>
          <th>task</th>
          <th>indexedDB</th>
          <th>pgLite</th>
          <th>wasmSqlite</th>
          <th>waSqlite</th>
          <th>duckDb</th>
        </tr>
      </ng-template>
      <ng-template #body let-task>
        <tr>
          <td>{{ task.name }}</td>
          <td>{{ task.indexedDB }}</td>
          <td>{{ task.pgLite }}</td>
          <td>{{ task.wasmSqlite }}</td>
          <td>{{ task.waSqlite }}</td>
          <td>{{ task.duckDb }}</td>
        </tr>
      </ng-template>
    </p-table>
  </div>`
})
export class OfflineStoragePoc {
  options = [{ value: 'indexDb' }, { value: 'pgLite' }, { value: 'wasmSqlite' }, { value: 'waSqlite' }, { value: 'duckDb' }];
  selected = 'indexDb';
  pg!: PGliteWorker;
  onSelected(value: any): void {
    console.log('value', value.target.value);
    this.selected = value.target.value;
    localStorage.setItem('selected', value.target.value);
  }

  database: any = [
    {
      name: `insert ${rowsToInsert} in db`,
      indexedDB: 0,
      pgLite: 0,
      wasmSqlite: 0,
      waSqlite: 0,
      duckDb: 0,
    },
    {
      name: 'search string in db',
      indexedDB: 0,
      pgLite: 0,
      wasmSqlite: 0,
      waSqlite: 0,
      duckDb: 0,
    },
    {
      name: 'update 90% of the rows',
      indexedDB: 0,
      pgLite: 0,
      wasmSqlite: 0,
      waSqlite: 0,
      duckDb: 0,
    }
  ];
  // sqlite3!: Sqlite3Static;
  // db!: OpfsSAHPoolDatabase;
  worker!: Worker;
  worker2!: Worker;
  async createDatabase() {
    // const module = await SQLiteESMFactory({
    //   locateFile(file: any) {
    //     return `https://rhashimoto.github.io/wa-sqlite/dist/${file}`;
    //   }
    // });
    // this.sqlite3 = SQLite2.Factory(module);
    // this.db = await this.sqlite3.open_v2('test5');
    // console.log('db is', this.db);
    // this.sqlite3 = await sqlite3InitModule({
    //   locateFile(file: any) {
    //     console.log('file is', file);
    //     return `http://localhost:4200/${file}`;
    //   }
    // });
    // const PoolUtil = await this.sqlite3.installOpfsSAHPoolVfs({});
    // this.db = new PoolUtil.OpfsSAHPoolDb('/filename');
    // this.db = new this.sqlite3.oo1.DB('/mydb.sqlite3', 'ct');
  }

  async launchPgWorker() {
    this.pg = new PGliteWorker(new Worker(new URL('./pgWorker?worker', import.meta.url)), {
      dataDir: 'idb://my-db',
      meta: {
        // additional metadata passed to `init`
      }
    });
    await this.pg.exec(`
      BEGIN;
      --
      -- Create model Books
      --
      CREATE TABLE "myapp_books" ("id" SERIAL PRIMARY KEY, "title" varchar(100) NOT NULL, "author" varchar(100) NOT NULL, "published_date" date NOT NULL, "isbn" varchar(50000) NOT NULL);
      COMMIT;
    `);
    let sqlString = `BEGIN;`;

    //("title", "author", "published_date", "isbn")
    for (let i = 0; i < firstLoop; i++) {
      sqlString += `INSERT INTO "myapp_books" ("title", "author", "published_date", "isbn") VALUES ('The Hobbit', 'J.R.R. Tolkien', '1937-09-21', '${randomString(500)}') `;
      for (let i = 0; i < 100; i++) {
        sqlString += `, ('The Hobbit', 'J.R.R. Tolkien', '1937-09-21', '${randomString(500)}')`;
      }
      sqlString += `;`;
      sqlString += `INSERT INTO "myapp_books" ("title", "author", "published_date", "isbn") VALUES ('The Hobbit', 'J.R.R. Tolkien', '1937-09-21', '${searchString}') ;`;
    }
    sqlString += `COMMIT;`;
    console.log('i start now');

    // console.log('sqlString is', sqlString);

    const startTime = performance.now();
    await this.pg.exec(sqlString);
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    console.log('totalTime is', totalTime);
    const count = await this.pg.exec('SELECT COUNT(*) FROM "myapp_books"');
    console.log('count is', count?.[0]?.rows?.[0]?.['count']);
    // postMessage({ type: 'fillTime', totalTime, database });
  }

  async launchPgWorker2() {
    const startTime = performance.now();
    const result = await this.pg.exec(`SELECT * FROM "myapp_books" WHERE "isbn" LIKE '%${searchString.substring(10, 50)}%'`);
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    console.log('totalTime is', totalTime);
    console.log('result is', result?.[0]?.rows);
  }

  async launchWorker() {
    console.log('im before worker');
    this.worker = new Worker(new URL('./workerDb', import.meta.url));
    console.log('worker is', this.worker);
    //   workerURL.search = location.search;

    //     const workerURL = new URL('./demo-worker.js', import.meta.url);
    // workerURL.search = location.search;
    // const worker = new Worker(workerURL, { type: 'module' });
    this.worker.onmessage = (event) => {
      console.log('event is', event);
      if (event.data.type === 'fillTime') {
        this.database[0][event.data.database as any] = event.data.totalTime.toFixed();
      }
      if (event.data.type === 'searchTime') {
        this.database[1][event.data.database] = event.data.totalTime.toFixed();
      }
      if (event.data.type === 'updateTime') {
        this.database[2][event.data.database] = event.data.totalTime.toFixed();
      }
    };
  }

  fillDatabase() {
    this.worker.postMessage({ task: 'execute', type: this.selected });
  }

  searchInDatabase() {
    this.worker.postMessage({ task: 'searchInDatabase', type: this.selected });
  }

  async launch() {
    const dbs = await window.indexedDB.databases();
    dbs.forEach((db) => {
      if (db.name) {
        if (db.name !== 'stellar-db') {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    });
    const root = await navigator.storage?.getDirectory();
    if (root) {
      // @ts-ignore
      for await (const name of root.keys()) {
        console.log('name is', name);
        await root.removeEntry(name, { recursive: true });
      }
    }
    this.worker.postMessage({ task: 'launch', type: this.selected });
  }

  async setUp() {
    console.log('this.selected', this.selected);
    const dbs = await window.indexedDB.databases();
    dbs.forEach((db) => {
      if (db.name) {
        if (db.name !== 'stellar-db') {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    });
    const root = await navigator.storage?.getDirectory();
    if (root) {
      // @ts-ignore
      for await (const name of root.keys()) {
        console.log('name is', name);
        await root.removeEntry(name, { recursive: true });
      }
    }
    console.log('im before post message');
    this.worker.postMessage({ task: 'setUp', type: this.selected });
  }

  ngOnInit() {
    const selected = localStorage.getItem('selected');
    this.selected = selected || 'indexDb';
    // console.log('selected1', selected);
    // localStorage.setItem('selected', value.target.value);

    this.launchWorker();
  }

  launchSecondWorker() {
    this.worker2 = new Worker(new URL('./workerDb', import.meta.url));
    this.worker2.postMessage({ task: 'launch', type: this.selected });
  }
}
