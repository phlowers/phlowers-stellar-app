//@ts-ignore
import * as SQLite from '../src/sqlite-api.js';
import { randomString, calculateObjectSize } from './helpers';

const setupSqlCommand = `BEGIN;
--
-- Create model Books
--
CREATE TABLE "myapp_books" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "title" varchar(100) NOT NULL, "author" varchar(100) NOT NULL, "published_date" date NOT NULL, "isbn" varchar(50000) NOT NULL);
--
-- Create model BookCaracters
--
CREATE TABLE "myapp_bookcaracters" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "name" varchar(100) NOT NULL, "description" text NOT NULL, "age" integer NOT NULL, "birth_place" varchar(100) NOT NULL, "birth_date" date NOT NULL, "location" varchar(100) NOT NULL, "occupation" varchar(100) NOT NULL, "book_id" bigint NOT NULL REFERENCES "myapp_books" ("id") DEFERRABLE INITIALLY DEFERRED);
--
-- Create model BookAuthors
--
CREATE TABLE "myapp_bookauthors" ("id" integer NOT NULL PRIMARY KEY AUTOINCREMENT, "name" varchar(100) NOT NULL, "birth_date" date NOT NULL, "birth_place" varchar(100) NOT NULL, "book_id" bigint NOT NULL REFERENCES "myapp_books" ("id") DEFERRABLE INITIALLY DEFERRED);
CREATE INDEX "myapp_bookcaracters_book_id_d33511ae" ON "myapp_bookcaracters" ("book_id");
CREATE INDEX "myapp_bookauthors_book_id_b3ae798a" ON "myapp_bookauthors" ("book_id");
COMMIT;`;

let sqlite3: any;
let db: any;
let vfs: any;

const searchString = randomString(500);

export const execute = async function () {
  let sqlString = `BEGIN;`;

  //("title", "author", "published_date", "isbn")
  for (let i = 0; i < 20; i++) {
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
  sqlite3.exec(db, sqlString);
  const endTime = performance.now();

  // Calculate total runtime
  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);

  // const count = await db.exec('SELECT COUNT(*) FROM "myapp_books"');
};

export const setUp = async function (): Promise<void> {
  console.log('im in setup');
  const startTime = performance.now();
  //@ts-ignore
  // const { default: moduleFactory } = await import(/* webpackIgnore: true */ 'https://localhost:4200/dist/wa-sqlite.mjs');
  const { default: moduleFactory } = await import(/* webpackIgnore: true */ 'https://localhost:4200/dist/wa-sqlite.mjs');
  const module = await moduleFactory({
    locateFile(file: any) {
      console.log('file is', file);
      return `https://localhost:4200/${file}`;
    }
  });

  console.log('module is', module);
  sqlite3 = SQLite.Factory(module);
  console.log('sqlite3 is', sqlite3);
  // import { OPFSAdaptiveVFS } from './src/examples/OPFSAdaptiveVFS';
  //@ts-ignore
  const namespace = await import(/* webpackIgnore: true */ 'https://localhost:4200/src/examples/AccessHandlePoolVFS.js');

  vfs = await namespace['AccessHandlePoolVFS'].create('demo', module);
  console.log('vfs is', vfs);
  sqlite3.vfs_register(vfs, true);
  db = await sqlite3.open_v2('hello');
  await sqlite3.exec(db, 'PRAGMA locking_mode = EXCLUSIVE;');

  const res = await sqlite3.exec(db, setupSqlCommand);

  const endTime = performance.now();

  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
  // return sqlite3;
};

export const searchInDatabase = async function (): Promise<void> {
  const startTime = performance.now();
  const resultRows = [];
  const result = await sqlite3
    .exec(db, `SELECT * FROM "myapp_books" WHERE "isbn" LIKE '%${searchString.substring(10, 50)}%'`, (row: any) => {
      resultRows.push(row);
    })
    .catch((error: any) => {
      console.log('error is', error);
    });
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
  console.log('result is', resultRows.length);
  console.log('number', result);
  // await sqlite3.clear_bindings(db);
  await sqlite3.close(db);
  // console.log('jClose is', vfs.jClose);
  await vfs.close();
  // console.log('after close');
};
