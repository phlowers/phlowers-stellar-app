/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

/**
 * Ordered stages of the generic import pipeline.
 *
 * - FILE_VALIDATION  : check that the file type/extension is accepted.
 * - DECODING         : read the raw file content and decode it (base64, text…).
 * - PARSING          : parse raw bytes/string into structured data.
 * - VALIDATION       : apply business rules to the parsed payload.
 * - MAPPING          : transform validated payload into a domain entity.
 * - COLLISION_CHECK  : detect a UUID collision with an existing entity.
 * - PERSISTENCE      : save the entity to the storage layer.
 * - RESULT_REPORTING : emit a per-file ImportOutcome.
 */
export type ImportPipelineStage =
  | 'FILE_VALIDATION'
  | 'DECODING'
  | 'PARSING'
  | 'VALIDATION'
  | 'MAPPING'
  | 'COLLISION_CHECK'
  | 'PERSISTENCE'
  | 'RESULT_REPORTING';

// ---------------------------------------------------------------------------
// Error catalog
// ---------------------------------------------------------------------------

/**
 * Standardized error codes for the import pipeline.
 *
 * Adapters may extend this union with context-specific string literals
 * (e.g. `'CABLE_NOT_FOUND'` for the Study adapter).
 */
export type ImportErrorCode =
  | 'FILE_TYPE_NOT_ALLOWED'
  | 'FILE_READ_ERROR'
  | 'FILE_DECODE_ERROR'
  | 'FILE_PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'MAPPING_ERROR'
  | 'PERSISTENCE_ERROR'
  | 'UUID_COLLISION_REJECTED'
  | (string & NonNullable<unknown>);

/**
 * A structured import error carrying the pipeline stage it originated from.
 */
export interface ImportError {
  /** Canonical error code. */
  readonly code: ImportErrorCode;
  /** Human-readable localised message, ready for display. */
  readonly message: string;
  /** Pipeline stage where the error occurred. */
  readonly stage: ImportPipelineStage;
  /** Optional underlying cause for debugging. */
  readonly cause?: unknown;
}

// ---------------------------------------------------------------------------
// Per-file outcome
// ---------------------------------------------------------------------------

/**
 * Possible terminal statuses for a single file processed through the pipeline.
 *
 * - `success`  : entity created or updated successfully.
 * - `error`    : a fatal or unrecoverable error stopped the pipeline.
 * - `skipped`  : the user rejected the UUID collision confirmation.
 */
export type ImportOutcomeStatus = 'success' | 'error' | 'skipped';

/**
 * Result emitted by the engine for each processed file.
 */
export interface ImportOutcome {
  /** Original file name. */
  readonly fileName: string;
  /** Terminal status of this file's pipeline run. */
  readonly status: ImportOutcomeStatus;
  /** Present when `status === 'error'`. */
  readonly error?: ImportError;
  /** UUID of the created or updated entity; present when `status === 'success'`. */
  readonly entityId?: string;
  /** Display label of the entity (e.g. study title); present when `status === 'success'`. */
  readonly entityLabel?: string;
}

// ---------------------------------------------------------------------------
// UUID collision resolution hook
// ---------------------------------------------------------------------------

/**
 * Async callback supplied by the UI layer to handle UUID collisions.
 *
 * The UI is responsible for showing a confirmation dialog and resolving with:
 * - `true`  → the user accepted the replacement (existing entity will be deleted).
 * - `false` → the user rejected; the file is skipped.
 *
 * @param uuid               - UUID of the conflicting entity.
 * @param existingEntityLabel - Human-readable label (e.g. study title) for the dialog.
 */
export type UUIDCollisionResolver = (uuid: string, existingEntityLabel: string) => Promise<boolean>;

// ---------------------------------------------------------------------------
// Accepted file specification
// ---------------------------------------------------------------------------

/**
 * Describes which file types an import context accepts.
 */
export interface AcceptedFileSpec {
  /**
   * List of accepted file extensions, including the leading dot.
   * @example ['.csv', '.clst']
   */
  readonly extensions: string[];
  /**
   * Optional MIME type list for the `accept` attribute of the `<input>` element.
   * @example ['text/csv', 'application/json']
   */
  readonly mimeTypes?: string[];
  /**
   * Localised hint displayed in the UI.
   * @example 'File formats: .csv, .clst'
   */
  readonly hint: string;
}

// ---------------------------------------------------------------------------
// Import adapter interface (extension point)
// ---------------------------------------------------------------------------

/**
 * Context-specific import adapter.
 *
 * Each bounded context (Study, Section…) provides a concrete implementation
 * injected via `IMPORT_ADAPTER_TOKEN`.
 *
 * `TEntity` is the domain entity returned on success (e.g. `Study`, `Section`).
 *
 * ### Adapter responsibilities (per pipeline stage):
 * | Stage            | Adapter method            |
 * |------------------|---------------------------|
 * | FILE_VALIDATION  | `accepts(file)`           |
 * | DECODING         | `processFile` (internal)  |
 * | PARSING          | `processFile` (internal)  |
 * | VALIDATION       | `processFile` (internal)  |
 * | MAPPING          | `processFile` (internal)  |
 * | COLLISION_CHECK  | `checkCollision(file)`    |
 * | PERSISTENCE      | `processFile` (internal)  |
 *
 * The engine calls `accepts`, then `checkCollision`, then `processFile` in order.
 * UUID collision resolution is delegated back to the caller via `collisionResolver`.
 */
export interface ImportAdapter<TEntity = unknown> {
  /**
   * Returns `true` if the adapter can handle this file (type/extension check).
   * Called during the `FILE_VALIDATION` stage.
   */
  accepts(file: File): boolean;

  /**
   * Detects a UUID collision for the entity encoded in `file`.
   *
   * Called during the `COLLISION_CHECK` stage, before `processFile`.
   * The adapter should extract the UUID from the file *without* full parsing
   * when possible (e.g. read header only) to keep the check lightweight.
   *
   * @returns An object `{ uuid, label }` if an existing entity matches, or
   *          `null` if there is no collision.
   */
  checkCollision(file: File): Promise<{ uuid: string; label: string } | null>;

  /**
   * Runs the full adapter pipeline (decode → parse → validate → map → persist).
   *
   * The engine passes its `collisionResolver` so the adapter can ask the user
   * whether to replace an existing entity at the right moment.
   *
   * @throws An `ImportError`-shaped object on any unrecoverable failure.
   * @returns The created or updated domain entity, or `null` if the import was
   *          intentionally skipped (e.g. the user rejected a UUID collision prompt).
   */
  processFile(file: File, collisionResolver: UUIDCollisionResolver): Promise<TEntity | null>;
}

// ---------------------------------------------------------------------------
// Generic UI component configuration
// ---------------------------------------------------------------------------

/**
 * Configuration object passed as an `input()` to the generic import UI component.
 *
 * Drives accepted file types, localised strings, and the bound DI token.
 */
export interface ImportContextConfig {
  /** Accepted file specification (extensions, MIME types, hint text). */
  readonly acceptedFiles: AcceptedFileSpec;
  /** Singular label for the imported entity type, used in status messages. */
  readonly entityLabel: string;
  /**
   * Optional text overrides for the upload zone.
   * Falls back to built-in defaults if omitted.
   */
  readonly texts?: {
    readonly uploadPrompt?: string;
    readonly uploadHint?: string;
    /** Optional description shown above the upload zone. */
    readonly description?: string;
  };
  /**
   * If provided, renders a navigation link for each successfully imported entity.
   * The function receives the entity UUID and must return the target route path.
   *
   * @example
   * ```typescript
   * navigationRoute: (uuid) => '/study/' + uuid
   * ```
   */
  readonly navigationRoute?: (entityId: string) => string;
  /**
   * If provided, renders an action button for each successfully imported entity
   * instead of (or alongside) a navigation link.
   *
   * The callback receives the full `ImportOutcome` for the file so the caller
   * can act on the entity UUID, label, etc.
   *
   * Mutually exclusive in intent with `navigationRoute` (configure only one per
   * context), though both fields may technically coexist.
   *
   * @example
   * ```typescript
   * successAction: {
   *   label: 'Edit',
   *   action: (outcome) => this.onEditRequested(outcome.entityId!)
   * }
   * ```
   */
  readonly successAction?: {
    readonly label: string;
    readonly action: (outcome: ImportOutcome) => void;
  };
}
