import { Component, signal } from '@angular/core';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import {
  ProtoV4Parameters,
  ProtoV4Support
} from '@src/app/core/data/database/interfaces/protoV4';
import Papa from 'papaparse';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import { DividerModule } from 'primeng/divider';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { RouterLink } from '@angular/router';
import { Study } from '@src/app/core/data/database/interfaces/study';

@Component({
  selector: 'app-import-study',
  imports: [IconComponent, DividerModule, RouterLink, ButtonComponent],
  templateUrl: './import-study.component.html',
  styleUrl: './import-study.component.scss'
})
export class ImportStudyComponent {
  loading = signal<boolean>(false);
  newStudies = signal<Study[]>([]);

  constructor(private readonly studiesService: StudiesService) {}

  async deleteStudy(uuid: string) {
    await this.studiesService.deleteStudy(uuid);
    this.newStudies.set(
      this.newStudies().filter((study) => study.uuid !== uuid)
    );
  }

  loadAppFile(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      const parsedResult = JSON.parse(result);
      const uuid = await this.studiesService.createStudy(parsedResult);
      const study = await this.studiesService.getStudy(uuid);
      if (!study) {
        return;
      }
      this.newStudies.set([...this.newStudies(), study]);
    };
    reader.readAsText(file);
  }

  loadProtoV4File(file: File) {
    const convertValueToNumber = (value: string) => {
      return Number(value.replace(',', '.'));
    };
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawParameters: string[] = [];
      const result = e.target?.result as string;
      if (!result) {
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
        cable_amount: convertValueToNumber(rawParameters[5]),
        temperature_reference: convertValueToNumber(rawParameters[7]),
        parameter: convertValueToNumber(rawParameters[9]),
        cra: convertValueToNumber(rawParameters[11]),
        temp_load: convertValueToNumber(rawParameters[13]),
        wind_load: convertValueToNumber(rawParameters[15]),
        frost_load: convertValueToNumber(rawParameters[17]),
        project_name: rawParameters[19]
      };
      Papa.parse(csvSupports as string, {
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
                num: convertValueToNumber(support.num),
                portée: convertValueToNumber(support.portée),
                angle_ligne: convertValueToNumber(support.angle_ligne),
                ctr_poids: convertValueToNumber(support.ctr_poids),
                long_bras: convertValueToNumber(support.long_bras),
                long_ch: convertValueToNumber(support.long_ch),
                pds_ch: convertValueToNumber(support.pds_ch),
                surf_ch: convertValueToNumber(support.surf_ch),
                alt_acc: convertValueToNumber(support.alt_acc),
                suspension: support.suspension === 'FAUX' ? false : true,
                ch_en_V: support.ch_en_V === 'FAUX' ? false : true
              };
            }
          );
          const study = await this.studiesService.createStudyFromProtoV4(
            supports,
            parameters
          );
          this.newStudies.set([...this.newStudies(), study]);
        }) as (jsonResults: Papa.ParseResult<Record<string, string>>) => void
      });
    };
    reader.readAsText(file);
  }

  loadFiles(event: Event) {
    this.loading.set(true);
    this.newStudies.set([]);
    const files = (event.target as HTMLInputElement).files;
    const filesArray = Array.from(files ?? []).filter(
      (file) => file.type === 'text/csv' || file.type === 'application/json'
    );

    if (filesArray) {
      for (const file of filesArray) {
        if (file.type === 'text/csv') {
          this.loadProtoV4File(file);
        } else if (file.type === 'application/json') {
          this.loadAppFile(file);
        }
      }
      this.loading.set(false);
    } else {
      this.loading.set(false);
    }
  }
}
