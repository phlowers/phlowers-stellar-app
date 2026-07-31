import { Support } from '@shared/domain/models/support.model';
import { CableModification } from '@shared/domain/models/cable-modification.model';

const emptyCableModif: CableModification = {
  uuid: '',
  spanUuid: '',
  supportRef: 'LEFT',
  modificationType: 'lengthening',
  modifiedLengthCable: 0,
  distanceSupportRef: 0
};

/**
 * Ensures every support has a corresponding span load and removes loads for non-existent supports.
 * @param cableModif - The current span loads
 * @param supports - The supports to validate against
 * @returns The corrected span loads array
 */
export const recheckCableModif = (cableModif: CableModification[], supports: Support[]): CableModification[] => {
  const existingUuids = new Set(cableModif.map((load) => load.spanUuid));
  // is called spanUuid but is actually the same thing as supportUuid
  const supportUuids = new Set(supports.map((support) => support.uuid));
  const missingLoads = [...supportUuids]
    .filter((uuid) => !existingUuids.has(uuid))
    .map((uuid) => ({ ...emptyCableModif, spanUuid: uuid }));
  return [...cableModif, ...missingLoads].filter((load) => supportUuids.has(load.spanUuid));
};
