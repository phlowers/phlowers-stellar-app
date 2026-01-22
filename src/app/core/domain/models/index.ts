/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Domain models barrel export

// Core domain models
export type { User } from './user.model';
export type { Study } from './study.model';
export type { Section } from './section.model';
export type { Support } from './support.model';
export type { Charge, ClimateCharge, SpanLoad } from './charge.model';
export type { InitialCondition } from './initial-condition.model';
export type {
  VtlAndGuying,
  VtlAndGuyingInputs,
  VtlAndGuyingOutputs
} from './vtl-and-guying.model';
export type { ProtoV4Support, ProtoV4Parameters } from './proto-v4.model';

// Catalog models
export * from './catalog';
