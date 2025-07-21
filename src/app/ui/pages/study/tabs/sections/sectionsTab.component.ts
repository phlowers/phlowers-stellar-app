import { Component, signal } from '@angular/core';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { NewSectionModalComponent } from './newSectionModal/newSectionModal.component';

@Component({
  selector: 'app-sections-tab',
  imports: [
    CommonModule,
    ButtonComponent,
    IconComponent,
    NewSectionModalComponent
  ],
  templateUrl: './sectionsTab.component.html',
  styleUrl: './sectionsTab.component.scss'
})
export class SectionsTabComponent {
  sections = signal<Section[]>([]);
  isNewSectionModalOpen = signal<boolean>(true);

  addSection() {
    // empty
  }

  openNewSectionModal() {
    this.isNewSectionModalOpen.set(true);
  }

  onModalOpenChange(isOpen: boolean) {
    this.isNewSectionModalOpen.set(isOpen);
  }
}
