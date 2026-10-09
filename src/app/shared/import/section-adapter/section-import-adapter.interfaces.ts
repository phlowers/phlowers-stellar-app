/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Section } from '@shared/domain';

/** Coordinate reference systems an adapter can hand over to the core pipeline. */
export type SectionImportCrs = 'LAMBERT93' | 'WGS84';

/**
 * File content handed to adapters. The core reads the file once so adapters never touch `File`.
 */
export interface SectionImportSource {
  /** Original file name, including extension. */
  readonly fileName: string;
  /** Raw decoded text content. */
  readonly text: string;
  /** Result of `JSON.parse(text)`, or `undefined` when the content is not valid JSON. */
  readonly json: unknown;
}

/**
 * Support foot coordinates, one entry per support (same order and length as `section.supports`).
 *
 * - `LAMBERT93`: `x` / `y` are Lambert93 easting / northing in meters. The core reprojects them to GPS
 *   and fills the support foot coordinates, the section start GPS and the mean reprojection error.
 * - `WGS84`: `x` is the longitude and `y` the latitude, in degrees. Applied as-is.
 *
 * A `null` entry means the coordinate is unknown; the core then skips the reprojection.
 */
export interface SectionImportCoordinates {
  readonly crs: SectionImportCrs;
  readonly x: readonly (number | null)[];
  readonly y: readonly (number | null)[];
}

/** User-facing message raised by an adapter, shown after a successful import. */
export interface SectionImportNotice {
  readonly severity: 'info' | 'warning';
  /** Already localized message. */
  readonly message: string;
}

/** What an adapter must return: the format-independent result of its parsing and mapping. */
export interface SectionImportPayload {
  readonly section: Section;
  readonly coordinates?: SectionImportCoordinates;
  readonly notices?: readonly SectionImportNotice[];
  /**
   * Asks the core to correct the section against the local catalogs (maintenance, voltage, attachments,
   * chains) and to register the new support names. Defaults to `false`.
   * The adapter must then provide the lookup keys in the mapped section: `cm_designation`,
   * `eel_designation`, `gmr_designation`, `voltage_idr` / `voltage_adr`, and per support `name`,
   * `attachmentSet`, `chainName`, `towerModel`.
   */
  readonly applyCatalogCorrections?: boolean;
}

/**
 * Contract of a section import format.
 *
 * An adapter parses and maps its own format into a `SectionImportPayload`. Collision handling,
 * generic validation, catalog correction, coordinate reprojection, persistence and notifications are done by the core.
 *
 * Errors: `import()` must reject with an `ImportError`-shaped object whose `code` is built with
 * `adapterErrorCode(...)` (or a canonical code) and whose `message` is localized by the adapter.
 * Any other thrown value is wrapped by the core into a generic `MAPPING_ERROR`.
 *
 * Adapters are `@Injectable()` classes (no `providedIn`) registered with `provideSectionImportAdapter`.
 */
export interface SectionImportAdapter {
  /** Unique, stable, snake_case identifier (e.g. `stellar_json`). */
  readonly id: string;
  /** Human-readable format name shown in the upload hint. */
  readonly formatLabel: string;
  /** Accepted file extensions, lowercase, with the leading dot (e.g. `['.json']`). */
  readonly extensions: readonly string[];
  /** Optional MIME types for the `accept` attribute of the file input. */
  readonly mimeTypes?: readonly string[];

  /**
   * Returns `true` when this adapter recognizes the content. Must be cheap, synchronous and never throw.
   * When several adapters match, the first one in registry order is used.
   */
  canHandle(source: SectionImportSource): boolean;

  /**
   * Extracts the section UUID for the collision check, or `null` when it cannot be determined.
   * Must never throw.
   */
  extractUuid(source: SectionImportSource): string | null;

  /** Parses, validates (own format) and maps the content. */
  import(source: SectionImportSource): Promise<SectionImportPayload>;
}

/**
 * Default Stellar section file (`.stsec`), written by the section export and read by the
 * `stellar_json` adapter.
 */
export interface StellarSectionEnvelope {
  readonly format: 'stellar-section';
  readonly version: number;
  readonly section: Section;
  /** Optional coordinates to reproject on import (see `SectionImportCoordinates`). */
  readonly coordinates?: SectionImportCoordinates;
}
