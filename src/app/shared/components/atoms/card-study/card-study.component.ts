import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TagComponent } from '@shared/components/atoms/tag/tag.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { TagList } from '@shared/model/card-study.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-card-study',
  imports: [TagComponent, IconComponent],
  templateUrl: './card-study.component.html',
  styleUrl: './card-study.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Card component representing a study item, displaying metadata and navigating to the study on click. */
export class CardStudyComponent {
  /** Study title. */
  title = input.required<string>();
  /** Email address of the study author. */
  authorMail = input.required<string>();
  /** Last modification date of the study. */
  modificationDate = input.required<string>();
  /** Optional list of tags to display on the card. */
  tagList = input<TagList[]>();
  /** Unique identifier used for navigation to the study detail page. */
  uuid = input.required<string>();

  private readonly router = inject(Router);

  onCardClick() {
    this.router.navigate(['/study', this.uuid()]);
  }
}
