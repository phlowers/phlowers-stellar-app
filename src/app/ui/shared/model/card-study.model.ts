import { TagColor } from './tags.model';

/**
 * Represents a tag to be displayed on a study card.
 * @category Models
 */
export interface TagList {
  /** The display text of the tag. */
  text: string;
  /** The color variant applied to the tag. */
  color: TagColor;
}
