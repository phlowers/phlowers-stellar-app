import { PGlite } from '@electric-sql/pglite';
import { randomString, calculateObjectSize } from './helpers';

const searchString = randomString(500);

let db!: PGlite;

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
  await db.exec(sqlString);
  const endTime = performance.now();

  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
  const count = await db.exec('SELECT COUNT(*) FROM "myapp_books"');
  console.log('count is', count?.[0]?.rows?.[0]?.['count']);
};

const cdn = 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.2.17';

export const setUp = async function (): Promise<PGlite> {
  const [wasmModule, fsBundle] = await Promise.all([WebAssembly.compileStreaming(fetch(`${cdn}/dist/postgres.wasm`)), fetch(`${cdn}/dist/postgres.data`).then((response) => response.blob())]);
  db = new PGlite('opfs-ahp://my-pgdata', {
    wasmModule,
    fsBundle,
    // initialMemory: 500000000,
    database: 'my-pgdata'
    // debug: 1
  });
  await db.exec(`
    BEGIN;
    --
    -- Create model Books
    --
    CREATE TABLE "myapp_books" ("id" SERIAL PRIMARY KEY, "title" varchar(100) NOT NULL, "author" varchar(100) NOT NULL, "published_date" date NOT NULL, "isbn" varchar(50000) NOT NULL);
    COMMIT;
  `);
  console.log('db is', db);
  return db;
};

export const searchInDatabase = async function () {
  const startTime = performance.now();
  const result = await db.exec(`SELECT * FROM "myapp_books" WHERE "isbn" LIKE '%${searchString.substring(10, 50)}%'`);
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
  console.log('result is', result?.[0]?.rows);
};
