/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Hidden engine options overload: mechaphlowers option path (e.g. `solver.acceleration.banded_jacobian.active`) -> value. */
export type EngineConfig = Record<string, unknown>;

/** API exposed on `globalThis[CONSOLE_API_NAME]` for the browser console. */
export interface StellarConsoleApi {
  /** Stores the engine options overload in localStorage and applies it now; an empty config restores the defaults. */
  setEngineConfig: (config: EngineConfig) => Promise<void>;
  /** Reads the live value, in the Python runtime, of every option that can be overloaded. */
  getEngineConfig: () => Promise<EngineConfig>;
}
