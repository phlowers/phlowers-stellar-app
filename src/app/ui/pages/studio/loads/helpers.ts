import { SpanLoad, Support } from '@core/domain';
import { LoadType } from '@core/domain/models/charge.model';

export const emptySpanLoad: SpanLoad = {
  supportUuid: '',
  loadPosition: 0,
  loadWeight: 0,
  type: LoadType.PUNCTUAL,
  referenceSupport: 'LEFT'
};

/**
 * Recheck the span loads to ensure that each span load has an existing support and each support has a span load
 * @param loads The span loads to recheck
 * @param supports The supports to recheck the span loads against
 * @returns The rechecked span loads
 */
export const recheckSpanLoads = (
  loads: SpanLoad[],
  supports: Support[]
): SpanLoad[] => {
  const loadsSupportUuid = loads.map((load) => load.supportUuid);
  const supportUuids = supports.map((support) => support.uuid);
  const missingSupportUuids = supportUuids.filter(
    (uuid) => !loadsSupportUuid.includes(uuid)
  );
  missingSupportUuids.forEach((uuid) => {
    loads.push({
      ...emptySpanLoad,
      supportUuid: uuid
    });
  });
  return loads.filter((load) => supportUuids.includes(load.supportUuid));
};
