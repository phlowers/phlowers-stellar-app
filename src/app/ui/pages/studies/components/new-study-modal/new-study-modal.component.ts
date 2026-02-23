import { Component, input, output, computed, signal, effect } from '@angular/core';
import { Study } from '@core/domain';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { StudiesService } from '@services/studies/studies.service';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { Router } from '@angular/router';
import { FileUploadModule } from 'primeng/fileupload';

/** Creates and returns a new empty {@link Study} object with default values. */
export const createEmptyStudy = (): Study => {
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
    ToastModule,
    FileUploadModule
  ],
  templateUrl: './new-study-modal.component.html',
  styleUrl: './new-study-modal.component.scss'
})
/**
 * Modal dialog component for creating a new study or modifying an existing study's title and description.
 * Supports both "new" and "modify" modes.
 */
export class NewStudyModalComponent {
  /** Input controlling whether the modal dialog is open. */
  isOpen = input<boolean>(false);
  /** Output emitted when the modal open state changes. */
  isOpenChange = output<boolean>();
  /** Input specifying the modal mode: 'new' for creation, 'modify' for editing. */
  mode = input<'new' | 'modify'>('new');
  /** Input providing the UUID of the study being modified. */
  studyUuid = input<string>('');
  /** Input providing the initial title when modifying a study. */
  titleInput = input<string>('');
  /** Input providing the initial description when modifying a study. */
  descriptionInput = input<string>('');
  /** Signal holding the current title value entered by the user. */
  title = signal<string>('');
  /** Signal holding the current description value entered by the user. */
  description = signal<string>('');
  /** Output emitted after a study is updated, carrying the study UUID. */
  refreshStudy = output<string>();
  /** Computed signal returning the current title length. */
  titleLength = computed(() => this.title().length ?? 0);
  /** Computed signal returning the current description length. */
  descriptionLength = computed(() => this.description().length ?? 0);
  /** Signal indicating whether a submission is in progress. */
  loading = signal<boolean>(false);

  /**
   * Updates the title signal with the given value.
   * @param title - The new title string.
   */
  updateTitle(title: string) {
    this.title.set(title);
  }

  /**
   * Updates the description signal with the given value.
   * @param description - The new description string.
   */
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

  /** Submits the form to create a new study or update an existing one, then closes the modal. */
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
