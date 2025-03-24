import { worker } from '@electric-sql/pglite/worker';
import { databases } from './databases';
import { PGlite } from '@electric-sql/pglite';

worker({
  async init(options) {
    const meta = options.meta;

    // Create and return a PGlite instance
    return new PGlite({
      dataDir: options.dataDir
    });
  }
});

addEventListener('message', async ({ data }: { data: { type: any; task: any } }) => {
  const { type, task } = data;
  console.log('type is', type);
  const database: any = databases[type];
  if (data.task === 'setUp') {
    await database['setUp']();
  }
  if (data.task === 'execute') {
    await database['execute']();
  }
  if (data.task === 'searchInDatabase') {
    await database['searchInDatabase']();
  }
  if (data.task === 'launch') {
    await database['launch']();
  }
});
