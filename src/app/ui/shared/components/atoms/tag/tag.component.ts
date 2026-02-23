import { Component, input } from '@angular/core';
import { TagColor } from '@ui/shared/model/tags.model';

@Component({
  selector: 'app-tag',
  imports: [],
  templateUrl: './tag.component.html',
  styleUrl: './tag.component.scss'
})
/** Small label component used to display colored tags with text. */
export class TagComponent {
  /** Text displayed inside the tag. */
  text = input.required<string>();
  /** Color variant of the tag. */
  type = input<TagColor>('neutral');
}
