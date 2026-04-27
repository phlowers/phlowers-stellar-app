/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable, signal } from '@angular/core';
import { isNil } from 'lodash';
import { Section, Study, Support } from '@shared/domain';
import { SectionService } from '@services/section/section.service';
import { createEmptySection, createEmptySupport } from '@shared/domain/helpers/sections.helpers';
import { ImportAdapter, ImportError, UUIDCollisionResolver } from '@shared/import/domain/import-contracts.interfaces';
import { NotificationService } from '@services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { hasSupportsBoundsErrors } from '@features/study/presentation/components/sections-tab/newSectionModal/newSectionModal.constants';
import { sectionImportErrors, importSuccessDetail } from './section-import.constantes';

// ---------------------------------------------------------------------------
// Validation helpers (mirrors newSectionModal logic)
// ---------------------------------------------------------------------------

/**
 * Returns `true` if all mandatory fields of the section are filled.
 * Mirrors the `areAllRequiredFieldsFilled` logic in `NewSectionModalComponent`.
 */
function areAllRequiredFieldsFilled(section: Section): boolean {
  const nameCondition = !!section.name.trim();
  const typeCondition = !!section.type;
  const cablesAmountCondition = !!section.cables_amount;
  const cableNameCondition = !!section.cable_name;
  const supportsNumberCondition = section.supports.every((s) => !isNil(s.number));
  const supportsSpanLengthCondition = section.supports.every(
    (s, i) => !isNil(s.spanLength) || i === section.supports.length - 1
  );
  const supportsSpanAngleCondition = section.supports.every((s) => !isNil(s.spanAngle));
  const supportsChainLengthCondition = section.supports.every((s) => !isNil(s.chainLength));
  const supportsAttachmentHeightCondition = section.supports.every((s) => !isNil(s.attachmentHeight));

  return (
    nameCondition &&
    typeCondition &&
    cablesAmountCondition &&
    cableNameCondition &&
    supportsNumberCondition &&
    supportsSpanLengthCondition &&
    supportsSpanAngleCondition &&
    supportsChainLengthCondition &&
    supportsAttachmentHeightCondition
  );
}

// ---------------------------------------------------------------------------
// Error catalog
// ---------------------------------------------------------------------------

// Re-export the error catalog so consumers can import from a single entry point.
export { sectionImportErrors } from './section-import.constantes';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Service responsible for all Section JSON import business logic.
 *
 * Implements {@link ImportAdapter} for `Section` entities.
 * Accepts `.json` files containing a single serialized section object.
 *
 * ### Study context
 * Before processing files, the host component **must** call
 * {@link SectionImportService.setStudyContext} with the active study so the
 * service can check collisions and persist the imported section.
 *
 * ### Pipeline stages performed internally
 * - **FILE_VALIDATION**: checks `.json` extension.
 * - **DECODING/PARSING**: reads raw text and parses JSON.
 * - **VALIDATION**: required fields + supports bounds (mirrors modal validation).
 * - **COLLISION_CHECK**: detects whether the UUID already exists in the study.
 * - **PERSISTENCE**: calls {@link SectionService.createOrUpdateSection}.
 */
@Injectable()
export class SectionImportService implements ImportAdapter<Section> {
  /** Writable signal holding the active study; must be set before processing. */
  readonly studyContext = signal<Study | null>(null);

  private readonly sectionService = inject(SectionService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);

  // ---------------------------------------------------------------------------
  // Context setter
  // ---------------------------------------------------------------------------

  /**
   * Sets the study context required for collision detection and persistence.
   * Must be called by the host component before triggering imports.
   *
   * @param study - The currently active study.
   */
  setStudyContext(study: Study): void {
    this.studyContext.set(study);
  }

  // ---------------------------------------------------------------------------
  // ImportAdapter implementation
  // ---------------------------------------------------------------------------

  /**
   * Returns `true` if the file has a `.json` extension.
   */
  accepts(file: File): boolean {
    return file.name.toLowerCase().endsWith('.json');
  }

  /**
   * Checks whether the UUID encoded in the JSON file collides with an existing
   * section in the current study.
   *
   * @returns Collision info `{ uuid, label }` or `null` if no collision.
   */
  async checkCollision(file: File): Promise<{ uuid: string; label: string } | null> {
    const study = this.studyContext();
    if (!study) return null;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const uuid = typeof parsed['uuid'] === 'string' ? parsed['uuid'].trim() : '';
      if (!uuid) return null;
      const existing = study.sections.find((s) => s.uuid === uuid);
      if (!existing) return null;
      return { uuid, label: existing.name };
    } catch {
      // If we cannot parse at check time, let processFile handle the error properly.
      return null;
    }
  }

  /**
   * Runs the full import pipeline for the given JSON file.
   *
   * @returns The created or updated `Section`, or `null` if the user rejected a
   *   UUID collision prompt.
   * @throws An {@link ImportError}-shaped object on any unrecoverable failure.
   */
  async processFile(file: File, collisionResolver: UUIDCollisionResolver): Promise<Section | null> {
    const study = this.studyContext();
    if (!study) {
      const error: ImportError = {
        code: 'PERSISTENCE_ERROR',
        message: sectionImportErrors.sectionImportError,
        stage: 'PERSISTENCE'
      };
      throw error;
    }

    // Stage: DECODING + PARSING
    const section = await this.parseJsonFile(file);

    // Stage: VALIDATION
    this.validateSection(section);

    // Stage: COLLISION_CHECK + PERSISTENCE
    return this.persistSection(section, study, collisionResolver);
  }

  // ---------------------------------------------------------------------------
  // Private — parsing
  // ---------------------------------------------------------------------------

  private async parseJsonFile(file: File): Promise<Section> {
    let text: string;
    try {
      text = await file.text();
    } catch (err: unknown) {
      this.logger.error('Error reading section file', err);
      const error: ImportError = {
        code: 'FILE_READ_ERROR',
        message: sectionImportErrors.fileReadError,
        stage: 'DECODING',
        cause: err
      };
      throw error;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch (err: unknown) {
      this.logger.error('Error parsing section JSON', err);
      const error: ImportError = {
        code: 'FILE_PARSE_ERROR',
        message: sectionImportErrors.fileParseError,
        stage: 'PARSING',
        cause: err
      };
      throw error;
    }

    return this.mapToSection(parsed);
  }

  // ---------------------------------------------------------------------------
  // Private — mapping
  // ---------------------------------------------------------------------------

  private mapToSection(raw: Record<string, unknown>): Section {
    const supports = this.mapSupports(raw['supports']);
    return {
      ...createEmptySection(),
      ...raw,
      supports
    } as Section;
  }

  private mapSupports(rawSupports: unknown): Support[] {
    if (!Array.isArray(rawSupports) || rawSupports.length === 0) {
      // Fall back to the default pair created by createEmptySection.
      return [];
    }
    return (rawSupports as unknown[]).map((s) => ({
      ...createEmptySupport(),
      ...(s as Record<string, unknown>)
    })) as Support[];
  }

  // ---------------------------------------------------------------------------
  // Private — validation
  // ---------------------------------------------------------------------------

  private validateSection(section: Section): void {
    if (!areAllRequiredFieldsFilled(section)) {
      const error: ImportError = {
        code: 'VALIDATION_ERROR',
        message: sectionImportErrors.validationErrorRequiredFields,
        stage: 'VALIDATION'
      };
      throw error;
    }

    if (hasSupportsBoundsErrors(section)) {
      const error: ImportError = {
        code: 'VALIDATION_ERROR',
        message: sectionImportErrors.validationErrorSupportsBounds,
        stage: 'VALIDATION'
      };
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Private — persistence
  // ---------------------------------------------------------------------------

  private async persistSection(
    section: Section,
    study: Study,
    collisionResolver: UUIDCollisionResolver
  ): Promise<Section | null> {
    const existingSection = study.sections.find((s) => s.uuid === section.uuid);

    if (existingSection) {
      const shouldReplace = await collisionResolver(section.uuid, existingSection.name);
      if (!shouldReplace) {
        return null;
      }
      // Delete the existing section first, then re-create below.
      try {
        await this.sectionService.deleteSection(study, existingSection);
      } catch (err: unknown) {
        this.logger.error('Error deleting existing section', err);
        const error: ImportError = {
          code: 'PERSISTENCE_ERROR',
          message: sectionImportErrors.sectionDeleteError,
          stage: 'PERSISTENCE',
          cause: err
        };
        throw error;
      }
    }

    try {
      await this.sectionService.createOrUpdateSection(study, section);
    } catch (err: unknown) {
      this.logger.error('Error persisting section', err);
      const error: ImportError = {
        code: 'PERSISTENCE_ERROR',
        message: sectionImportErrors.sectionImportError,
        stage: 'PERSISTENCE',
        cause: err
      };
      throw error;
    }

    this.notificationService.success(importSuccessDetail);
    return section;
  }
}
