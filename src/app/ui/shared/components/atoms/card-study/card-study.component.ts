import { Component, input } from '@angular/core';
import { TagComponent } from '@ui/shared/components/atoms/tag/tag.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { TagList } from '@ui/shared/model/card-study.model';

const currentLocale = navigator.language;

@Component({
  selector: 'app-card-study',
  imports: [TagComponent, IconComponent],
  templateUrl: './card-study.component.html',
  styleUrl: './card-study.component.scss'
})
export class CardStudyComponent {
  title = input.required<string>();
  authorMail = input.required<string>();
  modificationDate = input.required<string, string>({
    transform: (value: string) => {
      const date = new Date(value);
      return (
        date.toLocaleDateString(currentLocale) +
        ' ' +
        date.toLocaleTimeString(currentLocale)
      );
    }
  });
  tagList = input<TagList[]>();
}
