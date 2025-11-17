/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export interface Support {
  uuid: string;
  number: string | null;
  name: string | null;
  spanLength: number | null;
  spanAngle: number | null;
  attachmentSet: string | null;
  attachmentHeight: number | null;
  heightBelowConsole: number | null;
  cableType: string | null;
  armLength: number | null;
  chainName: string | null;
  chainLength: number | null;
  chainWeight: number | null;
  chainV: boolean | null;
  counterWeight: number | null;
  supportFootAltitude: number | null;
  attachmentPosition: string | null;
  chainSurface: number | null;
}
