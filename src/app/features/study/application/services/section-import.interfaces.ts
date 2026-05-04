/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// ---------------------------------------------------------------------------
// GeoLiaison type interfaces
// ---------------------------------------------------------------------------

export interface GeoLiaisonAccroche {
  ANGLE_LIGNE: string | null;
  ACCROCHE_SET: string | null;
  ACCROCHE_CABLE_Z_LAMBERT93: string | null;
  HAUTEUR_SOUS_CONSOLE: string | null;
  LONGUEUR_BRAS: string | null;
  CHAINE_DRN_ADR: string | null;
  CHAINE_DRN_LONGUEUR: string | null;
  CHAINE_DRN_POIDS: string | null;
  CHAINE_EN_V: string | null;
  CONTREPOIDS: string | null;
  CHAINE_DRN_SURFACE: string | null;
  PIED_Z_LAMBERT93: string | null;
  PIED_X_LAMBERT93: string | null;
  PIED_Y_LAMBERT93: string | null;
  SUPPORT_ADR: string | null;
  SUPPORT_NUMERO: string | null;
  SUPPORT_TOWER: string | null;
}

export interface GeoLiaisonPortee {
  PORTEE_UNITAIRE_ORDRE: string | null;
  PORTEE_LONGUEUR: string | null;
  PORTEE_AZIMUT: string | null;
  CM_DESIGNATION: string | null;
  EEL_DESIGNATION: string | null;
  GMR_DESIGNATION: string | null;
  PORTEE_UNITAIRE_DESIGNATION: string | null;
  'accroche depart': GeoLiaisonAccroche;
  'accroche arrivee': GeoLiaisonAccroche;
}

export interface GeoLiaisonAppartenance {
  LIT_ADR: string | null;
  LIT_IDR: string | null;
  BRANCHE_IDR: string | null;
  TENSION_ELECTRIQUE_ADR: string | null;
}

export interface GeoLiaisonGeneral {
  CANTON_CUR: string;
  CABLE_ADR: string | null;
  CANTON_TYPE: string | null;
  FAISCEAU_CABLES_NOMBRE: string | null;
  PHASE_ELECTRIQUE_NUMERO: string | null;
  appartenance: GeoLiaisonAppartenance[];
}

export interface GeoLiaisonCanton {
  general: GeoLiaisonGeneral;
  'portee unitaire': GeoLiaisonPortee[];
}

export interface GeoLiaisonFormat {
  cantons: GeoLiaisonCanton[];
}

export interface GeoLiaisonFieldError {
  readonly field: string;
  readonly value: string | null;
}
