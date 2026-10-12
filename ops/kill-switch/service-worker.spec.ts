import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Listener = (event: { waitUntil: (promise: Promise<unknown>) => void }) => void;

/** Runs the kill-switch script against a fake service worker scope. */
function loadKillSwitch() {
  const listeners = new Map<string, Listener>();
  const names = ['workbox-precache-v2-x', 'stellar-catalogs-v1', 'app-assets-control'];
  const scope = {
    addEventListener: vi.fn((type: string, listener: Listener) => listeners.set(type, listener)),
    skipWaiting: vi.fn(async () => undefined),
    registration: { unregister: vi.fn(async () => true) },
    clients: { matchAll: vi.fn(async () => [{ navigate: vi.fn() }]), claim: vi.fn() }
  };
  const caches = {
    keys: vi.fn(async () => [...names]),
    delete: vi.fn(async (name: string) => names.splice(names.indexOf(name), 1).length > 0)
  };
  const code = readFileSync(resolve(__dirname, 'service-worker.js'), 'utf8');
  new Function('self', 'caches', code)(scope, caches);
  return { listeners, scope, caches, names };
}

describe('kill-switch service worker', () => {
  it('activates immediately on install', () => {
    const { listeners, scope } = loadKillSwitch();

    listeners.get('install')!({ waitUntil: vi.fn() });

    expect(scope.skipWaiting).toHaveBeenCalled();
  });

  it('deletes every cache, then unregisters, without navigating any client', async () => {
    const { listeners, scope, caches, names } = loadKillSwitch();
    const waitUntil = vi.fn();

    listeners.get('activate')!({ waitUntil });
    await waitUntil.mock.calls[0][0];

    expect(caches.delete).toHaveBeenCalledTimes(3);
    expect(names).toEqual([]);
    expect(scope.registration.unregister).toHaveBeenCalled();
    expect(caches.delete.mock.invocationCallOrder.at(-1)!).toBeLessThan(
      scope.registration.unregister.mock.invocationCallOrder[0]
    );
    expect(scope.clients.matchAll).not.toHaveBeenCalled();
  });

  it('never reloads or navigates pages', () => {
    const code = readFileSync(resolve(__dirname, 'service-worker.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

    expect(code).not.toMatch(/\.navigate\s*\(|location\.reload|clients\.matchAll/);
  });
});
