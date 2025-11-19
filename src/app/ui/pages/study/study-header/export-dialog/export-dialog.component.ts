import { Component, input, effect } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-export-dialog',
  standalone: true,
  imports: [
    DialogModule,
    ReactiveFormsModule,
    InputTextModule,
    IconComponent,
    ButtonComponent,
    CommonModule,
    SelectModule
  ],
  templateUrl: './export-dialog.component.html',
  styleUrl: './export-dialog.component.scss'
})
export class ExportDialogComponent {
  exportFormats = input<{ label: string; value: string }[]>([
    { label: '.clst', value: 'clst' }
  ]);

  form: FormGroup<{
    filename: FormControl<string | null>;
    exportFormat: FormControl<string | null>;
  }>;

  constructor(public readonly studiesService: StudiesService) {
    this.form = new FormGroup({
      filename: new FormControl<string>('', [Validators.required]),
      exportFormat: new FormControl<string>(
        this.exportFormats()[0]?.value || '',
        [Validators.required]
      )
    });

    effect(() => {
      if (
        this.studiesService.exportDialogData() &&
        this.studiesService.exportDialogData()?.title &&
        this.studiesService.exportDialogData()?.uuid
      ) {
        const defaultFilename = this.studiesService
          .exportDialogData()
          ?.title.replace(/\.clst$/, '');
        this.form.patchValue({ filename: defaultFilename });
      }
    });
  }

  exportStudy() {
    const filename = this.form.value.filename;
    const uuid = this.studiesService.exportDialogData()?.uuid;
    if (this.form.valid && uuid && filename && filename) {
      this.studiesService.downloadStudy(uuid, filename);
      this.studiesService.exportDialogData.set(null);
    }
  }

  cancel() {
    this.studiesService.exportDialogData.set(null);
  }
}
