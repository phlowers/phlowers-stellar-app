import Dexie, { Table } from 'dexie';
import { randomString, calculateObjectSize } from './helpers';

export interface Book {
  // id: string;
  title: string;
  author: string;
  published_date: string;
  isbn: string;
}

export class AppDB extends Dexie {
  books!: Table<Book, number>;

  constructor() {
    super('test-db');
    this.version(1).stores({
      books: '++id, title, author, published_date, isbn'
    });
  }
}

let db: AppDB;

const searchString = randomString(500);

const rowsToInsert = 2000;

export const execute = async function () {
  const array = new Array(rowsToInsert).fill(0).map((item, i) => ({
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    published_date: '1937-09-21',
    isbn: i % 100 === 0 ? searchString : randomString(500)
  }));
  // array[100].isbn = searchString;
  console.log('i start now');
  console.log('i insert', (calculateObjectSize(array[0]) * array.length) / 1000000, 'MB');
  console.log('i insert', rowsToInsert, 'rows');
  const startTime = performance.now();
  await db.books.bulkAdd(array);
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
};

export const setUp = async function () {
  db = new AppDB();
  console.log('db is', db);
};

export const searchInDatabase = async function () {
  const startTime = performance.now();
  console.log('searchString is', searchString.substring(10, 50));
  const result = (await db.books.toArray()).filter((book) => book.isbn.includes(searchString.substring(10, 50)));
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  console.log('totalTime is', totalTime);
  console.log('result is', result);
};
