/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { parseBooleanOrNull, parseFloatOrNull } from './section-import-parse.helpers';

describe('parseBooleanOrNull', () => {
  it('should return null for null/undefined', () => {
    expect(parseBooleanOrNull(null)).toBeNull();
    expect(parseBooleanOrNull(undefined)).toBeNull();
  });

  it('should return the value unchanged for native booleans', () => {
    expect(parseBooleanOrNull(true)).toBe(true);
    expect(parseBooleanOrNull(false)).toBe(false);
  });

  it('should recognize lowercase "true"/"false"', () => {
    expect(parseBooleanOrNull('true')).toBe(true);
    expect(parseBooleanOrNull('false')).toBe(false);
  });

  it('should recognize capitalized "True"/"False"', () => {
    expect(parseBooleanOrNull('True')).toBe(true);
    expect(parseBooleanOrNull('False')).toBe(false);
  });

  it('should recognize "OUI"/"NON" case-insensitively', () => {
    expect(parseBooleanOrNull('oui')).toBe(true);
    expect(parseBooleanOrNull('non')).toBe(false);
  });

  it('should recognize "1"/"0"', () => {
    expect(parseBooleanOrNull('1')).toBe(true);
    expect(parseBooleanOrNull('0')).toBe(false);
  });

  it('should return null for unrecognized values', () => {
    expect(parseBooleanOrNull('maybe')).toBeNull();
  });
});

describe('parseFloatOrNull', () => {
  it('should return null for null, undefined and empty string', () => {
    expect(parseFloatOrNull(null)).toBeNull();
    expect(parseFloatOrNull(undefined)).toBeNull();
    expect(parseFloatOrNull('')).toBeNull();
  });

  it('should parse a valid numeric string to a number', () => {
    expect(parseFloatOrNull('42.5')).toBe(42.5);
    expect(parseFloatOrNull('0')).toBe(0);
    expect(parseFloatOrNull('-13.2')).toBe(-13.2);
  });

  it('should parse a native number value via String() conversion', () => {
    expect(parseFloatOrNull(4)).toBe(4);
  });

  it('should return null for a non-numeric string', () => {
    expect(parseFloatOrNull('abc')).toBeNull();
  });

  it('should return null for an object value', () => {
    expect(parseFloatOrNull({})).toBeNull();
  });
});
