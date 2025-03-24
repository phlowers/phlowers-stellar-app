import * as pgLite from './pgLite';
import * as wasmSqlite from './wasmSqlite';
import * as indexDb from './indexDb';
import * as waSqlite from './waSqlite';
import * as duckDb from './duckDb';
export const databases: any = {
  pgLite,
  wasmSqlite,
  indexDb,
  waSqlite,
  duckDb,
};
