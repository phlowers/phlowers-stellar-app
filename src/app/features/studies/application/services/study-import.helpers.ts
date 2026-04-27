/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ProtoV4Parameters, ProtoV4Support } from '@shared/domain';
import { convertStringToNumber } from '@shared/helpers/convertStringToNumber';

/**
 * Decodes a base64-encoded ISO 8859-1 string to a UTF-8 string.
 * @param str - The base64 string to decode
 * @returns The decoded UTF-8 string
 */
export function parseISO88591Base64(str: string): string {
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(str), function (c: string) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );
}

/**
 * Formats a raw Proto V4 support record into a typed `ProtoV4Support` object.
 * @param support - Raw CSV record with string values
 * @returns Formatted support with numeric and boolean fields converted
 */
export const formatProtoV4Support = (support: Record<string, string>): ProtoV4Support => {
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
  } as ProtoV4Support;
};

/**
 * Formats raw Proto V4 parameter strings into a typed `ProtoV4Parameters` object.
 * @param rawParameters - Array of raw parameter values extracted from CSV
 * @param fileName - Original file name used to derive the project name
 * @returns Typed Proto V4 parameters
 */
export const formatProtoV4Parameters = (rawParameters: string[], fileName: string): ProtoV4Parameters => {
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
