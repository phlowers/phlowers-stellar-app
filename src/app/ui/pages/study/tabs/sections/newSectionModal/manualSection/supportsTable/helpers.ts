import { CatalogChain } from '@core/domain/models/catalog/catalog-chain.model';
import { CatalogAttachment, Support } from '@core/domain';
import { isNumber, uniq } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

/** Describes a field change to apply to a support identified by UUID. */
export interface SupportFieldChange {
  uuid: string;
  support: Partial<Support>;
}

/**
 * Creates an empty `CatalogChain` with default values.
 * @param chainName - Optional chain name to pre-fill
 * @returns A new catalog chain with zeroed numeric fields
 */
export const createEmptyChain = (chainName?: string): CatalogChain => {
  return {
    uuid: uuidv4(),
    chain_name: chainName || '',
    mean_length: 0,
    mean_mass: 0,
    v_chain: false,
    chain_type: '',
    chain_surface: 0
  };
};

/**
 * Extracts unique, sorted support names from catalog attachments.
 * @param attachments - Catalog attachment records
 * @returns Sorted array of unique non-empty support names
 */
export const getUniqueSortedSupportNamesFromAttachments = (attachments: CatalogAttachment[]): string[] => {
  return uniq((attachments || []).map((a) => a.support_name || ''))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
};

/**
 * Builds filter tables for support names, separating catalog names from supplementary (study-only) names.
 * @param supports - Supports currently in the study section
 * @param attachments - Catalog attachment records
 * @returns Object with `catalogSupportNames` and `supplementarySupportNames`
 */
export const buildSupportNameFilterTables = (
  supports: Support[],
  attachments: CatalogAttachment[]
): { catalogSupportNames: string[]; supplementarySupportNames: string[] } => {
  const catalogSupportNames = getUniqueSortedSupportNamesFromAttachments(attachments || []);
  const supportNamesInStudy = uniq((supports || []).map((s) => s.name || ''))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const supplementarySupportNames = supportNamesInStudy.filter((name) => !catalogSupportNames.includes(name));

  return { catalogSupportNames, supplementarySupportNames };
};

/**
 * Extracts the trailing numeric portion of the first support's number field for auto-incrementing.
 * @param firstSupport - The first support in the list
 * @param header - The support field to inspect (only 'number' is processed)
 * @returns The parsed first number, the string prefix, and whether the field is numeric
 */
export const calculateSupportNumber = (
  firstSupport: Support,
  header: keyof Support
): {
  firstNumber: number | null;
  restOfString: string;
  isNumberField: boolean;
} => {
  if (header !== 'number') {
    return { firstNumber: null, restOfString: '', isNumberField: false };
  }
  let firstNumber = null;
  let restOfString = '';
  let isNumberField = false;
  let unit = 1;
  while (/^[0-9]+$/.test(firstSupport['number']?.slice(-unit) || '') && unit <= (firstSupport['number']?.length || 0)) {
    unit++;
  }
  if (unit > 1) {
    unit = unit - 1;
    firstNumber = Number(firstSupport['number']?.slice(-unit));
    restOfString = firstSupport['number']?.slice(0, -unit) || '';
    isNumberField = true;
  }
  return { firstNumber, restOfString, isNumberField };
};

/**
 * Calculates a support foot altitude from the attachment height with a 30m offset.
 * @param attachmentHeight - Height of the attachment in meters
 * @returns Foot altitude (at least -150)
 */
export const calculateSupportFootAltitude = (attachmentHeight: number): number => {
  return Math.max(attachmentHeight - 30, -150);
};

/**
 * Builds field change entries for chain-related properties (length, weight, surface, v-chain).
 * @param uuid - UUID of the support to update
 * @param chainLength - New chain length value
 * @param chainWeight - New chain weight value
 * @returns Array of `SupportFieldChange` entries
 */
export const buildChainFieldChanges = (
  uuid: string,
  chainLength: number | null,
  chainWeight: number | null
): SupportFieldChange[] => [
  { uuid, support: { chainLength } },
  { uuid, support: { chainWeight } },
  { uuid, support: { chainSurface: 0 } },
  { uuid, support: { chainV: false } }
];

/**
 * Builds field changes to copy a column value from the first support to all others.
 *
 * For 'number' fields with a trailing integer, values are auto-incremented.
 * For 'chainName', chain-derived fields are also propagated.
 * For 'attachmentHeight', foot altitude is recalculated.
 * @param supports - All supports in the section
 * @param header - The support field to copy
 * @returns Array of `SupportFieldChange` entries
 */
export const buildCopyColumnChanges = (supports: Support[], header: keyof Support): SupportFieldChange[] => {
  const firstSupport = supports[0];
  if (!firstSupport) return [];

  const isChainName = header === 'chainName';
  const isSpanLength = header === 'spanLength';
  const isAttachmentHeight = header === 'attachmentHeight';
  const { firstNumber, restOfString, isNumberField } = calculateSupportNumber(firstSupport, header);

  const changes: SupportFieldChange[] = [];

  for (const [index, support] of supports.entries()) {
    if (isSpanLength && index === supports.length - 1) {
      continue;
    }

    if (isNumberField && isNumber(firstNumber)) {
      changes.push({
        uuid: support.uuid,
        support: { [header]: restOfString + String(firstNumber + index) }
      });
      continue;
    }

    changes.push({
      uuid: support.uuid,
      support: { [header]: firstSupport[header] }
    });

    if (isChainName) {
      changes.push(...buildChainFieldChanges(support.uuid, firstSupport.chainLength, firstSupport.chainWeight));
    }

    if (isAttachmentHeight && firstSupport.attachmentHeight !== null) {
      changes.push({
        uuid: support.uuid,
        support: {
          supportFootAltitude: calculateSupportFootAltitude(firstSupport.attachmentHeight)
        }
      });
    }
  }

  return changes;
};

/**
 * Builds support field changes when a single field value is updated,
 * including derived changes for 'chainName' and 'attachmentHeight'.
 * @param uuid - UUID of the support being changed
 * @param field - The field being updated
 * @param value - The new value
 * @param chainsOptions - Available chain catalog options for lookup
 * @returns Array of `SupportFieldChange` entries
 */
export const buildFieldChangeUpdates = (
  uuid: string,
  field: keyof Support,
  value: unknown,
  chainsOptions: CatalogChain[]
): SupportFieldChange[] => {
  const changes: SupportFieldChange[] = [];

  if (field === 'chainName') {
    const chain = chainsOptions.find((c) => c.chain_name === value);
    if (chain) {
      changes.push(...buildChainFieldChanges(uuid, chain.mean_length, chain.mean_mass));
    }
  }

  if (field === 'attachmentHeight') {
    changes.push({
      uuid,
      support: {
        supportFootAltitude: calculateSupportFootAltitude(Number(value))
      }
    });
  }

  changes.push({ uuid, support: { [field]: value } });

  return changes;
};

/**
 * Finds names that are not present in a catalog list (case-insensitive).
 * @param names - Names to check
 * @param catalogNames - Reference catalog names
 * @returns Unique names not found in the catalog
 */
export const findSupplementaryNames = (names: string[], catalogNames: string[]): string[] => {
  const lowerCaseCatalogNames = new Set(catalogNames.map((n) => n.toLowerCase()));
  return uniq(names.filter((name) => name && !lowerCaseCatalogNames.has(name.toLowerCase())));
};

/**
 * Builds empty `CatalogChain` entries for chain names not found in the catalog.
 * @param names - Chain names used in supports
 * @param catalogChainNames - Known chain names from the catalog
 * @returns Array of empty chains for supplementary names
 */
export const buildSupplementaryChains = (names: string[], catalogChainNames: string[]): CatalogChain[] => {
  return findSupplementaryNames(names, catalogChainNames).map((name) => createEmptyChain(name));
};

/**
 * Extracts the value of a given field from each support.
 * @param supports - Array of supports
 * @param field - Field to extract ('chainName' or 'name')
 * @returns Array of field values (empty string if null)
 */
export const getSupportFieldValues = (supports: Support[], field: 'chainName' | 'name'): string[] =>
  supports.map((s) => s[field] || '');

export const SUPPORT_FIELD_LIMITS = {
  spanLength: { min: 5, max: 5000 },
  attachmentHeight: { min: -100, max: 9000 },
  spanAngle: { min: -200, max: 200 },
  chainLength: { min: 0, max: 15 },
  chainWeight: { min: 0, max: 5000 },
  attachmentSet: { min: 1, max: 60 },
  armLength: { min: -50, max: 50 },
  counterWeight: { min: 0, max: 5000 },
  supportFootAltitude: { min: -150, max: 9000 },
  chainSurface: { min: 0, max: 9.99 }
} as const;
