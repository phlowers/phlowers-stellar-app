/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Support } from '@shared/domain';
import { SupportNameEntry } from '@shared/catalog/services/attachment.interfaces';

/**
 * Normalizes a voltage string for catalog matching: strips all whitespace and uppercases it,
 * so e.g. "225kV" and "225 KV" compare equal.
 */
export function normalizeVoltage(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, '').toUpperCase();
}

/** Builds the attachment catalog entries to register from the supports that carry a name. */
export function buildSupportNameEntries(supports: readonly Support[]): SupportNameEntry[] {
  return supports
    .map((support) => ({ supportName: support.name ?? '', supportTower: support.towerModel ?? null }))
    .filter((entry) => !!entry.supportName);
}
