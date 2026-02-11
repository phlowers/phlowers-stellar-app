import { CatalogChain } from '@core/domain/models/catalog/catalog-chain.model';
import { CatalogAttachment, Support } from '@core/domain';
import { isNumber, uniq } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

export interface SupportFieldChange {
  uuid: string;
  support: Partial<Support>;
}

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

export const getUniqueSortedSupportNamesFromAttachments = (
  attachments: CatalogAttachment[]
): string[] => {
  return uniq((attachments || []).map((a) => a.support_name || ''))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
};

export const buildSupportNameFilterTables = (
  supports: Support[],
  attachments: CatalogAttachment[]
): { catalogSupportNames: string[]; supplementarySupportNames: string[] } => {
  const catalogSupportNames = getUniqueSortedSupportNamesFromAttachments(
    attachments || []
  );
  const supportNamesInStudy = uniq((supports || []).map((s) => s.name || ''))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const supplementarySupportNames = supportNamesInStudy.filter(
    (name) => !catalogSupportNames.includes(name)
  );

  return { catalogSupportNames, supplementarySupportNames };
};

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
  while (
    /^[0-9]+$/.test(firstSupport['number']?.slice(-unit) || '') &&
    unit <= (firstSupport['number']?.length || 0)
  ) {
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

export const calculateSupportFootAltitude = (
  attachmentHeight: number
): number => {
  return Math.max(attachmentHeight - 30, 0);
};

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

export const buildCopyColumnChanges = (
  supports: Support[],
  header: keyof Support
): SupportFieldChange[] => {
  const firstSupport = supports[0];
  if (!firstSupport) return [];

  const isChainName = header === 'chainName';
  const isSpanLength = header === 'spanLength';
  const isAttachmentHeight = header === 'attachmentHeight';
  const { firstNumber, restOfString, isNumberField } = calculateSupportNumber(
    firstSupport,
    header
  );

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
      changes.push(
        ...buildChainFieldChanges(
          support.uuid,
          firstSupport.chainLength,
          firstSupport.chainWeight
        )
      );
    }

    if (isAttachmentHeight && firstSupport.attachmentHeight !== null) {
      changes.push({
        uuid: support.uuid,
        support: {
          supportFootAltitude: calculateSupportFootAltitude(
            firstSupport.attachmentHeight
          )
        }
      });
    }
  }

  return changes;
};

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
      changes.push(
        ...buildChainFieldChanges(uuid, chain.mean_length, chain.mean_mass)
      );
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

export const findSupplementaryNames = (
  names: string[],
  catalogNames: string[]
): string[] => {
  const lowerCaseCatalogNames = new Set(
    catalogNames.map((n) => n.toLowerCase())
  );
  return uniq(
    names.filter(
      (name) => name && !lowerCaseCatalogNames.has(name.toLowerCase())
    )
  );
};

export const buildSupplementaryChains = (
  names: string[],
  catalogChainNames: string[]
): CatalogChain[] => {
  return findSupplementaryNames(names, catalogChainNames).map((name) =>
    createEmptyChain(name)
  );
};

export const getSupportFieldValues = (
  supports: Support[],
  field: 'chainName' | 'name'
): string[] => supports.map((s) => s[field] || '');
