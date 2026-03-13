import { ChangeDetectionStrategy, Component, inject, input, output, computed, signal, effect } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { StudiesService } from '@features/studies/infrastructure/services/studies.service';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { Router } from '@angular/router';
import { FileUploadModule } from 'primeng/fileupload';
import { createEmptyStudy } from '@features/studies/domain/helpers/study.helpers';

/**
 * Modal dialog for creating a new study or modifying an existing one.
 *
 * In 'new' mode, creates a study and navigates to it.
 * In 'modify' mode, updates the title and description of an existing study.
 */
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
    ToastModule,
    FileUploadModule
  ],
  templateUrl: './new-study-modal.component.html',
  styleUrl: './new-study-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewStudyModalComponent {
  /** Whether the modal dialog is open. */
  isOpen = input<boolean>(false);
  /** Emits when the modal open state changes. */
  isOpenChange = output<boolean>();
  /** Dialog mode: 'new' to create, 'modify' to edit an existing study. */
  mode = input<'new' | 'modify'>('new');
  /** UUID of the study being modified (used in 'modify' mode). */
  studyUuid = input<string>('');
  titleInput = input<string>('');
  descriptionInput = input<string>('');
  title = signal<string>('');
  description = signal<string>('');
  refreshStudy = output<string>();
  titleLength = computed(() => this.title().length ?? 0);
  descriptionLength = computed(() => this.description().length ?? 0);
  loading = signal<boolean>(false);

  private readonly messageService = inject(MessageService);
  private readonly studiesService = inject(StudiesService);
  private readonly router = inject(Router);

  updateTitle(title: string) {
    this.title.set(title);
  }

  updateDescription(description: string) {
    this.description.set(description);
  }

  constructor() {
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
        ...createEmptyStudy(),
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
      const study = await this.studiesService.getStudy(this.studyUuid());
      if (!study) {
        return;
      }
      await this.studiesService.updateStudy({
        uuid: study.uuid,
        author_email: study.author_email,
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
