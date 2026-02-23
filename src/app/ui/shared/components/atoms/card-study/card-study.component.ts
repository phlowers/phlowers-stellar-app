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
/** Card component representing a study entry with metadata, tags, and click-to-navigate behaviour. */
export class CardStudyComponent {
  /** Title of the study. */
  title = input.required<string>();
  /** Email address of the study's author. */
  authorMail = input.required<string>();
  /** Human-readable date of the last modification. */
  modificationDate = input.required<string>();
  /** Optional list of tags displayed on the card. */
  tagList = input<TagList[]>();
  /** Unique identifier of the study, used for navigation. */
  uuid = input.required<string>();

  constructor(private readonly router: Router) {}

  /** Navigates to the study detail page when the card is clicked. */
  onCardClick() {
    this.router.navigate(['/study', this.uuid()]);
  }
}
