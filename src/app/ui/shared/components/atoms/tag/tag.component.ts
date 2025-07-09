import { Component, input } from '@angular/core';
import { TagColor } from '@ui/shared/model/tags.model';

@Component({
  selector: 'app-tag',
  imports: [],
  templateUrl: './tag.component.html',
  styleUrl: './tag.component.scss'
})
export class TagComponent {
  text = input.required<string>();
  type = input<TagColor>('neutral');
}
