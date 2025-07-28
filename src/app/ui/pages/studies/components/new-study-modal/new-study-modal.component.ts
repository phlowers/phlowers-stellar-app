import { Component, input, output, computed, signal } from '@angular/core';
import { StudyModel } from '@src/app/core/data/models/study.model';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { Router } from '@angular/router';

const newStudy = (): StudyModel => {
  return {
    title: '',
    description: '',
    shareable: false,
    uuid: '',
    author_email: '',
    created_at_offline: '',
    updated_at_offline: '',
    saved: false,
    sections: []
  };
};

@Component({
  selector: 'app-new-study-modal',
  imports: [
    DialogModule,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    TextareaModule,
    ToggleSwitchModule,
    IconComponent,
    ButtonComponent,
    ToastModule
  ],
  templateUrl: './new-study-modal.component.html',
  styleUrl: './new-study-modal.component.scss'
})
export class NewStudyModalComponent {
  isOpen = input<boolean>(false);
  isOpenChange = output<boolean>();

  newStudy = signal(newStudy());

  titleLength = computed(() => this.newStudy().title.length ?? 0);
  descriptionLength = computed(() => this.newStudy().description?.length ?? 0);

  updateTitle(title: string) {
    this.newStudy.update((study) => ({ ...study, title }));
  }

  updateDescription(description: string) {
    this.newStudy.update((study) => ({ ...study, description }));
  }

  constructor(
    private readonly messageService: MessageService,
    private readonly studiesService: StudiesService,
    private readonly router: Router
  ) {}

  async onSubmit() {
    await this.studiesService.createStudy(this.newStudy());
    this.router.navigate(['/study', this.newStudy().uuid]);
    this.isOpenChange.emit(false);
  }
}
