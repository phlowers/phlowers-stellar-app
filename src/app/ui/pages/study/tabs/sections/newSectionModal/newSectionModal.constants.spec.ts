import { Section, Support } from '@core/domain';
import { hasSupportsBoundsErrors } from './newSectionModal.constants';

const validSupport: Support = {
  uuid: 'sup1',
  number: '1',
  name: null,
  spanLength: 50,
  spanAngle: 0,
  attachmentHeight: 100,
  cableType: null,
  attachmentSet: null,
  heightBelowConsole: null,
  armLength: 0,
  chainName: null,
  chainLength: null,
  chainWeight: null,
  chainV: null,
  counterWeight: null,
  supportFootAltitude: 0,
  chainSurface: null,
  attachmentPosition: null,
  towerModel: null
};

const makeSection = (supports: Support[]): Section =>
  ({
    uuid: 'uuid1',
    name: 'Test section',
    supports
  }) as unknown as Section;

describe('hasSupportsBoundsErrors', () => {
  it('should be false when supports array is empty', () => {
    expect(hasSupportsBoundsErrors(makeSection([]))).toBe(false);
  });

  it('should be false when all supports are within bounds', () => {
    expect(hasSupportsBoundsErrors(makeSection([validSupport]))).toBe(false);
  });

  it('should be true when attachmentHeight is below min', () => {
    expect(hasSupportsBoundsErrors(makeSection([{ ...validSupport, attachmentHeight: -200 }]))).toBe(true);
  });

  it('should be true when attachmentHeight is above max', () => {
    expect(hasSupportsBoundsErrors(makeSection([{ ...validSupport, attachmentHeight: 10000 }]))).toBe(true);
  });

  it('should be true when spanAngle is out of bounds', () => {
    expect(hasSupportsBoundsErrors(makeSection([{ ...validSupport, spanAngle: 300 }]))).toBe(true);
  });

  it('should be true when armLength is out of bounds', () => {
    expect(hasSupportsBoundsErrors(makeSection([{ ...validSupport, armLength: -100 }]))).toBe(true);
  });

  it('should be true when supportFootAltitude is out of bounds', () => {
    expect(hasSupportsBoundsErrors(makeSection([{ ...validSupport, supportFootAltitude: -200 }]))).toBe(true);
  });
});
