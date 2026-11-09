/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { mergeCableSupportManips } from '@shared/domain/helpers/cable-support-manip.helpers';
import { CableSupportManipulation } from '@shared/domain/models/cable-support-manipulation.model';

const makeManip = (uuid: string, supportUuid: string, chargeUuid: string): CableSupportManipulation =>
  ({ uuid, supportUuid, chargeUuid, manip1: {}, manip2: null }) as unknown as CableSupportManipulation;

describe('mergeCableSupportManips', () => {
  it('should return an empty array when neither source has manipulations', () => {
    expect(mergeCableSupportManips([], [], 'c1')).toEqual([]);
  });

  it('should accept missing sources', () => {
    expect(mergeCableSupportManips(undefined, undefined, 'c1')).toEqual([]);
  });

  it('should keep the load case manipulations', () => {
    const chargeManips = [makeManip('m1', 's1', 'c1')];

    expect(mergeCableSupportManips(chargeManips, [], 'c1')).toEqual(chargeManips);
  });

  it('should complete the load case manipulations with the section ones of other supports', () => {
    const chargeManip = makeManip('m1', 's1', 'c1');
    const sectionManip = makeManip('m2', 's2', 'c1');

    expect(mergeCableSupportManips([chargeManip], [sectionManip], 'c1')).toEqual([chargeManip, sectionManip]);
  });

  it('should prefer the load case manipulation over the section one of the same support', () => {
    const chargeManip = makeManip('charge-copy', 's1', 'c1');
    const sectionManip = makeManip('section-copy', 's1', 'c1');

    expect(mergeCableSupportManips([chargeManip], [sectionManip], 'c1')).toEqual([chargeManip]);
  });

  it('should ignore the manipulations of other load cases in the load case source', () => {
    const own = makeManip('m1', 's1', 'c1');
    const other = makeManip('m2', 's2', 'c2');

    expect(mergeCableSupportManips([own, other], [], 'c1')).toEqual([own]);
  });

  it('should ignore the manipulations of other load cases in the section source', () => {
    const other = makeManip('m1', 's1', 'c2');

    expect(mergeCableSupportManips([], [other], 'c1')).toEqual([]);
  });

  it('should not let another load case manipulation hide a section one of the same support', () => {
    const chargeOther = makeManip('m1', 's1', 'c2');
    const sectionOwn = makeManip('m2', 's1', 'c1');

    expect(mergeCableSupportManips([chargeOther], [sectionOwn], 'c1')).toEqual([sectionOwn]);
  });
});
