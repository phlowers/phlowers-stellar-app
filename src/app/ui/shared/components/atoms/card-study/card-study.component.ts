import { Component, input } from '@angular/core';
import { TagComponent } from '@ui/shared/components/atoms/tag/tag.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { TagList } from '@ui/shared/model/card-study.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-card-study',
  imports: [TagComponent, IconComponent],
  templateUrl: './card-study.component.html',
  styleUrl: './card-study.component.scss'
})
export class CardStudyComponent {
  title = input.required<string>();
  authorMail = input.required<string>();
  modificationDate = input.required<string>();
  tagList = input<TagList[]>();
  uuid = input.required<string>();

  constructor(private readonly router: Router) {}

  onCardClick() {
    this.router.navigate(['/study', this.uuid()]);
  }
}
