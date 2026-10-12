// Bundles src/sw/service-worker.ts and injects the precache manifest into dist/service-worker.js.
// Runs AFTER set-env-variables.py: revisions, integrity and sizes describe the final bytes served.
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { injectManifest } from 'workbox-build';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const SW_SOURCE = path.join(ROOT, 'src', 'sw', 'service-worker.ts');
const SW_TSCONFIG = path.join(ROOT, 'tsconfig.sw.json');
const SW_DEST = path.join(DIST_DIR, 'service-worker.js');
// Workbox silently skips files above this limit (default 2 MiB would drop Pyodide); largest file today ~27 MB.
const MAXIMUM_FILE_SIZE_BYTES = 100 * 1024 * 1024;
// Never precached: network-only manifests and config, catalogs (own cache), docs, source maps, old SW leftovers.
const PRECACHE_IGNORES = [
  'service-worker.js',
  'service-worker.interfaces.js',
  'version.json',
  'assets_list.json',
  'catalog-manifest.json',
  'assets/config/**',
  'data/**',
  'docs/**',
  '**/*.map'
];

function sha256Integrity(filePath) {
  return `sha256-${createHash('sha256').update(readFileSync(filePath)).digest('base64')}`;
}

/** Adds SRI integrity and byte size (read by the storage guard) to each entry, in a stable order. */
async function addIntegrityAndSize(entries) {
  const manifest = entries
    .map((entry) => {
      const filePath = path.join(DIST_DIR, entry.url);
      const sizeBytes = statSync(filePath).size;
      return {
        url: entry.url,
        revision: entry.revision,
        integrity: sha256Integrity(filePath),
        sizeBytes,
        // Only used (then removed) by workbox-build for its size report.
        size: sizeBytes
      };
    })
    .sort((left, right) => (left.url < right.url ? -1 : left.url > right.url ? 1 : 0));
  return { manifest, warnings: [] };
}

async function main() {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'stellar-sw-'));
  const bundledSw = path.join(tempDir, 'service-worker.js');
  try {
    await build({
      entryPoints: [SW_SOURCE],
      outfile: bundledSw,
      bundle: true,
      format: 'iife',
      target: 'es2022',
      minify: true,
      legalComments: 'none',
      tsconfig: SW_TSCONFIG,
      define: { 'process.env.NODE_ENV': '"production"' },
      logLevel: 'warning'
    });

    const { count, size, warnings } = await injectManifest({
      swSrc: bundledSw,
      swDest: SW_DEST,
      globDirectory: DIST_DIR,
      globPatterns: ['**/*'],
      globIgnores: PRECACHE_IGNORES,
      maximumFileSizeToCacheInBytes: MAXIMUM_FILE_SIZE_BYTES,
      modifyURLPrefix: { '': '/' },
      manifestTransforms: [addIntegrityAndSize]
    });
    if (warnings.length > 0) {
      warnings.forEach((warning) => console.error(`[build-service-worker] ${warning}`));
      process.exitCode = 1;
      return;
    }
    console.log(
      `[build-service-worker] ${count} files precached (${(size / 1024 / 1024).toFixed(1)} MB) -> ${SW_DEST}`
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('[build-service-worker] failed:', error);
  process.exit(1);
});
