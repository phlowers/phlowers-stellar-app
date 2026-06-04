/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { ProtoV4Parameters, ProtoV4Support, Section, Study, Support } from '@shared/domain';
import Papa from 'papaparse';
import { StudiesService } from '@services/studies/studies.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { createEmptyStudy } from '@shared/domain/helpers/study.helpers';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { NotificationService } from '@services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { ImportAdapter, UUIDCollisionResolver } from '@shared/import/domain/import-contracts';
import { studyImportErrors, importSuccessDetail } from './study-import.errors';
import { parseISO88591Base64, formatProtoV4Support, formatProtoV4Parameters } from './study-import.helpers';

/**
 * Service responsible for all Study import business logic.
 *
 * Implements `ImportAdapter` for `Study` entities, supporting two file formats:
 * - `.clst` — proprietary app format (base64-encoded JSON)
 * - `.csv`  — Proto V4 format (semicolon-delimited CSV with extra parameter columns)
 *
 * This service is the single source of truth for:
 * - file type acceptance
 * - file reading and decoding
 * - CSV/JSON parsing
 * - domain entity construction
 * - UUID collision detection and resolution
 * - persistence via `StudiesService`
 * - success notifications
 */
@Injectable({
  providedIn: 'root'
})
export class StudyImportService implements ImportAdapter<Study> {
  private readonly studiesService = inject(StudiesService);
  private readonly notificationService = inject(NotificationService);
  private readonly cablesService = inject(CablesService);
  private readonly logger = inject(LoggerService);

  // ---------------------------------------------------------------------------
  // ImportAdapter implementation
  // ---------------------------------------------------------------------------

  /**
   * Returns `true` if the file is a supported import format (.csv or .clst).
   */
  accepts(file: File): boolean {
    return file.type === 'text/csv' || file.name.endsWith('.clst');
  }

  /**
   * Checks whether a `.clst` file encodes a UUID that already exists in the
   * local database. Always returns `null` for CSV files (no pre-existing UUID).
   *
   * @returns Collision info or `null` if no collision is detected.
   */
  async checkCollision(file: File): Promise<{ uuid: string; label: string } | null> {
    if (!file.name.endsWith('.clst')) {
      return null;
    }
    try {
      const textContent = await file.text();
      const decoded = atob(textContent.trim());
      const parsed = JSON.parse(decoded) as Record<string, unknown>;
      const uuid = typeof parsed['uuid'] === 'string' ? parsed['uuid'].trim() : '';
      if (!uuid) return null;
      const existing = await this.studiesService.getStudy(uuid);
      if (!existing) return null;
      return { uuid, label: existing.title };
    } catch {
      return null;
    }
  }

  /**
   * Runs the full import pipeline for the given file.
   *
   * @returns The imported `Study`, or `null` if the user rejected a UUID collision prompt.
   * @throws An error with a key from `studyImportErrors` on any unrecoverable failure.
   */
  async processFile(file: File, collisionResolver: UUIDCollisionResolver): Promise<Study | null> {
    if (file.type === 'text/csv') {
      return this.loadProtoV4File(file);
    }
    return this.loadAppFile(file, collisionResolver);
  }

  // ---------------------------------------------------------------------------
  // Public methods (used by the component delegation layer and tests)
  // ---------------------------------------------------------------------------

  /**
   * Finds a cable by name in the cable catalog.
   * @param conductor - The cable name to look up (exact or space-normalized)
   * @returns The matching cable name, or `null` if not found.
   */
  findCableInDatabase(conductor: string): Promise<string | null> {
    return this.cablesService.getCables().then((cables) => {
      const cable = cables?.find((cable) => cable.name === conductor || cable.name.replace(' ', '') === conductor);
      return cable?.name ?? null;
    });
  }

  /**
   * Reads and imports a `.clst` file (base64-encoded JSON study).
   *
   * @param file - The `.clst` file to import.
   * @param collisionResolver - Callback to ask the user whether to replace an
   *   existing study when a UUID collision is detected.
   * @returns The created `Study`, or `null` if the user rejected the collision prompt.
   */
  async loadAppFile(file: File, collisionResolver: UUIDCollisionResolver): Promise<Study | null> {
    try {
      const result = await file.text();
      return await this.processAppFileContent(result, collisionResolver);
    } catch (error: unknown) {
      if (error instanceof Error && error.message in studyImportErrors) {
        throw error;
      } else {
        this.logger.error('Error importing study', error);
        throw new Error('studyImportError');
      }
    }
  }

  /**
   * Reads and imports a `.csv` Proto V4 file.
   *
   * @param file - The CSV file to import.
   * @returns The created `Study`.
   */
  loadProtoV4File(file: File): Promise<Study> {
    return new Promise<Study>((resolve, reject) => {
      const fileName = file.name;
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const result = e.target?.result as string;
          await this.processProtoV4FileContent(result, fileName, resolve, reject);
        } catch (error: unknown) {
          if (error instanceof Error && error.message in studyImportErrors) {
            reject(error);
          } else {
            this.logger.error('Error importing study', error);
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

  // ---------------------------------------------------------------------------
  // Private — CLST processing
  // ---------------------------------------------------------------------------

  private decodeBase64FromText(textContent: string): string {
    try {
      return atob(textContent);
    } catch (error: unknown) {
      this.logger.error('Error decoding base64', error);
      throw new Error('fileDecodeError');
    }
  }

  private parseJsonContent(jsonContent: string): Record<string, unknown> {
    try {
      return JSON.parse(jsonContent) as Record<string, unknown>;
    } catch (error: unknown) {
      this.logger.error('Error parsing JSON', error);
      throw new Error('fileParseError');
    }
  }

  private transformSupports(supports: Support[]): Support[] {
    return supports.map((support: Support) => ({
      ...createEmptySupport(),
      ...support
    }));
  }

  private transformSections(sections: unknown[]): (Section & { supports: Support[] })[] {
    return sections.map((section: unknown) => {
      const sectionObj = section as Section;
      return {
        ...createEmptySection(),
        ...sectionObj,
        supports: Array.isArray(sectionObj.supports) ? this.transformSupports(sectionObj.supports) : []
      };
    });
  }

  private buildStudyFromParsedData(parsedResult: Record<string, unknown>): Study {
    const sections = Array.isArray(parsedResult.sections) ? this.transformSections(parsedResult.sections) : [];
    const uuid = typeof parsedResult['uuid'] === 'string' ? parsedResult['uuid'].trim() : parsedResult['uuid'];
    return {
      ...createEmptyStudy(),
      ...parsedResult,
      uuid,
      sections
    } as Study;
  }

  /**
   * Handles UUID collision detection and persistence for a CLST-imported study.
   *
   * @returns The created `Study`, or `null` if the user rejected the collision prompt.
   */
  private async persistAppStudy(study: Study, collisionResolver: UUIDCollisionResolver): Promise<Study | null> {
    const hasValidUuid = study.uuid && study.uuid.trim() !== '';

    if (hasValidUuid) {
      const existingStudy = await this.studiesService.getStudy(study.uuid);
      if (existingStudy) {
        const shouldReplace = await collisionResolver(study.uuid, existingStudy.title);
        if (!shouldReplace) {
          return null;
        }
        await this.studiesService.deleteStudy(study.uuid);
        try {
          const uuid = await this.studiesService.createStudy(study, study.uuid);
          const createdStudy = await this.studiesService.getStudy(uuid);
          if (!createdStudy) {
            await this.studiesService.createStudy(existingStudy, existingStudy.uuid).catch((restoreError: unknown) => {
              this.logger.error('Failed to restore study after failed replacement', restoreError);
            });
            return null;
          }
          this.notificationService.success(importSuccessDetail);
          return createdStudy;
        } catch (error: unknown) {
          await this.studiesService.createStudy(existingStudy, existingStudy.uuid).catch((restoreError: unknown) => {
            this.logger.error('Failed to restore study after failed replacement', restoreError);
          });
          throw error;
        }
      }
    }

    const uuid = await this.studiesService.createStudy(study, hasValidUuid ? study.uuid : undefined);
    const createdStudy = await this.studiesService.getStudy(uuid);

    if (!createdStudy) {
      return null;
    }

    this.notificationService.success(importSuccessDetail);
    return createdStudy;
  }

  private async processAppFileContent(result: string, collisionResolver: UUIDCollisionResolver): Promise<Study | null> {
    const decodedContent = this.decodeBase64FromText(result);
    const parsedResult = this.parseJsonContent(decodedContent);
    const newStudy = this.buildStudyFromParsedData(parsedResult);
    return this.persistAppStudy(newStudy, collisionResolver);
  }

  // ---------------------------------------------------------------------------
  // Private — ProtoV4 (CSV) processing
  // ---------------------------------------------------------------------------

  private decodeBase64Content(dataUrl: string): string {
    const base64Content = dataUrl.replace('data:text/csv;base64,', '');

    try {
      return parseISO88591Base64(base64Content);
    } catch {
      try {
        return atob(base64Content);
      } catch (decodeError: unknown) {
        this.logger.error('Error decoding base64', decodeError);
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

  private async validateCable(conductor: string): Promise<string> {
    const cable = await this.findCableInDatabase(conductor);
    if (!cable) {
      throw new Error('cableNotFound');
    }
    return cable;
  }

  private handlePapaParseComplete(
    jsonResults: Papa.ParseResult<Record<string, string>>,
    parameters: ProtoV4Parameters,
    resolve: (study: Study) => void,
    reject: (error: Error) => void
  ): void {
    if (jsonResults.errors && jsonResults.errors.length > 0) {
      this.logger.error('Error parsing file', jsonResults.errors);
      reject(new Error('fileParseError'));
      return;
    }

    const supports: ProtoV4Support[] = jsonResults.data.filter((support) => support.num).map(formatProtoV4Support);

    this.studiesService
      .createStudyFromProtoV4(supports, parameters)
      .then((study) => {
        this.notificationService.success(importSuccessDetail);
        resolve(study);
      })
      .catch((parseError: unknown) => {
        if (parseError instanceof Error && parseError.message in studyImportErrors) {
          reject(parseError);
        } else {
          reject(new Error('fileParseError'));
        }
      });
  }

  private async processProtoV4FileContent(
    result: string,
    fileName: string,
    resolve: (study: Study) => void,
    reject: (error: Error) => void
  ): Promise<void> {
    if (!result) {
      this.logger.error('Error reading file', fileName);
      throw new Error('fileReadError');
    }

    const decodedContent = this.decodeBase64Content(result);
    const { csvSupports, rawParameters } = this.parseCsvContent(decodedContent);
    const parameters = formatProtoV4Parameters(rawParameters, fileName);

    const cable = await this.validateCable(parameters.conductor);
    parameters.conductor = cable;

    Papa.parse(csvSupports, {
      header: true,
      skipEmptyLines: true,
      complete: (jsonResults: Papa.ParseResult<Record<string, string>>) => {
        this.handlePapaParseComplete(jsonResults, parameters, resolve, reject);
      }
    });
  }
}
