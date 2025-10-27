import { toNumber } from 'lodash';

export const convertStringToNumber = <T extends string | undefined>(
  value: T
): T extends undefined ? undefined : number => {
  if (value === undefined) {
    return undefined as T extends undefined ? undefined : number;
  }
  return toNumber(value.replace(',', '.')) as T extends undefined
    ? undefined
    : number;
};
