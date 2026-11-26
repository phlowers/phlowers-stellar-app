/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { CableSupportManipulation } from '@shared/domain/models/cable-support-manipulation.model';

/**
 * Resolves the cable support manipulations of a load case from its two sources.
 * Each (support, load case) pair has at most one manipulation: the one saved with the load case wins, the ones
 * saved from the manipulation form only complete it. Manipulations of other load cases are ignored on both sides.
 * @param chargeManips - Manipulations saved with the load case (`charge.data.supportManipParams`)
 * @param sectionManips - Manipulations saved from the manipulation form (`section.cable_support_manipulations`)
 * @param chargeUuid - UUID of the load case to resolve
 * @returns The load case manipulations, then the section ones for the remaining supports
 */
export const mergeCableSupportManips = (
  chargeManips: CableSupportManipulation[] | undefined,
  sectionManips: CableSupportManipulation[] | undefined,
  chargeUuid: string
): CableSupportManipulation[] => {
  const fromCharge = (chargeManips ?? []).filter((manip) => manip.chargeUuid === chargeUuid);
  const fromSection = (sectionManips ?? []).filter(
    (manip) =>
      manip.chargeUuid === chargeUuid &&
      !fromCharge.some((chargeManip) => chargeManip.supportUuid === manip.supportUuid)
  );
  return [...fromCharge, ...fromSection];
};
