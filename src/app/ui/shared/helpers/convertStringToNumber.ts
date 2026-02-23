import { toNumber } from 'lodash';

/**
 * Converts a string value to a number, handling comma as decimal separator.
 * Returns `undefined` if the input is `undefined`.
 * @category Helpers
 * @param value - The string value to convert, or `undefined`.
 * @returns The parsed number, or `undefined` if the input was `undefined`.
 */
export const convertStringToNumber = <T extends string | undefined>(
  value: T
): T extends undefined ? undefined : number => {
  if (value === undefined) {
    return undefined as T extends undefined ? undefined : number;
  }
  return toNumber(value.replace(',', '.')) as T extends undefined ? undefined : number;
};
