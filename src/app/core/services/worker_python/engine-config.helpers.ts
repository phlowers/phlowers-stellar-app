/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { EngineConfig } from './engine-config.interfaces';

/**
 * Parses the stored engine options overload.
 * Nothing stored gives an empty overload; unreadable content (not a JSON object) gives `null`.
 */
export const parseEngineConfig = (raw: string | null): EngineConfig | null => {
  if (raw === null) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as EngineConfig) : null;
  } catch {
    return null;
  }
};
