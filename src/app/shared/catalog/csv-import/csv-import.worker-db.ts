/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import Dexie, { Table } from 'dexie';
import { applyStellarDbVersions } from '@infrastructure/database';

/**
 * Opens the same Dexie database as the main thread from a Web Worker context.
 *
 * @remarks
 * Reuses `applyStellarDbVersions` so the worker and the main thread
 * always declare the exact same schema versions. IndexedDB supports concurrent
 * access from multiple contexts on the same origin. The returned instance
 * exposes every catalog table as a loosely typed `Table<unknown, unknown>`
 * since the engine doesn't know the row type.
 */
export function openWorkerDb(): Dexie & Record<string, Table<unknown, unknown>> {
  const db = new Dexie('stellar-db') as Dexie & Record<string, Table<unknown, unknown>>;
  applyStellarDbVersions(db);
  return db;
}
