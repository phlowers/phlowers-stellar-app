import Dexie, { Table } from 'dexie';
import { randomString, calculateObjectSize, rowsToInsert } from './helpers';
import { generateData, Section, Span, Support } from './data/generate';

export interface Book {
  // id: string;
  title: string;
  author: string;
  published_date: string;
  isbn: string;
}

const database = 'indexedDB';

export class AppDB extends Dexie {
  sections!: Table<Section, string>;
  supports!: Table<Support, string>;
  spans!: Table<Span, string>;

  constructor() {
    super('test-db');
    this.version(1).stores({
      sections: '++section_id, searchString',
      supports: '++support_id',
      spans: '++id'
    });
  }
}

let db: AppDB;

const searchString = randomString(500);

export const execute = async function () {
  // const array = new Array(rowsToInsert).fill(0).map((item, i) => ({
  //   title: 'The Hobbit',
  //   author: 'J.R.R. Tolkien',
  //   published_date: '1937-09-21',
  //   isbn: i % 100 === 0 ? searchString : randomString(500)
  // }));
  const { sections, supports, spans } = generateData(rowsToInsert, searchString);
  // const array = new Array(rowsToInsert).fill(0).map((item, i) => ({
  //   title: 'The Hobbit',
  //   author: 'J.R.R. Tolkien',
  //   published_date: '1937-09-21',
  //   isbn: i % 100 === 0 ? searchString : randomString(500)
  // }));
  // db
  // array[100].isbn = searchString;
  console.log('i start now');
  // console.log('i insert', (calculateObjectSize(sections[0]) * sections.length) / 1000000, 'MB');
  console.log('i insert', rowsToInsert, 'rows');
  const startTime = performance.now();
  await db.sections.bulkAdd(sections);
  await db.supports.bulkAdd(supports.flat());
  await db.spans.bulkAdd(spans.flat());
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
  postMessage({ type: 'fillTime', totalTime, database });
};

export const setUp = async function () {
  db = new AppDB();
  console.log('db is', db);
};

export const searchInDatabase = async function () {
  const startTime = performance.now();
  console.log('searchString is', searchString);
  const result = await db.sections.where('searchString').equals(searchString).toArray();
  console.log('result is', result.length);
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime, startTime, endTime);
  postMessage({ type: 'searchTime', searchString, totalTime, database });
};

export const updateNinetyPercent = async function () {
  const startTime = performance.now();
  const allSections = await db.sections.toArray();
  const ninetyPercent = allSections.slice(0, Math.floor(allSections.length * 0.9));
  await db.sections.bulkUpdate(ninetyPercent.map((section) => ({ key: section.section_id, changes: { searchString: searchString } })));
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
  postMessage({ type: 'updateTime', totalTime, database });
};

export const launch = async () => {
  await setUp();
  await execute();
  await searchInDatabase();
  await updateNinetyPercent();
};
