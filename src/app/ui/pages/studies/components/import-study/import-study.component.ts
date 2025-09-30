import { Component, signal } from '@angular/core';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { StudyModel } from '@src/app/core/data/models/study.model';
import {
  ProtoV4Parameters,
  ProtoV4Support
} from '@src/app/core/data/database/interfaces/protoV4';
import Papa from 'papaparse';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { DividerModule } from 'primeng/divider';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-import-study',
  imports: [IconComponent, DividerModule, RouterLink, ButtonComponent],
  templateUrl: './import-study.component.html',
  styleUrl: './import-study.component.scss'
})
export class ImportStudyComponent {
  loading = signal<boolean>(false);
  newStudies = signal<StudyModel[]>([]);

  constructor(private readonly studiesService: StudiesService) {}

  async deleteStudy(uuid: string) {
    await this.studiesService.deleteStudy(uuid);
    this.newStudies.set(
      this.newStudies().filter((study) => study.uuid !== uuid)
    );
  }

  loadProtoV4File(event: Event) {
    this.loading.set(true);
    const files = (event.target as HTMLInputElement).files;
    const filesArray = Array.from(files ?? []).filter(
      (file) => file.type === 'text/csv'
    );

    const convertToNumber = (value: string) => {
      return Number(value.replace(',', '.'));
    };
    if (filesArray) {
      let processedFiles = 0;
      const totalFiles = filesArray.length;

      for (const file of filesArray) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const rawParameters: string[] = [];
          const result = e.target?.result as string;
          if (!result) {
            processedFiles++;
            if (processedFiles === totalFiles) {
              this.loading.set(false);
            }
            return;
          }
          const csvSupports = result
            .split('\n')
            .map((line: string) => {
              const parts = line.split(';');
              rawParameters.push(parts.pop()?.replace('\r', '') ?? '');
              parts.pop();
              return parts.join(';');
            })
            .join('\n');
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
          Papa.parse(csvSupports, {
            header: true,
            skipEmptyLines: true,
            complete: (async (
              jsonResults: Papa.ParseResult<Record<string, string>>
            ) => {
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
                    suspension: support.suspension !== 'FAUX',
                    ch_en_V: support.ch_en_V !== 'FAUX'
                  };
                }
              );
              const study = await this.studiesService.createStudyFromProtoV4(
                supports,
                parameters
              );
              this.newStudies.set([...this.newStudies(), study]);

              processedFiles++;
              if (processedFiles === totalFiles) {
                this.loading.set(false);
              }
            }) as (
              jsonResults: Papa.ParseResult<Record<string, string>>
            ) => void
          });
        };
        reader.readAsText(file);
      }
    }
  }
}
