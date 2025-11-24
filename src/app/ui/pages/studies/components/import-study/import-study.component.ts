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
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CablesService } from '@src/app/core/services/cables/cables.service';
import { convertStringToNumber } from '@ui/shared/helpers/convertStringToNumber';
import { createEmptyStudy } from '../new-study-modal/new-study-modal.component';
import {
  createEmptySection,
  createEmptySupport
} from '@src/app/core/services/sections/helpers';
import { Section } from '@src/app/core/data/database/interfaces/section';
import { Support } from '@src/app/core/data/database/interfaces/support';

/**
 * Parse a ISO 8859-1 base64 string
 * @param str The base64 string to parse
 * @returns The parsed string
 */
function parseISO88591Base64(str: string) {
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(str), function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );
}

const formatProtoV4Support = (support: Record<string, string>) => {
  return {
    ...support,
    nom: support.nom,
    num: support.num,
    portée: convertStringToNumber(support.portée),
    angle_ligne: convertStringToNumber(support.angle_ligne),
    ctr_poids: convertStringToNumber(support.ctr_poids),
    long_bras: convertStringToNumber(support.long_bras),
    long_ch: convertStringToNumber(support.long_ch),
    pds_ch: convertStringToNumber(support.pds_ch),
    surf_ch: convertStringToNumber(support.surf_ch),
    alt_acc: convertStringToNumber(support.alt_acc),
    suspension: support.suspension === 'FAUX' ? false : true,
    ch_en_V: support.ch_en_V === 'FAUX' ? false : true
  };
};

const formatProtoV4Parameters = (
  rawParameters: string[],
  fileName: string
): ProtoV4Parameters => {
  return {
    conductor: rawParameters[3],
    cable_amount: convertStringToNumber(rawParameters[5]),
    temperature_reference: convertStringToNumber(rawParameters[7]),
    parameter: convertStringToNumber(rawParameters[9]),
    cra: convertStringToNumber(rawParameters[11]),
    temp_load: convertStringToNumber(rawParameters[13]),
    wind_load: convertStringToNumber(rawParameters[15]),
    frost_load: convertStringToNumber(rawParameters[17]),
    section_name: rawParameters[19],
    project_name: fileName.replace('.csv', '')
  };
};

const protoV4ErrorMessage = {
  severity: 'error',
  summary: $localize`Error`,
  detail: $localize`Error importing study`,
  life: 3000
};

const protoV4SuccessMessage = {
  severity: 'success',
  summary: $localize`Success`,
  detail: $localize`Study imported successfully`,
  life: 3000
};

@Component({
  selector: 'app-import-study',
  imports: [
    IconComponent,
    DividerModule,
    RouterLink,
    ButtonComponent,
    ToastModule
  ],
  templateUrl: './import-study.component.html',
  styleUrl: './import-study.component.scss'
})
export class ImportStudyComponent {
  loading = signal<boolean>(false);
  newStudies = signal<Study[]>([]);

  constructor(
    private readonly studiesService: StudiesService,
    private readonly messageService: MessageService,
    private readonly cablesService: CablesService
  ) {}

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
      const studyBase64 = atob(result);
      const parsedResult = JSON.parse(studyBase64);
      const newStudy = {
        ...createEmptyStudy(),
        ...parsedResult,
        sections: parsedResult.sections
          ? parsedResult.sections.map((section: Section) => {
              return {
                ...createEmptySection(),
                ...section,
                supports: section.supports.map((support: Support) => {
                  return {
                    ...createEmptySupport(),
                    ...support
                  };
                })
              };
            })
          : []
      };
      const uuid = await this.studiesService.createStudy(newStudy);
      const study = await this.studiesService.getStudy(uuid);
      if (!study) {
        return;
      }
      this.newStudies.set([...this.newStudies(), study]);
    };
    reader.readAsText(file);
  }

  checkIfCableExists(conductor: string): Promise<boolean> {
    return this.cablesService.getCables().then((cables) => {
      return !!cables?.find((cable) => cable.name === conductor);
    });
  }

  loadProtoV4File(file: File) {
    const fileName = file.name;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const rawParameters: string[] = [];
        const result = e.target?.result as string;

        let parsed: string;
        try {
          parsed = parseISO88591Base64(
            result.replace('data:text/csv;base64,', '')
          );
        } catch (_error: unknown) {
          console.error('Error decoding base64', _error);
          parsed = atob(result.replace('data:text/csv;base64,', ''));
        }
        if (!result) {
          this.messageService.add(protoV4ErrorMessage);
          return;
        }
        const csvSupports = parsed
          .split('\n')
          .map((line: string) => {
            const parts = line.split(';');
            rawParameters.push(parts.pop()?.replace('\r', '') ?? '');
            parts.pop();
            return parts.join(';');
          })
          .filter((line: string) => line.trim() !== '')
          .join('\n');
        const parameters = formatProtoV4Parameters(rawParameters, fileName);
        const cableExists = await this.checkIfCableExists(parameters.conductor);
        if (!cableExists) {
          this.messageService.add({
            severity: 'error',
            summary: $localize`Error`,
            detail: $localize`Cable not found in database: ${parameters.conductor}`
          });
          return;
        }
        Papa.parse(csvSupports as string, {
          header: true,
          skipEmptyLines: true,
          complete: (async (
            jsonResults: Papa.ParseResult<Record<string, string>>
          ) => {
            const supports: ProtoV4Support[] = jsonResults.data
              .filter((support) => support.num)
              .map(formatProtoV4Support);
            const study = await this.studiesService.createStudyFromProtoV4(
              supports,
              parameters
            );
            this.newStudies.set([...this.newStudies(), study]);
            this.messageService.add(protoV4SuccessMessage);
          }) as (jsonResults: Papa.ParseResult<Record<string, string>>) => void
        });
      } catch (_error: unknown) {
        console.error('Error importing study', _error);
        this.messageService.add(protoV4ErrorMessage);
      }
    };
    reader.onerror = () => {
      this.messageService.add(protoV4ErrorMessage);
    };
    reader.readAsDataURL(file);
  }

  loadFiles(event: Event) {
    this.loading.set(true);
    this.newStudies.set([]);
    const files = (event.target as HTMLInputElement).files;
    const filesArray = Array.from(files ?? []).filter(
      (file) => file.type === 'text/csv' || file.name.endsWith('.clst')
    );

    if (filesArray) {
      for (const file of filesArray) {
        if (file.type === 'text/csv') {
          this.loadProtoV4File(file);
        } else if (file.name.endsWith('.clst')) {
          this.loadAppFile(file);
        }
      }
      this.loading.set(false);
    } else {
      this.loading.set(false);
    }
  }
}
