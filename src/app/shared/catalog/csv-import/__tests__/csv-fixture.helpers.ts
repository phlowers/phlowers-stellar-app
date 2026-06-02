/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Papa from 'papaparse';

const FIXTURE_DIR = resolve(process.cwd(), 'e2e/fixtures/csv');

const FIXTURE_FILES = {
  attachments: 'attachments.fixture.csv',
  cables: 'cables.fixture.csv',
  chains: 'chains.fixture.csv',
  lines: 'lines.fixture.csv',
  maintenance: 'maintenance.fixture.csv',
  obstacles: 'obstacles.fixture.csv'
} as const;

/** Loads the raw CSV string of an anonymized fixture. */
export const readFixtureCsv = (key: keyof typeof FIXTURE_FILES): string => {
  return readFileSync(resolve(FIXTURE_DIR, FIXTURE_FILES[key]), 'utf-8');
};

/** Parses a fixture CSV into typed rows via PapaParse. */
export const parseFixtureCsv = <T>(key: keyof typeof FIXTURE_FILES, delimiter = ','): T[] => {
  const csv = readFixtureCsv(key);
  const result = Papa.parse<T>(csv, {
    header: true,
    skipEmptyLines: true,
    delimiter
  });
  return result.data;
};
