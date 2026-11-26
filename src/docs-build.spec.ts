import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DOCUMENTED_SOURCE_DIRECTORIES = [
  'src/app/core/services',
  'src/app/shared/catalog/services',
  'src/app/shared/domain',
  'src/app/infrastructure',
  'src/app/features/changelog',
  'src/app/features/news'
];

const INLINE_TAG_PATTERN = /\{@(?:link|linkcode|linkplain|includeCode|inheritDoc|label)\b/;

describe('Sphinx documentation build', () => {
  it('should not use TSDoc inline tags in documented sources, which sphinx-js cannot render', async () => {
    const entries = await Promise.all(
      DOCUMENTED_SOURCE_DIRECTORIES.map((directory) =>
        readdir(join(process.cwd(), directory), { recursive: true, withFileTypes: true })
      )
    );

    const files = entries
      .flat()
      .filter((entry) => entry.isFile() && /\.ts$/.test(entry.name) && !/\.(spec|worker)\.ts$/.test(entry.name))
      .map((entry) => join(entry.parentPath, entry.name));

    const offenders: string[] = [];
    for (const file of files) {
      if (INLINE_TAG_PATTERN.test(await readFile(file, 'utf8'))) {
        offenders.push(file);
      }
    }

    expect(files.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});
