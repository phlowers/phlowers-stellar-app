//@ts-ignore
import * as SQLite from '../src/sqlite-api.js';
import { generateData } from './data/generate.js';
import { randomString, calculateObjectSize, rowsToInsert } from './helpers';
import * as duckdb from '@duckdb/duckdb-wasm';

const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

console.log("JSDELIVR_BUNDLES is", JSDELIVR_BUNDLES)

// Select a bundle based on browser checks
const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
console.log("bundle is", bundle)
const worker_url = URL.createObjectURL(
  new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' })
);


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

let sqlite3: any;
let db: any;
let c: any;
let vfs: any;

const searchString = randomString(500);

const database = 'duckDb';

// const firstLoop = rowsToInsert / 100;

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

  // console.log('sqlString is', sqlString);

  const startTime = performance.now();
  await c.query(sqlString);
  const endTime = performance.now();

  // Calculate total runtime
  const totalTime = endTime - startTime;
  console.log('totalTime for fill is', totalTime);
  postMessage({ type: 'fillTime', totalTime, database });

  // setTimeout(async () => {
  const count = await c.query('SELECT COUNT(*) FROM "sections"');
  console.log('count is', count);
  // }, 1000);
};

export const setUp = async function (): Promise<void> {
  console.log('im in setup');
  // Instantiate the asynchronus version of DuckDB-Wasm
  const worker = new Worker(worker_url);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(worker_url);
  await db.open({
    path: 'opfs://duckDb.db',
    accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
  });
  // Create a new connection
  c = await db.connect();

  // ... import data

  // Close the connection to release memory
  // await c.close();
  console.log("i start now")
  const startTime = performance.now();
  await c.query(setupSqlCommand);

  const endTime = performance.now();

  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
  // postMessage({ type: 'fillTime', totalTime, database });

  // // return sqlite3;
};

export const searchInDatabase = async function (): Promise<void> {
  const startTime = performance.now();
  const resultRows = [];
  const result = await c.query(`SELECT * FROM "sections" WHERE searchString LIKE '%${searchString.substring(10, 50)}%'`)
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
  console.log('result is', resultRows.length);
  console.log('number', result);
  postMessage({ type: 'searchTime', totalTime, database });
  // await c.close();
};

export const updateNinetyPercent = async function () {
  const startTime = performance.now();
  const resultRows = [];
  const result = await c.query(`UPDATE sections SET searchString = '${searchString}' WHERE RANDOM() < 0.9`);
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
  console.log('result is', resultRows.length);
  postMessage({ type: 'updateTime', totalTime, database });
  await c.close();
};

export const launch = async () => {
  await setUp();
  await execute();
  await searchInDatabase();
  await updateNinetyPercent();
};
