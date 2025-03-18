// import { OpfsSAHPoolDatabase } from '@sqlite.org/sqlite-wasm';
// import { Database, OpfsSAHPoolDatabase, default as sqlite3InitModule, Sqlite3Static } from '@sqlite.org/sqlite-wasm';
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

let db!: any;

const searchString = randomString(500);

export const execute = async function () {
  let sqlString = `BEGIN;`;

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

  const startTime = performance.now();
  db.exec(sqlString);
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  // db.exec({ sql: 'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();', callback: (row: any) => console.log('database size', row) });
  await db.exec({ sql: 'SELECT COUNT(*) FROM "myapp_books"', callback: (row: any) => console.log('database size', row) });

  console.log('totalTime is', totalTime);
};
//@ts-ignore

export const setUp = async function (): Promise<void> {
  // import sqlite3InitModule from "https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.42.0-build2/sqlite-wasm/jswasm/sqlite3-bundler-friendly.mjs";

  //@ts-ignore
  const sqlite3InitModule = await import(/* webpackIgnore: true */ 'https://localhost:4200/sqlite-wasm/jswasm/sqlite3-bundler-friendly.mjs');
  console.log('sqlite3InitModule is', sqlite3InitModule.default);
  const sqlite3 = await sqlite3InitModule.default({
    locateFile(file: any) {
      console.log('file is', file);
      return `https://localhost:4200/${file}`;
      // return 'https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.49.1-build2/sqlite-wasm/jswasm/sqlite3.wasm';
    }
  });
  // import sqlite3InitModule from ;
  const poolUtil = await sqlite3.installOpfsSAHPoolVfs({
    clearOnInit: true
    // directory: '/stellar',
    // name: 'data'
  });

  // PoolUtil.removeVfs(); // remove the default vfs
  // PoolUtil.wipeFiles(); // remove the default vfs

  db = new poolUtil.OpfsSAHPoolDb('/filename');
  // db = new sqlite3.oo1.OpfsDb('/my.db', 'c');

  // db = new sqlite3.oo1.OpfsDb('/stellar', 'c');

  // try {
  // Start time
  const startTime = performance.now();

  // const sampleQueries = getSampleQueries();

  db.exec('PRAGMA journal_mode = OFF;'); // 1.7 => 1.8
  db.exec('PRAGMA synchronous = 0;');
  db.exec('PRAGMA cache_size = 1000000;');
  db.exec('PRAGMA locking_mode = EXCLUSIVE;'); // 1.7 => 1.8
  db.exec('PRAGMA temp_store = MEMORY;'); //same

  const res = db.exec(setupSqlCommand);
  // db.exec('PRAGMA journal_mode = OFF;');

  // End time
  const endTime = performance.now();

  // Calculate total runtime
  const totalTime = endTime - startTime;
  console.log('db is', db);
  console.log('totalTime is', totalTime);
  // } finally {
  //   db.close();
  // }
};

export const searchInDatabase = async function () {
  const startTime = performance.now();
  const resultRows = [];
  const result = db.exec({
    sql: `SELECT * FROM "myapp_books" WHERE "isbn" LIKE '%${searchString.substring(10, 50)}%'`,
    callback: (row: any) => {
      // console.log('row', row);
      resultRows.push(row);
    }
  });
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
  console.log('result is', resultRows.length);
  db.close();
  console.log('im closed');
};
