import { Pipe, PipeTransform } from '@angular/core';
import { uniqBy } from 'lodash';

/**
 * A pipe that removes duplicate items from an array based on a specified property.
 *
 * @example
 * // In template:
 * // Assuming items is an array of objects with a 'name' property
 * {{ items | unique:'name' }}
 *
 * @usageNotes
 * This pipe uses lodash's uniqBy function to filter out duplicate values.
 * It is marked as impure to ensure it runs on every change detection cycle.
 */
@Pipe({
  name: 'unique',
  pure: false
})
export class UniquePipe implements PipeTransform {
  /**
   * Transforms an array by removing duplicate items based on a specified property.
   *
   * @param value - The array to remove duplicates from
   * @param label - The property name to use for uniqueness comparison
   * @returns An array with duplicate items removed based on the specified property
   */
  transform<Item extends Record<any, any>>(
    items: Item[],
    label: keyof Item
  ): Item[] {
    if (items !== undefined && items !== null) {
      return uniqBy(items, label);
    }
    return items;
  }
}
