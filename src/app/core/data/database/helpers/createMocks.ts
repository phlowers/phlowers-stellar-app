import { generate } from 'random-words-commonjs';
import { v4 as uuidV4 } from 'uuid';
import { Study } from '../interfaces/study';

export const createStudiesMockData = (): Study[] => {
  const studies = [];
  for (let i = 0; i < 10; i++) {
    studies.push({
      id: uuidV4(),
      name: generate() as string,
      description: generate() as string,
      createdAt: new Date(
        Math.floor(
          Math.random() * (Date.now() - new Date('2020-01-01').getTime()) //NOSONAR
        ) + new Date('2020-01-01').getTime()
      ),
      updatedAt: new Date(
        Math.floor(
          Math.random() * (Date.now() - new Date('2020-01-01').getTime()) //NOSONAR
        ) + new Date('2020-01-01').getTime()
      ),
      createdBy: generate() as string,
      updatedBy: generate() as string,
      status: generate() as string,
      saved: true,
      uuid: uuidV4(),
      author_email: generate() as string,
      title: generate() as string,
      study_type: generate() as string,
      shareable: true,
      created_at_offline: new Date(
        Math.floor(
          Math.random() * (Date.now() - new Date('2020-01-01').getTime()) //NOSONAR
        ) + new Date('2020-01-01').getTime()
      ).toISOString(),
      updated_at_offline: new Date(
        Math.floor(
          Math.random() * (Date.now() - new Date('2020-01-01').getTime()) //NOSONAR
        ) + new Date('2020-01-01').getTime()
      ).toISOString(),
      sections: []
    });
  }

  return studies;
};
