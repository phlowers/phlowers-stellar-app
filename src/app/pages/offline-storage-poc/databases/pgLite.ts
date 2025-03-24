import { PGlite } from '@electric-sql/pglite';
import { worker } from '@electric-sql/pglite/worker';

import { randomString, calculateObjectSize, rowsToInsert } from './helpers';
import { generateData } from './data/generate';

const searchString = randomString(500);

let db!: PGlite;

const database = 'pgLite';

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

  // sqlString += `COMMIT;`;
  // console.log('sqlString is', sqlString);
  console.log('i start now');

  // console.log('sqlString is', sqlString);

  const startTime = performance.now();
  await db.exec(sqlString);
  const endTime = performance.now();

  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
  const count = await db.exec('SELECT * FROM "sections" LIMIT 1');
  console.log('count is', count?.[0]);
  // console.log('count is', count?.[0]?.rows?.[0]?.['count']);
  postMessage({ type: 'fillTime', totalTime, database });
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
  `);
  console.log('db is', db);
  return db;
};

export const searchInDatabase = async function () {
  const startTime = performance.now();
  const result = await db.exec(`SELECT * FROM "sections" WHERE searchString LIKE '%${searchString.substring(10, 50)}%'`);
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
  console.log('result is', result?.[0]?.rows);
  // await db.close();
  postMessage({ type: 'searchTime', totalTime, database });
};

export const updateNinetyPercent = async function () {
  const startTime = performance.now();
  const resultRows = [];
  const result = await db.exec(`UPDATE sections SET searchString = '${searchString}' WHERE RANDOM() < 0.9`);
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
  console.log('result is', resultRows.length);
  await db.close();
  postMessage({ type: 'updateTime', totalTime, database });
};

export const launch = async () => {
  await setUp();
  await execute();
  await searchInDatabase();
  await updateNinetyPercent();
};

