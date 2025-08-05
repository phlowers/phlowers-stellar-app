import {
  Component,
  input,
  output,
  computed,
  signal,
  effect
} from '@angular/core';
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
  mode = input<'new' | 'modify'>('new');
  studyUuid = input<string>('');
  titleInput = input<string>('');
  descriptionInput = input<string>('');
  title = signal<string>('');
  description = signal<string>('');
  refreshStudy = output<string>();

  titleLength = computed(() => this.title().length ?? 0);
  descriptionLength = computed(() => this.description().length ?? 0);

  updateTitle(title: string) {
    this.title.set(title);
  }

  updateDescription(description: string) {
    this.description.set(description);
  }

  constructor(
    private readonly messageService: MessageService,
    private readonly studiesService: StudiesService,
    private readonly router: Router
  ) {
    effect(() => {
      if (this.isOpen() && this.mode() === 'modify') {
        this.title.set(this.titleInput());
        this.description.set(this.descriptionInput());
      }
    });
  }

  async onSubmit() {
    if (this.mode() === 'new') {
      const uuid = await this.studiesService.createStudy({
        ...newStudy(),
        title: this.title(),
        description: this.description()
      });
      this.router.navigate(['/study', uuid]);
      this.messageService.add({
        severity: 'success',
        summary: $localize`Study created`,
        detail: $localize`Study created successfully`
      });
    } else {
      await this.studiesService.updateStudy({
        uuid: this.studyUuid(),
        title: this.title(),
        description: this.description()
      });
      this.refreshStudy.emit(this.studyUuid());
      this.messageService.add({
        severity: 'success',
        summary: $localize`Study updated`,
        detail: $localize`Study updated successfully`
      });
    }
    this.isOpenChange.emit(false);
  }
}
