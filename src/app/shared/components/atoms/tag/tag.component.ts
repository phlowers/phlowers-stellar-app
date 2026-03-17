import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TagColor } from '@shared/model/tags.model';

@Component({
  selector: 'app-tag',
  imports: [],
  templateUrl: './tag.component.html',
  styleUrl: './tag.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Small label component used to display colored tags with text. */
export class TagComponent {
  /** Text displayed inside the tag. */
  text = input.required<string>();
  /** Color variant of the tag. */
  type = input<TagColor>('neutral');
}
