/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@core/services/logger/logger.service';
import {
  IMPORT_ADAPTER_TOKEN,
  ImportError,
  ImportErrorCode,
  ImportOutcome,
  ImportPipelineStage,
  UUIDCollisionResolver
} from '@shared/import/domain/import-contracts';

/**
 * Generic import engine that orchestrates the import pipeline for any context
 * (Study, Section, …) by delegating to a context-specific `ImportAdapter`.
 *
 * ### Pipeline stages per file (in order)
 * 1. **FILE_VALIDATION** — `adapter.accepts(file)`
 * 2. **COLLISION_CHECK** — `adapter.checkCollision(file)` + `collisionResolver`
 * 3. **DECODING → PARSING → VALIDATION → MAPPING → PERSISTENCE**
 *    — `adapter.processFile(file, effectiveResolver)`
 * 4. **RESULT_REPORTING** — returns an `ImportOutcome` per file
 *
 * Files are processed **sequentially** to ensure predictable UX and correct
 * collision handling (one confirmation dialog at a time).
 *
 * This service must be provided at the component level together with an
 * `IMPORT_ADAPTER_TOKEN` binding:
 * ```typescript
 * providers: [
 *   GenericImportEngineService,
 *   { provide: IMPORT_ADAPTER_TOKEN, useClass: StudyImportService }
 * ]
 * ```
 */
@Injectable()
export class GenericImportEngineService {
  private readonly adapter = inject(IMPORT_ADAPTER_TOKEN);
  private readonly logger = inject(LoggerService);

  /**
   * Processes a list of files sequentially through the import pipeline.
   *
   * @param files - The files to import.
   * @param collisionResolver - UI callback invoked when a UUID collision is
   *   detected. Resolves to `true` if the user accepts replacement, `false`
   *   to skip the file.
   * @returns One `ImportOutcome` per file, in the same order.
   */
  async processFiles(files: readonly File[], collisionResolver: UUIDCollisionResolver): Promise<ImportOutcome[]> {
    const outcomes: ImportOutcome[] = [];
    for (const file of files) {
      outcomes.push(await this.processSingleFile(file, collisionResolver));
    }
    return outcomes;
  }

  // ---------------------------------------------------------------------------
  // Private — pipeline orchestration
  // ---------------------------------------------------------------------------

  private async processSingleFile(file: File, collisionResolver: UUIDCollisionResolver): Promise<ImportOutcome> {
    // Stage: FILE_VALIDATION
    if (!this.adapter.accepts(file)) {
      return {
        fileName: file.name,
        status: 'error',
        error: {
          code: 'FILE_TYPE_NOT_ALLOWED',
          message: $localize`File type not allowed`,
          stage: 'FILE_VALIDATION'
        }
      };
    }

    try {
      // Stage: COLLISION_CHECK
      // Ask the user upfront if a conflicting entity already exists.
      // If the user rejects, we skip the file without running the full pipeline.
      const collision = await this.adapter.checkCollision(file);
      let effectiveResolver: UUIDCollisionResolver;

      if (collision === null) {
        // No collision detected at check time; forward the real resolver in case
        // the adapter encounters a late collision during persistence.
        effectiveResolver = collisionResolver;
      } else {
        const accepted = await collisionResolver(collision.uuid, collision.label);
        if (!accepted) {
          return { fileName: file.name, status: 'skipped' };
        }
        // The user already confirmed the replacement; pass a pre-approved resolver
        // so processFile does not prompt again for the same collision.
        effectiveResolver = () => Promise.resolve(true);
      }

      // Stages: DECODING → PARSING → VALIDATION → MAPPING → PERSISTENCE
      const entity = await this.adapter.processFile(file, effectiveResolver);

      if (entity === null) {
        // The adapter skipped the file (e.g. late collision rejected inside processFile).
        return { fileName: file.name, status: 'skipped' };
      }

      return this.buildSuccessOutcome(file.name, entity);
    } catch (error: unknown) {
      this.logger.warn('Import pipeline error for file', file.name, error);
      return {
        fileName: file.name,
        status: 'error',
        error: this.toImportError(error)
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Private — outcome builders
  // ---------------------------------------------------------------------------

  private buildSuccessOutcome(fileName: string, entity: unknown): ImportOutcome {
    const meta = entity as Record<string, unknown>;
    const entityId = typeof meta['uuid'] === 'string' ? meta['uuid'] : undefined;
    let entityLabel: string | undefined;
    if (typeof meta['title'] === 'string') {
      entityLabel = meta['title'];
    } else if (typeof meta['name'] === 'string') {
      entityLabel = meta['name'];
    }

    return { fileName, status: 'success', entityId, entityLabel };
  }

  /** Maps well-known error codes to the pipeline stage where they originate. */
  private static readonly ERROR_CODE_STAGE_MAP: Record<string, ImportPipelineStage> = {
    FILE_TYPE_NOT_ALLOWED: 'FILE_VALIDATION',
    FILE_READ_ERROR: 'DECODING',
    FILE_DECODE_ERROR: 'DECODING',
    FILE_PARSE_ERROR: 'PARSING',
    VALIDATION_ERROR: 'VALIDATION',
    MAPPING_ERROR: 'MAPPING',
    UUID_COLLISION_REJECTED: 'COLLISION_CHECK',
    PERSISTENCE_ERROR: 'PERSISTENCE'
  };

  private toImportError(error: unknown): ImportError {
    if (this.isImportError(error)) {
      return error;
    }
    if (error instanceof Error) {
      const stage: ImportPipelineStage =
        GenericImportEngineService.ERROR_CODE_STAGE_MAP[error.message] ?? 'PERSISTENCE';
      return {
        code: error.message as ImportErrorCode,
        message: error.message,
        stage,
        cause: error
      };
    }
    return {
      code: 'PERSISTENCE_ERROR',
      message: String(error),
      stage: 'PERSISTENCE',
      cause: error
    };
  }

  private isImportError(error: unknown): error is ImportError {
    if (typeof error !== 'object' || error === null) return false;
    const e = error as Record<string, unknown>;
    return typeof e['code'] === 'string' && typeof e['message'] === 'string' && typeof e['stage'] === 'string';
  }
}
