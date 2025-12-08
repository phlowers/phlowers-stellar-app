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
import { ConfirmationService, MessageService } from 'primeng/api';
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

const errors = {
  cableNotFound: $localize`Cable not found in database`,
  fileTypeNotAllowed: $localize`File type not allowed`,
  studyImportError: $localize`Error importing study`,
  studyDeleteError: $localize`Error deleting study`,
  fileDecodeError: $localize`Error decoding file`,
  fileParseError: $localize`Error parsing file`,
  fileReadError: $localize`Error reading file`
};

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

const importErrorMessage = (type: keyof typeof errors) => {
  return {
    severity: 'error',
    summary: $localize`Error`,
    detail: errors[type] || $localize`Error importing study`,
    life: 3000
  };
};

const importSuccessMessage = {
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
  erroredFiles = signal<string[]>([]);

  constructor(
    private readonly studiesService: StudiesService,
    private readonly messageService: MessageService,
    private readonly cablesService: CablesService,
    private readonly confirmationService: ConfirmationService
  ) {}

  async deleteStudy(uuid: string) {
    await this.studiesService.deleteStudy(uuid);
    this.newStudies.set(
      this.newStudies().filter((study) => study.uuid !== uuid)
    );
  }

  private decodeBase64FromText(textContent: string): string {
    try {
      return atob(textContent);
    } catch (error: unknown) {
      console.error('Error decoding base64', error);
      throw new Error('fileDecodeError');
    }
  }

  private parseJsonContent(jsonContent: string): Record<string, unknown> {
    try {
      return JSON.parse(jsonContent) as Record<string, unknown>;
    } catch (error: unknown) {
      console.error('Error parsing JSON', error);
      throw new Error('fileParseError');
    }
  }

  private transformSupports(supports: Support[]): Support[] {
    return supports.map((support: Support) => ({
      ...createEmptySupport(),
      ...support
    }));
  }

  private transformSections(
    sections: unknown[]
  ): (Section & { supports: Support[] })[] {
    return sections.map((section: unknown) => {
      const sectionObj = section as Section;
      return {
        ...createEmptySection(),
        ...sectionObj,
        supports: Array.isArray(sectionObj.supports)
          ? this.transformSupports(sectionObj.supports)
          : []
      };
    });
  }

  private buildStudyFromParsedData(
    parsedResult: Record<string, unknown>
  ): Study {
    const sections = Array.isArray(parsedResult.sections)
      ? this.transformSections(parsedResult.sections)
      : [];

    return {
      ...createEmptyStudy(),
      ...parsedResult,
      sections
    } as Study;
  }

  private async createAndAddStudy(study: Study): Promise<void> {
    // Check if study with same UUID already exists
    const hasValidUuid = study.uuid && study.uuid.trim() !== '';
    if (hasValidUuid) {
      const shouldReplace = await this.promptIfStudyAlreadyExists(study.uuid);
      if (!shouldReplace) {
        return;
      }
    }

    // Only pass UUID if it's valid, otherwise let createStudy generate a new one
    const uuid = await this.studiesService.createStudy(
      study,
      hasValidUuid ? study.uuid : undefined
    );
    const createdStudy = await this.studiesService.getStudy(uuid);

    if (!createdStudy) {
      return;
    }

    this.newStudies.set([...this.newStudies(), createdStudy]);
    this.messageService.add(importSuccessMessage);
  }

  private async processAppFileContent(
    result: string,
    resolve: () => void
  ): Promise<void> {
    const decodedContent = this.decodeBase64FromText(result);
    const parsedResult = this.parseJsonContent(decodedContent);
    const newStudy = this.buildStudyFromParsedData(parsedResult);

    await this.createAndAddStudy(newStudy);
    resolve();
  }

  loadAppFile(file: File): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const result = e.target?.result as string;
          await this.processAppFileContent(result, resolve);
        } catch (error: unknown) {
          if (error instanceof Error && error.message in errors) {
            reject(error);
          } else {
            console.error('Error importing study', error);
            reject(new Error('studyImportError'));
          }
        }
      };

      reader.onerror = (e) => {
        console.error('Error reading file', e);
        reject(new Error('fileReadError'));
      };

      reader.readAsText(file);
    });
  }

  checkIfCableExists(conductor: string): Promise<boolean> {
    return this.cablesService.getCables().then((cables) => {
      return !!cables?.find((cable) => cable.name === conductor);
    });
  }

  async promptIfStudyAlreadyExists(uuid: string): Promise<boolean> {
    const study = await this.studiesService.getStudy(uuid);
    if (!study) {
      return true;
    }
    return await new Promise((resolve) =>
      this.confirmationService.confirm({
        key: 'positionDialog',
        message: $localize`Study ${study.title} already exists. Do you want to replace it?`,
        accept: async () => {
          await this.studiesService.deleteStudy(uuid);
          resolve(true);
        },
        reject: () => {
          resolve(false);
        },
        acceptLabel: $localize`Yes`,
        rejectLabel: $localize`No`
      })
    );
  }

  private decodeBase64Content(dataUrl: string): string {
    const base64Content = dataUrl.replace('data:text/csv;base64,', '');

    try {
      return parseISO88591Base64(base64Content);
    } catch {
      try {
        return atob(base64Content);
      } catch (decodeError: unknown) {
        console.error('Error decoding base64', decodeError);
        throw new Error('fileDecodeError');
      }
    }
  }

  private parseCsvContent(parsedContent: string): {
    csvSupports: string;
    rawParameters: string[];
  } {
    const rawParameters: string[] = [];

    const csvSupports = parsedContent
      .split('\n')
      .map((line: string) => {
        const parts = line.split(';');
        rawParameters.push(parts.pop()?.replace('\r', '') ?? '');
        parts.pop();
        return parts.join(';');
      })
      .filter((line: string) => line.trim() !== '')
      .join('\n');

    return { csvSupports, rawParameters };
  }

  private async validateCable(conductor: string): Promise<void> {
    const cableExists = await this.checkIfCableExists(conductor);
    if (!cableExists) {
      throw new Error('cableNotFound');
    }
  }

  private handlePapaParseComplete(
    jsonResults: Papa.ParseResult<Record<string, string>>,
    parameters: ProtoV4Parameters,
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    if (jsonResults.errors && jsonResults.errors.length > 0) {
      console.error('Error parsing file', jsonResults.errors);
      reject(new Error('fileParseError'));
      return;
    }

    const supports: ProtoV4Support[] = jsonResults.data
      .filter((support) => support.num)
      .map(formatProtoV4Support);

    this.studiesService
      .createStudyFromProtoV4(supports, parameters)
      .then((study) => {
        this.newStudies.set([...this.newStudies(), study]);
        this.messageService.add(importSuccessMessage);
        resolve();
      })
      .catch((parseError: unknown) => {
        if (parseError instanceof Error && parseError.message in errors) {
          reject(parseError);
        } else {
          reject(new Error('fileParseError'));
        }
      });
  }

  private async processProtoV4FileContent(
    result: string,
    fileName: string,
    resolve: () => void,
    reject: (error: Error) => void
  ): Promise<void> {
    if (!result) {
      console.error('Error reading file', fileName);
      throw new Error('fileReadError');
    }

    const decodedContent = this.decodeBase64Content(result);
    const { csvSupports, rawParameters } = this.parseCsvContent(decodedContent);
    const parameters = formatProtoV4Parameters(rawParameters, fileName);

    await this.validateCable(parameters.conductor);

    Papa.parse(csvSupports, {
      header: true,
      skipEmptyLines: true,
      complete: (jsonResults: Papa.ParseResult<Record<string, string>>) => {
        this.handlePapaParseComplete(jsonResults, parameters, resolve, reject);
      }
    });
  }

  loadProtoV4File(file: File) {
    return new Promise<void>((resolve, reject) => {
      const fileName = file.name;
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const result = e.target?.result as string;
          await this.processProtoV4FileContent(
            result,
            fileName,
            resolve,
            reject
          );
        } catch (error: unknown) {
          if (error instanceof Error && error.message in errors) {
            reject(error);
          } else {
            console.error('Error importing study', error);
            reject(new Error('studyImportError'));
          }
        }
      };

      reader.onerror = () => {
        reject(new Error('fileReadError'));
      };

      reader.readAsDataURL(file);
    });
  }

  private isValidFileType(file: File): boolean {
    return file.type === 'text/csv' || file.name.endsWith('.clst');
  }

  private separateValidAndInvalidFiles(files: FileList | null): {
    valid: File[];
    invalid: File[];
  } {
    const fileArray = Array.from(files ?? []);
    return {
      valid: fileArray.filter((file) => this.isValidFileType(file)),
      invalid: fileArray.filter((file) => !this.isValidFileType(file))
    };
  }

  private handleInvalidFiles(invalidFiles: File[]): void {
    if (invalidFiles.length === 0) {
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: $localize`Error`,
      detail: errors.fileTypeNotAllowed
    });
    this.erroredFiles.set([
      ...this.erroredFiles(),
      ...invalidFiles.map((file) => file.name)
    ]);
  }

  private getErrorType(error: unknown): keyof typeof errors {
    if (error instanceof Error && error.message in errors) {
      return error.message as keyof typeof errors;
    }
    return 'studyImportError';
  }

  private handleFileError(fileError: unknown, fileName: string): void {
    const errorType = this.getErrorType(fileError);
    console.error('Error importing file', fileError);
    this.messageService.add(importErrorMessage(errorType));
    this.erroredFiles.set([...this.erroredFiles(), fileName]);
  }

  private async processFile(file: File): Promise<void> {
    if (file.type === 'text/csv') {
      await this.loadProtoV4File(file);
    } else if (file.name.endsWith('.clst')) {
      await this.loadAppFile(file);
    }
  }

  private async processValidFiles(files: File[]): Promise<void> {
    for (const file of files) {
      try {
        await this.processFile(file);
      } catch (fileError: unknown) {
        this.handleFileError(fileError, file.name);
      }
    }
  }

  private handleLoadFilesError(error: unknown): void {
    console.error('Error in loadFiles', error);
    this.loading.set(false);
    const errorType = this.getErrorType(error);
    this.messageService.add(importErrorMessage(errorType));
  }

  async loadFiles(event: Event) {
    try {
      this.loading.set(true);
      const files = (event.target as HTMLInputElement).files;
      const { valid, invalid } = this.separateValidAndInvalidFiles(files);

      this.handleInvalidFiles(invalid);

      if (valid.length > 0) {
        await this.processValidFiles(valid);
      }

      this.loading.set(false);
    } catch (error: unknown) {
      this.handleLoadFilesError(error);
    }
  }
}
