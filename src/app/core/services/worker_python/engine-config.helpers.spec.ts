/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { parseEngineConfig } from './engine-config.helpers';

describe('parseEngineConfig', () => {
  it('should return an empty config when nothing is stored', () => {
    expect(parseEngineConfig(null)).toEqual({});
  });

  it('should return the stored JSON object', () => {
    expect(parseEngineConfig('{"solver.acceleration.banded_jacobian.active":false}')).toEqual({
      'solver.acceleration.banded_jacobian.active': false
    });
  });

  it.each(['{not json', 'null', '[1]', '"text"', '3'])('should return null for unreadable content %s', (raw) => {
    expect(parseEngineConfig(raw)).toBeNull();
  });
});
