/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * "Latest wins" guard for overlapping async resolutions of a single subject.
 *
 * Each `begin` returns a monotonically increasing token; `isCurrent`
 * tells whether that token is still the most recent one. A late-resolving lookup
 * can therefore detect that a newer request has superseded it and discard its
 * result instead of clobbering fresher state.
 */
export class LatestRequestTracker {
  private current = 0;

  /** Registers a new request and returns its token. */
  begin(): number {
    return ++this.current;
  }

  /** True when `token` is still the most recent request (nothing newer started since). */
  isCurrent(token: number): boolean {
    return token === this.current;
  }
}

/**
 * Per-key variant of `LatestRequestTracker`: an independent "latest wins"
 * token sequence for each key (e.g. one per table row identified by UUID).
 *
 * Use `retain` to drop keys that no longer exist so the internal map cannot
 * grow unbounded across a long-lived session.
 */
export class KeyedLatestRequestTracker<K> {
  private readonly tokens = new Map<K, number>();

  /** Registers a new request for `key` and returns its token. */
  begin(key: K): number {
    const token = (this.tokens.get(key) ?? 0) + 1;
    this.tokens.set(key, token);
    return token;
  }

  /** True when `token` is still the most recent request for `key`. */
  isCurrent(key: K, token: number): boolean {
    return this.tokens.get(key) === token;
  }

  /** Drops every tracked key absent from `liveKeys`, bounding the internal map. */
  retain(liveKeys: Iterable<K>): void {
    const live = liveKeys instanceof Set ? liveKeys : new Set(liveKeys);
    for (const key of this.tokens.keys()) {
      if (!live.has(key)) {
        this.tokens.delete(key);
      }
    }
  }
}
