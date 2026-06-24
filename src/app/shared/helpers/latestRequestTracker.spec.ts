/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { KeyedLatestRequestTracker, LatestRequestTracker } from './latestRequestTracker';

describe('LatestRequestTracker', () => {
  it('treats the only request as current', () => {
    const tracker = new LatestRequestTracker();
    const token = tracker.begin();
    expect(tracker.isCurrent(token)).toBe(true);
  });

  it('invalidates an earlier request once a newer one begins', () => {
    const tracker = new LatestRequestTracker();
    const first = tracker.begin();
    const second = tracker.begin();
    expect(tracker.isCurrent(first)).toBe(false);
    expect(tracker.isCurrent(second)).toBe(true);
  });
});

describe('KeyedLatestRequestTracker', () => {
  it('tracks each key independently', () => {
    const tracker = new KeyedLatestRequestTracker<string>();
    const a = tracker.begin('a');
    const b = tracker.begin('b');
    expect(tracker.isCurrent('a', a)).toBe(true);
    expect(tracker.isCurrent('b', b)).toBe(true);
  });

  it('invalidates an earlier request for the same key', () => {
    const tracker = new KeyedLatestRequestTracker<string>();
    const first = tracker.begin('a');
    const second = tracker.begin('a');
    expect(tracker.isCurrent('a', first)).toBe(false);
    expect(tracker.isCurrent('a', second)).toBe(true);
  });

  it('reports unknown keys as not current', () => {
    const tracker = new KeyedLatestRequestTracker<string>();
    expect(tracker.isCurrent('missing', 1)).toBe(false);
  });

  it('drops keys absent from the live set on retain', () => {
    const tracker = new KeyedLatestRequestTracker<string>();
    const a = tracker.begin('a');
    const b = tracker.begin('b');
    tracker.retain(['a']);
    expect(tracker.isCurrent('a', a)).toBe(true);
    expect(tracker.isCurrent('b', b)).toBe(false);
  });

  it('accepts a Set as the live keys argument', () => {
    const tracker = new KeyedLatestRequestTracker<string>();
    const a = tracker.begin('a');
    tracker.retain(new Set(['a']));
    expect(tracker.isCurrent('a', a)).toBe(true);
  });
});
