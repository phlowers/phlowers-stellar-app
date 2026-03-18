/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Augment the global `vi` const with type aliases matching vitest exports.
 * This allows using `vi.Mock`, `vi.Mocked`, `vi.MockedFunction`, and
 * `vi.SpyInstance` as type annotations without explicit imports.
 */
declare namespace vi {
  type Mock<T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown> = import('vitest').Mock<T>;
  type Mocked<T> = import('vitest').Mocked<T>;
  type MockedFunction<T extends (...args: unknown[]) => unknown> = import('vitest').MockedFunction<T>;
  type SpyInstance<T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown> =
    import('vitest').MockInstance<T>;
}
