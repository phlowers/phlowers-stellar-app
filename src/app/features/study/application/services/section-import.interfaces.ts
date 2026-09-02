/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// ---------------------------------------------------------------------------
// Canton import type interfaces
// ---------------------------------------------------------------------------

export interface Attachment {
  ANGLE_LIGNE: string | null;
  ACCROCHE_SET: string | null;
  ACCROCHE_CABLE_Z_LAMBERT93: string | null;
  HAUTEUR_SOUS_CONSOLE: string | null;
  LONGUEUR_BRAS: string | null;
  CHAINE_DRN_ADR: string | null;
  CHAINE_DRN_IDR: string | null;
  CHAINE_DRN_LONGUEUR: string | null;
  CHAINE_DRN_POIDS: string | null;
  CHAINE_EN_V: string | null;
  CONTREPOIDS: string | null;
  CHAINE_DRN_SURFACE: string | null;
  PIED_Z_LAMBERT93: string | null;
  PIED_X_LAMBERT93: string | null;
  PIED_Y_LAMBERT93: string | null;
  SUPPORT_ADR: string | null;
  SUPPORT_IDR: string | null;
  SUPPORT_NUMERO: string | null;
  SUPPORT_TOWER: string | null;
}

/** Represents a basic span (portée unitaire) in the external French canton format. */
export interface Span {
  PORTEE_UNITAIRE_ORDRE: string | null;
  PORTEE_LONGUEUR: string | null;
  PORTEE_AZIMUT: string | null;
  CM_DESIGNATION: string | null;
  EEL_DESIGNATION: string | null;
  GMR_DESIGNATION: string | null;
  PORTEE_UNITAIRE_DESIGNATION: string | null;
  /** French key from external data source (starting attachment point). */
  'accroche depart': Attachment;
  /** French key from external data source (ending attachment point). */
  'accroche arrivee': Attachment;
}

/** Represents membership/affiliation data from the external French canton format. */
export interface Appartenance {
  LIT_ADR: string | null;
  LIT_IDR: string | null;
  BRANCHE_IDR: string | null;
  TENSION_ELECTRIQUE_IDR: string | null;
  TENSION_ELECTRIQUE_ADR: string | null;
  LIAISON_IDR: string | null;
  LIAISON_ADR: string | null;
}

export interface General {
  CANTON_CUR: string;
  CABLE_ADR: string | null;
  CANTON_TYPE: string | null;
  FAISCEAU_CABLES_NOMBRE: string | null;
  PHASE_ELECTRIQUE_NUMERO: string | null;
  /** French key from external data source (membership/affiliation array). */
  appartenance: Appartenance[];
}

/** Represents a single section from an external French data source file. */
export interface ImportedSection {
  general: General;
  /** French key from external data source (array of basic spans). */
  'portee unitaire': Span[];
}

/** Represents a complete external section import file structure. */
export interface SectionImportFile {
  cantons: ImportedSection[];
}

export interface FieldError {
  readonly field: string;
  readonly value: string | null;
}

export interface StartGps {
  startLatitude: number;
  startLongitude: number;
  startAzimuth: number;
}
