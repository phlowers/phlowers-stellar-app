/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
export interface ChargeData {
  climate: ClimateCharge;
  spanLoads: SpanLoad[];
}

export interface ClimateCharge {
  windPressure: number | null;
  cableTemperature: number | null;
  symmetryType: string;
  iceThickness: number | null;
  frontierSupportNumber: null;
  iceThicknessBefore: null;
  iceThicknessAfter: null;
}

/**
 * Charge domain model - represents load conditions
 */
export interface Charge {
  uuid: string;
  name: string;
  personnelPresence: boolean;
  description: string;
  data: ChargeData;
}

export enum LoadType {
  PUNCTUAL = 'punctual',
  MARKING = 'marking'
}

export interface SpanLoad {
  loadPosition: number;
  loadWeight: number;
  type: LoadType;
  supportUuid: string;
  referenceSupport: 'LEFT' | 'RIGHT';
}
