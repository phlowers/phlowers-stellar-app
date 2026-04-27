import { SpanLoad } from '@shared/domain';
import { LoadType } from '@shared/domain/models/charge.model';

/** Default empty span load used as a template for new span loads. */
export const emptySpanLoad: SpanLoad = {
  supportUuid: '',
  loadPosition: 0,
  loadWeight: 0,
  type: LoadType.PUNCTUAL,
  referenceSupport: 'LEFT'
};
