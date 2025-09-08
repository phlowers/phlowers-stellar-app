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
import { FileUploadModule } from 'primeng/fileupload';
import Papa from 'papaparse';
import {
  ProtoV4Parameters,
  ProtoV4Support
} from '@src/app/core/data/database/interfaces/protoV4';

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
    ToastModule,
    FileUploadModule
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
  loading = signal<boolean>(false);
  studyFromProtoV4 = signal<Pick<StudyModel, 'sections' | 'shareable'> | null>(
    null
  );

  updateTitle(title: string) {
    this.title.set(title);
  }

  updateDescription(description: string) {
    this.description.set(description);
  }

  loadProtoV4File(event: Event) {
    this.loading.set(true);
    const file = (event.target as HTMLInputElement).files?.item(0);

    const convertToNumber = (value: string) => {
      return Number(value.replace(',', '.'));
    };
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawParameters: string[] = [];
        const csvSupports = (e.target?.result as string)
          .split('\n')
          .map((line: string) => {
            const parts = line.split(';');
            rawParameters.push(parts.pop()?.replace('\r', '') ?? '');
            parts.pop();
            return parts.join(';');
          })
          .join('\n');
        console.log('rawParameters is', rawParameters);
        const parameters: ProtoV4Parameters = {
          conductor: rawParameters[3],
          cable_amount: convertToNumber(rawParameters[5]),
          temperature_reference: convertToNumber(rawParameters[7]),
          parameter: convertToNumber(rawParameters[9]),
          cra: convertToNumber(rawParameters[11]),
          temp_load: convertToNumber(rawParameters[13]),
          wind_load: convertToNumber(rawParameters[15]),
          frost_load: convertToNumber(rawParameters[17]),
          project_name: rawParameters[19]
        };
        Papa.parse(csvSupports as string, {
          header: true,
          skipEmptyLines: true,
          complete: async (
            jsonResults: Papa.ParseResult<Record<string, string>>
          ) => {
            console.log('jsonResults is', jsonResults);
            const supports: ProtoV4Support[] = jsonResults.data.map(
              (support: Record<string, string>) => {
                return {
                  ...support,
                  nom: support.nom,
                  num: convertToNumber(support.num),
                  portée: convertToNumber(support.portée),
                  angle_ligne: convertToNumber(support.angle_ligne),
                  ctr_poids: convertToNumber(support.ctr_poids),
                  long_bras: convertToNumber(support.long_bras),
                  long_ch: convertToNumber(support.long_ch),
                  pds_ch: convertToNumber(support.pds_ch),
                  surf_ch: convertToNumber(support.surf_ch),
                  alt_acc: convertToNumber(support.alt_acc),
                  suspension: support.suspension === 'FAUX' ? false : true,
                  ch_en_V: support.ch_en_V === 'FAUX' ? false : true
                };
              }
            );
            console.log('data is', supports);
            console.log('parameters is', parameters);
            const study = this.studiesService.createStudyFromProtoV4(
              supports,
              parameters
            );
            console.log('study is', study);
            this.studyFromProtoV4.set(study);
            this.loading.set(false);
          }
        });
      };
      reader.readAsText(file);
    }
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
        ...(this.studyFromProtoV4() ?? newStudy()),
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
