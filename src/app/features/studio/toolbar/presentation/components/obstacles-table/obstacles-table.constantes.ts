import { ObstacleTableLabelOption } from './obstacles-table.interfaces';

/** Sentinel value selecting all spans at once in the obstacles table span filter. */
export const ALL_SPANS_OPTION_VALUE = '__all-spans__';

export const findLabel = (options: ObstacleTableLabelOption[], value: string): string =>
  options.find((option) => option.value === value)?.label ?? value;
