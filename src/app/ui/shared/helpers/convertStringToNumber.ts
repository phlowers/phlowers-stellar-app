import { toNumber } from 'lodash';

/**
 * Converts a string value to a number, treating commas as decimal separators.
 * Returns `undefined` when the input is `undefined`.
 * @param value - The string to convert, or `undefined`.
 * @returns The numeric value, or `undefined` if input was `undefined`.
 */
export const convertStringToNumber = <T extends string | undefined>(
  value: T
): T extends undefined ? undefined : number => {
  if (value === undefined) {
    return undefined as T extends undefined ? undefined : number;
  }
  return toNumber(value.replace(',', '.')) as T extends undefined ? undefined : number;
};
