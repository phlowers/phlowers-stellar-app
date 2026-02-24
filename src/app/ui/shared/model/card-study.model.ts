import { TagColor } from './tags.model';

/** Represents a tag entry displayed on a study card. */
export interface TagList {
  /** Display text of the tag. */
  text: string;
  /** Color variant of the tag. */
  color: TagColor;
}
