import { Component, signal } from '@angular/core';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { TagComponent } from '@ui/shared/components/atoms/tag/tag.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { AccordionModule } from 'primeng/accordion';

@Component({
  selector: 'app-study-header',
  imports: [ButtonComponent, IconComponent, TagComponent, AccordionModule],
  templateUrl: './study-header.component.html',
  styleUrl: './study-header.component.scss'
})
export class StudyHeader {
  public isDetailOpen = signal<boolean>(false);

  public activeDetail = signal<string>('');

  toggleActiveDetail() {
    this.isDetailOpen.set(!this.isDetailOpen());
    if (this.isDetailOpen()) {
      this.activeDetail.set('0');
    } else {
      this.activeDetail.set('');
    }
  }
}
