/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { generate } from 'random-words-commonjs';
import { v4 as uuidV4 } from 'uuid';
import { StudyEntity } from '../entities';

/**
 * Creates mock study data for testing purposes
 * @returns Array of mock Study entities
 */
export const createStudiesMockData = (): StudyEntity[] => {
  const studies: StudyEntity[] = [];

  for (let i = 0; i < 10; i++) {
    const now = new Date();
    const randomPastDate = new Date(
      Math.floor(
        Math.random() * (now.getTime() - new Date('2020-01-01').getTime()) //NOSONAR
      ) + new Date('2020-01-01').getTime()
    );

    studies.push({
      uuid: uuidV4(),
      author_email: generate() as string,
      title: generate() as string,
      description: generate() as string,
      shareable: true,
      created_at_offline: randomPastDate.toISOString(),
      updated_at_offline: randomPastDate.toISOString(),
      saved: true,
      sections: []
    });
  }

  return studies;
};
