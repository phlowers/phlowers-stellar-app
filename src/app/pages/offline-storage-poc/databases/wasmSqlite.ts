// import { OpfsSAHPoolDatabase } from '@sqlite.org/sqlite-wasm';
// import { Database, OpfsSAHPoolDatabase, default as sqlite3InitModule, Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import { generateData } from './data/generate';
import { randomString, calculateObjectSize, rowsToInsert } from './helpers';

const setupSqlCommand = `
    -- Attachment table
    CREATE TABLE attachments (
        attachment_id VARCHAR(50) PRIMARY KEY,
        qwdqwdqwdqwdq VARCHAR(50),
        qwdqwdqwdasdfe VARCHAR(50),
        qwddsadasdxzc INTEGER,
        efwefwefwdssfdsfdf INTEGER,
        asdqwdedwefwfwefdfd INTEGER,
        dsfwefdsfvwefwefweff INTEGER,
        wfedsf VARCHAR(50),
        wefwfsdfsd VARCHAR(50),
        dfweffw VARCHAR(10),
        wefwefwefsdf INTEGER,
        werwer INTEGER
    );

    -- Section table
    CREATE TABLE sections (
        section_id VARCHAR(50) PRIMARY KEY,
        gfgnfghgcdfbdfbf DATE,
        sdfsdfdsfsdfsd VARCHAR(50),
        name VARCHAR(200),
        type VARCHAR(50),
        dsfsdfw VARCHAR(200),
        dsfsdfwefeff VARCHAR(200),
        sdfsdfsdffgfhfgdf INTEGER,
        vdvreferfwedewf INTEGER,
        dcsdccdcsdcdscacad INTEGER,
        searchString VARCHAR(500)
    );

    -- Support table
    CREATE TABLE supports (
        support_id VARCHAR(50) PRIMARY KEY,
        attachment_id VARCHAR(50),
        section_id VARCHAR(50),
        fsfdfsdfreggr VARCHAR(200),
        efwefdsffe INTEGER,
        wefwefdsfdsfwefwefef INTEGER,
        efewfwefwefwefdsfsdfs INTEGER,
        sdfwefwefwefwefwefdsf INTEGER,
        name VARCHAR(200),
        suspension VARCHAR(10),
        dsfsdfwefwefwefdsffddsf INTEGER,
        dsfwefsdfwefsdf INTEGER,
        wefwewefwefsdf INTEGER,
        FOREIGN KEY (attachment_id) REFERENCES attachments(attachment_id),
        FOREIGN KEY (section_id) REFERENCES sections(section_id)
    );

    -- Span table
    CREATE TABLE spans (
        id VARCHAR(50) PRIMARY KEY,
        gfgnfghgcdfbdfbf DATE,
        dfweffsdf INTEGER,
        number INTEGER,
        dsfwef VARCHAR(50),
        sdfzxczcxcdxcv VARCHAR(50),
        dfwefwefsd INTEGER,
        dsfdsffwefwefdsfdsfef VARCHAR(200),
        length INTEGER,
        fwefwefd INTEGER
    );

    -- Junction table for section-span relationship (many-to-many)
    CREATE TABLE section_spans (
        section_id VARCHAR(50),
        span_id VARCHAR(50),
        PRIMARY KEY (section_id, span_id),
        FOREIGN KEY (section_id) REFERENCES sections(section_id),
        FOREIGN KEY (span_id) REFERENCES spans(id)
    );

    -- Junction table for section-support relationship (many-to-many)
    -- Note: This might be redundant since supports already have section_id,
    -- but included for completeness based on the array structure in the data
    CREATE TABLE section_supports (
        section_id VARCHAR(50),
        support_id VARCHAR(50),
        PRIMARY KEY (section_id, support_id),
        FOREIGN KEY (section_id) REFERENCES sections(section_id),
        FOREIGN KEY (support_id) REFERENCES supports(support_id)
    );
  `;

let db!: any;

const searchString = randomString(500);

const database = 'wasmSqlite';

const firstLoop = rowsToInsert / 100;

export const execute = async function () {
  const data = generateData(rowsToInsert, searchString);
  // let sqlString = `BEGIN;`;
  let sqlString = ``;

  const { sections, supports, spans } = data;
  //sections.length
  for (let i = 0; i < sections.length; i++) {
    // console.log(JSON.stringify({ sections: sections[i], supports: supports[i], spans: spans[i] }));
    sqlString += `
        INSERT INTO attachments (
            attachment_id,
            qwdqwdqwdqwdq,
            qwdqwdqwdasdfe,
            qwddsadasdxzc,
            efwefwefwdssfdsfdf,
            asdqwdedwefwfwefdfd,
            dsfwefdsfvwefwefweff,
            wfedsf,
            wefwfsdfsd,
            dfweffw,
            wefwefwefsdf,
            werwer
        ) VALUES 
         ${supports[i].map((support, j) => `('${support.dqdwqdqw.attachment_id}', '${support.dqdwqdqw.qwdqwdqwdqwdq}', '${support.dqdwqdqw.qwdqwdqwdasdfe}', ${support.dqdwqdqw.qwddsadasdxzc}, ${support.dqdwqdqw.efwefwefwdssfdsfdf}, ${support.dqdwqdqw.asdqwdedwefwfwefdfd}, ${support.dqdwqdqw.dsfwefdsfvwefwefweff}, '${support.dqdwqdqw.wfedsf}', '${support.dqdwqdqw.wefwfsdfsd}', '${support.dqdwqdqw.dfweffw}', ${support.dqdwqdqw.wefwefwefsdf}, ${support.dqdwqdqw.werwer})${j === supports[i].length - 1 ? '' : ','}`).join('')}
        ;

        -- Insert the section
        INSERT INTO sections (
            section_id,
            gfgnfghgcdfbdfbf,
            sdfsdfdsfsdfsd,
            name,
            type,
            dsfsdfw,
            dsfsdfwefeff,
            sdfsdfsdffgfhfgdf,
            vdvreferfwedewf,
            dcsdccdcsdcdscacad,
            searchString
        ) VALUES (
            '${sections[i].section_id}',
            '${sections[i].gfgnfghgcdfbdfbf}',
            '${sections[i].sdfsdfdsfsdfsd}',
            '${sections[i].name}',
            '${sections[i].type}',
            '${sections[i].dsfsdfw}',
            '${sections[i].dsfsdfwefeff}',
            '${sections[i].sdfsdfsdffgfhfgdf}',
            '${sections[i].vdvreferfwedewf}',
            '${sections[i].dcsdccdcsdcdscacad}',
            '${sections[i].searchString}'
        );

        -- Insert spans
        INSERT INTO spans (
            id,
            gfgnfghgcdfbdfbf,
            dfweffsdf,
            number,
            dsfwef,
            sdfzxczcxcdxcv,
            dfwefwefsd,
            dsfdsffwefwefdsfdsfef,
            length,
            fwefwefd
        ) VALUES 
        ${spans[i].map((span, j) => `('${span.id}', '${span.gfgnfghgcdfbdfbf}', ${span.dfweffsdf}, ${span.number}, '${span.dsfwef}', '${span.sdfzxczcxcdxcv}', ${span.dfwefwefsd}, '${span.dsfdsffwefwefdsfdsfef}', ${span.length}, ${span.fwefwefd})${j === spans[i].length - 1 ? '' : ','}`).join('')}
        ;

        -- Insert supports with their attachments
        INSERT INTO supports (
            support_id,
            attachment_id,
            section_id,
            fsfdfsdfreggr,
            efwefdsffe,
            wefwefdsfdsfwefwefef,
            efewfwefwefwefdsfsdfs,
            sdfwefwefwefwefwefdsf,
            name,
            suspension,
            dsfsdfwefwefwefdsffddsf,
            dsfwefsdfwefsdf,
            wefwewefwefsdf
        ) VALUES 
        ${supports[i].map((support, j) => `('${support.support_id}', '${support.attachment_id}', '${support.section_id}', '${support.fsfdfsdfreggr}', ${support.efwefdsffe}, ${support.wefwefdsfdsfwefwefef}, ${support.efewfwefwefwefdsfsdfs}, ${support.sdfwefwefwefwefwefdsf}, '${support.name}', '${support.suspension}', ${support.dsfsdfwefwefwefdsffddsf}, ${support.dsfwefsdfwefsdf}, ${support.wefwewefwefsdf})${j === supports[i].length - 1 ? '' : ','}`).join('')}
        ;

        -- Insert entries in section_spans junction table
        INSERT INTO section_spans (section_id, span_id) VALUES 
        ${spans[i].map((span, j) => `('${sections[i].section_id}', '${span.id}')${j === spans[i].length - 1 ? '' : ','}`).join('')}
        ;

        -- Insert entries in section_supports junction table
        INSERT INTO section_supports (section_id, support_id) VALUES 
        ${supports[i].map((support, j) => `('${sections[i].section_id}', '${support.support_id}')${j === supports[i].length - 1 ? '' : ','}`).join('')}
        ;
      `
  }
  console.log('i start now');

  const startTime = performance.now();
  db.exec(sqlString);
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  postMessage({ type: 'fillTime', totalTime, database });
  // db.exec({ sql: 'SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();', callback: (row: any) => console.log('database size', row) });
  await db.exec({ sql: 'SELECT COUNT(*) FROM "sections"', callback: (row: any) => console.log('database size', row) });

  console.log('totalTime is', totalTime);
};
//@ts-ignore

let poolUtil: any;

export const setUp = async function (): Promise<void> {
  // import sqlite3InitModule from "https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.42.0-build2/sqlite-wasm/jswasm/sqlite3-bundler-friendly.mjs";

  //@ts-ignore
  const sqlite3InitModule = await import(/* webpackIgnore: true */ 'http://localhost:4200/sqlite-wasm/jswasm/sqlite3-bundler-friendly.mjs');
  console.log('sqlite3InitModule is', sqlite3InitModule.default);
  const sqlite3 = await sqlite3InitModule.default({
    locateFile(file: any) {
      console.log('file is', file);
      return `http://localhost:4200/${file}`;
      // return 'https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.49.1-build2/sqlite-wasm/jswasm/sqlite3.wasm';
    }
  });
  // import sqlite3InitModule from ;
  poolUtil = await sqlite3.installOpfsSAHPoolVfs({
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

  // db.exec('PRAGMA journal_mode = OFF;'); // 1.7 => 1.8
  // db.exec('PRAGMA synchronous = 0;');
  // db.exec('PRAGMA cache_size = 1000000;');
  // db.exec('PRAGMA locking_mode = EXCLUSIVE;'); // 1.7 => 1.8
  // db.exec('PRAGMA temp_store = MEMORY;'); //same

  const res = db.exec(setupSqlCommand);
  // db.exec('PRAGMA journal_mode = OFF;');
  console.log('reset is', db.reset);
  console.log('poolUtil is', poolUtil.removeVfs);
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
    sql: `SELECT * FROM "sections" WHERE searchString LIKE '%${searchString.substring(10, 50)}%'`,
    callback: (row: any) => {
      // console.log('row', row);
      resultRows.push(row);
    }
  });
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  postMessage({ type: 'searchTime', totalTime, database });

  console.log('totalTime is', totalTime);
  console.log('result is', resultRows.length);
  // db.close();
  // poolUtil.removeVfs();
  // await vfs.close();
};

export const updateNinetyPercent = async function () {
  const startTime = performance.now();
  const resultRows = [];
  console.log("i will update now")
  const result = db.exec({
    sql: `UPDATE sections SET searchString = '${searchString}' WHERE RANDOM() < 0.9`,
    // callback: (row: any) => {
    //   resultRows.push(row);
    // }
  });
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  postMessage({ type: 'updateTime', totalTime, database });

  console.log('totalTime is', totalTime);
  console.log('result is', resultRows.length);
  db.close();
  poolUtil.removeVfs();
};

export const launch = async () => {
  await setUp();
  await execute();
  await searchInDatabase();
  await updateNinetyPercent();
};
