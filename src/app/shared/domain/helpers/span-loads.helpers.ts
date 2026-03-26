import { SpanLoad, LoadType } from '@shared/domain/models/charge.model';
import { Support } from '@shared/domain/models/support.model';

const emptySpanLoad: SpanLoad = {
  supportUuid: '',
  loadPosition: 0,
  loadWeight: 0,
  type: LoadType.PUNCTUAL,
  referenceSupport: 'LEFT'
};

/**
 * Ensures every support has a corresponding span load and removes loads for non-existent supports.
 * @param loads - The current span loads
 * @param supports - The supports to validate against
 * @returns The corrected span loads array
 */
export const recheckSpanLoads = (loads: SpanLoad[], supports: Support[]): SpanLoad[] => {
  const loadsSupportUuid = loads.map((load) => load.supportUuid);
  const supportUuids = supports.map((support) => support.uuid);
  const missingSupportUuids = supportUuids.filter((uuid) => !loadsSupportUuid.includes(uuid));
  missingSupportUuids.forEach((uuid) => {
    loads.push({
      ...emptySpanLoad,
      supportUuid: uuid
    });
  });
  return loads.filter((load) => supportUuids.includes(load.supportUuid));
};
