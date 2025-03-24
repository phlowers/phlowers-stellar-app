import { databases } from './databases';

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
