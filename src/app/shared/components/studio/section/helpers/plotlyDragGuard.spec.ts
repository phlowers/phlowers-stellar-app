/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, expect, it } from 'vitest';
import { shouldBlockPlotlyDrag } from './plotlyDragGuard';

describe('shouldBlockPlotlyDrag', () => {
  it('should block a Ctrl+press', () => {
    expect(shouldBlockPlotlyDrag({ ctrlKey: true, buttons: 1 })).toBe(true);
  });

  it('should block a right-button press', () => {
    expect(shouldBlockPlotlyDrag({ ctrlKey: false, buttons: 2 })).toBe(true);
  });

  it('should not block a plain left-button press', () => {
    expect(shouldBlockPlotlyDrag({ ctrlKey: false, buttons: 1 })).toBe(false);
  });
});
