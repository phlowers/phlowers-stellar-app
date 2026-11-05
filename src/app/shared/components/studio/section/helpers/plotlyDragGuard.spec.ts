/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, expect, it } from 'vitest';
import { hidePlotlyDragMoves, isPlotlyRightClickPress } from './plotlyDragGuard';

describe('isPlotlyRightClickPress', () => {
  it('should detect a Ctrl+press', () => {
    expect(isPlotlyRightClickPress({ ctrlKey: true, buttons: 1 })).toBe(true);
  });

  it('should detect a right-button press', () => {
    expect(isPlotlyRightClickPress({ ctrlKey: false, buttons: 2 })).toBe(true);
  });

  it('should ignore a plain left-button press', () => {
    expect(isPlotlyRightClickPress({ ctrlKey: false, buttons: 1 })).toBe(false);
  });
});

describe('hidePlotlyDragMoves', () => {
  it('should stop mousemove propagation until mouseup, without touching the press or the release', () => {
    const outerMove = vi.fn();
    const outerUp = vi.fn();
    document.addEventListener('mousemove', outerMove);
    document.addEventListener('mouseup', outerUp);

    hidePlotlyDragMoves(document.defaultView!);
    document.defaultView!.dispatchEvent(new MouseEvent('mousemove'));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));

    expect(outerMove).toHaveBeenCalledTimes(1);
    expect(outerUp).toHaveBeenCalledTimes(1);

    document.removeEventListener('mousemove', outerMove);
    document.removeEventListener('mouseup', outerUp);
  });

  it('should remove both listeners on release', () => {
    const target = { addEventListener: vi.fn(), removeEventListener: vi.fn() };

    hidePlotlyDragMoves(target);
    const release = target.addEventListener.mock.calls.find(([type]) => type === 'mouseup')![1];
    release();

    expect(target.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function), true);
    expect(target.removeEventListener).toHaveBeenCalledWith('mouseup', release, true);
  });
});
