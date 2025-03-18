import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms'; // Import FormsModule

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ButtonModule, FormsModule],
  template: `<div>
    <p-button (click)="setUp()">set up database</p-button>
    <!-- <p-button (click)="createDatabase()">create database</p-button>
    <p-button (click)="setupDatabase()">set up database</p-button> -->
    <p-button (click)="fillDatabase()">fill database</p-button>
    <p-button (click)="searchInDatabase()">Search in database</p-button>
    <!-- <p-button (click)="sendCommit()">Send commit</p-button> -->
    <!-- (change)="onSelected(options.value)" -->
    <select [(ngModel)]="selected" (change)="onSelected($event)">
      <option *ngFor="let opt of options" [value]="opt.value">
        {{ opt.value }}
      </option>
    </select>
    <!-- <button (click)="cleanDatabase()">clean database</button> -->
  </div>`
})
export class Admin {
  options = [{ value: 'indexDb' }, { value: 'pgLite' }, { value: 'wasmSqlite' }, { value: 'waSqlite' }];
  selected = 'indexDb';
  onSelected(value: any): void {
    console.log('value', value.target.value);
    this.selected = value.target.value;
    localStorage.setItem('selected', value.target.value);
  }
  // sqlite3!: Sqlite3Static;
  // db!: OpfsSAHPoolDatabase;
  worker!: Worker;
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

  async launchWorker() {
    this.worker = new Worker(new URL('./workerDb', import.meta.url), { type: 'module' });
    console.log('worker is', this.worker);
    //   workerURL.search = location.search;

    //     const workerURL = new URL('./demo-worker.js', import.meta.url);
    // workerURL.search = location.search;
    // const worker = new Worker(workerURL, { type: 'module' });
  }

  fillDatabase() {
    this.worker.postMessage({ task: 'execute', type: this.selected });
  }

  searchInDatabase() {
    this.worker.postMessage({ task: 'searchInDatabase', type: this.selected });
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
}
