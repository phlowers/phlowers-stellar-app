/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { createEmptyInitialCondition, createEmptySection } from './sections.helpers';

describe('createEmptyInitialCondition', () => {
  it('should create an initial condition with a non-empty uuid', () => {
    const ic = createEmptyInitialCondition();
    expect(ic.uuid).toBeTruthy();
  });

  it('should have base_temperature of 15', () => {
    const ic = createEmptyInitialCondition();
    expect(ic.base_temperature).toBe(15);
  });

  it('should have base_parameters null', () => {
    const ic = createEmptyInitialCondition();
    expect(ic.base_parameters).toBeNull();
  });

  it('should have cable_pretension 0', () => {
    const ic = createEmptyInitialCondition();
    expect(ic.cable_pretension).toBe(0);
  });

  it('should have min_temperature 0', () => {
    const ic = createEmptyInitialCondition();
    expect(ic.min_temperature).toBe(0);
  });

  it('should have max_wind_pressure 0', () => {
    const ic = createEmptyInitialCondition();
    expect(ic.max_wind_pressure).toBe(0);
  });

  it('should have max_frost_width 0', () => {
    const ic = createEmptyInitialCondition();
    expect(ic.max_frost_width).toBe(0);
  });

  it('should generate a unique uuid on each call', () => {
    const ic1 = createEmptyInitialCondition();
    const ic2 = createEmptyInitialCondition();
    expect(ic1.uuid).not.toBe(ic2.uuid);
  });
});

describe('createEmptySection', () => {
  it('should create a section with a non-empty uuid', () => {
    const section = createEmptySection();
    expect(section.uuid).toBeTruthy();
  });

  it('should generate a unique uuid on each call', () => {
    const s1 = createEmptySection();
    const s2 = createEmptySection();
    expect(s1.uuid).not.toBe(s2.uuid);
  });

  it('should initialise cable_support_manipulations as an empty array', () => {
    const section = createEmptySection();
    expect(section.cable_support_manipulations).toEqual([]);
  });

  it('should initialise selected_cable_support_manipulation_uuid as null', () => {
    const section = createEmptySection();
    expect(section.selected_cable_support_manipulation_uuid).toBeNull();
  });
});
