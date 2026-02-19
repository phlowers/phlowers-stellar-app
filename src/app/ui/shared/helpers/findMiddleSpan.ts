/**
 * Find the middle span between two supports
 * @param startSupport - The start support number
 * @param endSupport - The end support number
 * @returns The middle span as an array of two numbers
 */
export const findMiddleSpan = (startSupport: number, endSupport: number): number[] => {
  return [Math.floor((startSupport + endSupport) / 2), Math.floor((startSupport + endSupport) / 2) + 1];
};
