/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

interface HeldLock {
  name: string;
  mode: LockMode;
  owner: string;
}

interface PendingLock extends HeldLock {
  run: () => void;
}

type LockCallback = (lock: Lock | null) => unknown;

/**
 * In-memory Web Locks implementation shared by several simulated windows (FIFO queue, shared/exclusive modes,
 * `ifAvailable`). `managerFor(owner)` is the `navigator.locks` of one window; `closeWindow` releases its locks
 * like the browser does when a window closes.
 */
export class FakeLockHub {
  private held: HeldLock[] = [];
  private pending: PendingLock[] = [];

  managerFor(owner: string): LockManager {
    const request = (name: string, optionsOrCallback: LockOptions | LockCallback, maybeCallback?: LockCallback) => {
      const options = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback;
      const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback!;
      const mode: LockMode = options.mode ?? 'exclusive';
      return new Promise((resolve, reject) => {
        const run = (): void => {
          const entry: HeldLock = { name, mode, owner };
          this.held.push(entry);
          Promise.resolve()
            .then(() => callback({ name, mode } as Lock))
            .then(resolve, reject)
            .finally(() => {
              this.held = this.held.filter((lock) => lock !== entry);
              this.pump();
            });
        };
        if (
          options.ifAvailable &&
          !this.canGrant(
            name,
            mode,
            this.pending.some((p) => p.name === name)
          )
        ) {
          Promise.resolve(callback(null)).then(resolve, reject);
          return;
        }
        this.pending.push({ name, mode, owner, run });
        this.pump();
      });
    };
    return { request, query: async () => ({ held: [], pending: [] }) } as unknown as LockManager;
  }

  closeWindow(owner: string): void {
    this.held = this.held.filter((lock) => lock.owner !== owner);
    this.pending = this.pending.filter((lock) => lock.owner !== owner);
    this.pump();
  }

  private canGrant(name: string, mode: LockMode, queueBlocks: boolean): boolean {
    if (queueBlocks) {
      return false;
    }
    const holders = this.held.filter((lock) => lock.name === name);
    return mode === 'exclusive' ? holders.length === 0 : holders.every((lock) => lock.mode === 'shared');
  }

  private pump(): void {
    const blocked = new Set<string>();
    for (const lock of [...this.pending]) {
      if (this.canGrant(lock.name, lock.mode, blocked.has(lock.name))) {
        this.pending = this.pending.filter((p) => p !== lock);
        lock.run();
      } else {
        blocked.add(lock.name);
      }
    }
  }
}
