import { Component, input } from '@angular/core';
import { TagColor } from '@ui/shared/model/tags.model';

@Component({
  selector: 'app-tag',
  imports: [],
  templateUrl: './tag.component.html',
  styleUrl: './tag.component.scss'
})
/** Displays a small coloured tag label, useful for status badges or categories. */
export class TagComponent {
  /** Text content displayed inside the tag. */
  text = input.required<string>();
  /** Colour variant applied to the tag. Defaults to `'neutral'`. */
  type = input<TagColor>('neutral');
}
