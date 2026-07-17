import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { StudiesService } from '@services/studies/studies.service';

import { SelectModule } from 'primeng/select';

/**
 * Dialog for exporting a study to a file.
 *
 * Allows the user to specify a filename and format before downloading.
 */
@Component({
  selector: 'app-export-dialog',
  standalone: true,
  imports: [DialogModule, ReactiveFormsModule, InputTextModule, IconComponent, ButtonComponent, SelectModule],
  templateUrl: './export-dialog.component.html',
  styleUrl: './export-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExportDialogComponent {
  /** Available export format options. */
  exportFormats = input<{ label: string; value: string }[]>([{ label: '.clst', value: 'clst' }]);

  form: FormGroup<{
    filename: FormControl<string | null>;
    exportFormat: FormControl<string | null>;
  }>;

  readonly studiesService = inject(StudiesService);

  constructor() {
    this.form = new FormGroup({
      filename: new FormControl<string>('', [Validators.required]),
      exportFormat: new FormControl<string>(this.exportFormats()[0]?.value || '', [Validators.required])
    });

    effect(() => {
      if (
        this.studiesService.exportDialogData() &&
        this.studiesService.exportDialogData()?.title &&
        this.studiesService.exportDialogData()?.uuid
      ) {
        const defaultFilename = this.studiesService.exportDialogData()?.title.replace(/\.clst$/, '');
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
