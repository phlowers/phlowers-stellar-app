import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getManifest } from 'workbox-build';

describe('Service worker build dependencies', () => {
  it('should discover nested assets and respect precache exclusions with the patched glob dependencies', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stellar-build-test-'));
    try {
      await mkdir(join(directory, 'assets'));
      await mkdir(join(directory, 'data'));
      await Promise.all([
        writeFile(join(directory, 'index.html'), '<main>Test application</main>'),
        writeFile(join(directory, 'assets', 'main.js'), 'export const ready = true;'),
        writeFile(join(directory, 'assets', 'main.js.map'), '{}'),
        writeFile(join(directory, 'data', 'catalog.csv'), 'name\nSynthetic support')
      ]);

      const { manifestEntries, warnings } = await getManifest({
        globDirectory: directory,
        globPatterns: ['**/*'],
        globIgnores: ['data/**', '**/*.map']
      });

      expect(warnings).toEqual([]);
      expect(manifestEntries.map(({ url }) => url).sort()).toEqual(['assets/main.js', 'index.html']);
      expect(manifestEntries.every(({ revision }) => typeof revision === 'string' && revision.length > 0)).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
