import { CatalogAttachment, Support } from '@core/domain';
import {
  buildChainFieldChanges,
  buildCopyColumnChanges,
  buildFieldChangeUpdates,
  buildSupportNameFilterTables,
  buildSupplementaryChains,
  calculateSupportFootAltitude,
  calculateSupportNumber,
  createEmptyChain,
  findSupplementaryNames,
  getSupportFieldValues,
  getUniqueSortedSupportNamesFromAttachments,
  SUPPORT_FIELD_LIMITS
} from './helpers';

const makeSupport = (uuid: string, overrides: Partial<Support> = {}): Support => ({
  uuid,
  number: uuid,
  name: null,
  spanLength: 100,
  spanAngle: 0,
  attachmentHeight: 50,
  cableType: null,
  attachmentSet: null,
  heightBelowConsole: null,
  armLength: 0,
  chainName: null,
  chainLength: null,
  chainWeight: null,
  chainV: null,
  counterWeight: null,
  supportFootAltitude: null,
  chainSurface: null,
  attachmentPosition: null,
  towerModel: null,
  ...overrides
});

const makeAttachment = (support_name?: string): CatalogAttachment =>
  ({
    uuid: 'a1',
    updated_at: '',
    created_at: '',
    support_tower: '',
    support_name
  }) as CatalogAttachment;

describe('helpers', () => {
  describe('createEmptyChain', () => {
    it('should create a chain with the given name', () => {
      const chain = createEmptyChain('MyChain');
      expect(chain.chain_name).toBe('MyChain');
      expect(chain.mean_length).toBe(0);
      expect(chain.mean_mass).toBe(0);
      expect(chain.v_chain).toBe(false);
      expect(chain.chain_type).toBe('');
      expect(chain.chain_surface).toBe(0);
      expect(chain.uuid).toBeDefined();
    });

    it('should create a chain with an empty name when no argument is given', () => {
      const chain = createEmptyChain();
      expect(chain.chain_name).toBe('');
    });

    it('should assign a unique uuid each time', () => {
      const a = createEmptyChain();
      const b = createEmptyChain();
      expect(a.uuid).not.toBe(b.uuid);
    });
  });

  describe('getUniqueSortedSupportNamesFromAttachments', () => {
    it('should return unique, sorted names', () => {
      const attachments = [makeAttachment('Bravo'), makeAttachment('Alpha'), makeAttachment('Bravo'), makeAttachment('Charlie')];
      expect(getUniqueSortedSupportNamesFromAttachments(attachments)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });

    it('should filter out empty names', () => {
      const attachments = [makeAttachment(''), makeAttachment('Alpha')];
      expect(getUniqueSortedSupportNamesFromAttachments(attachments)).toEqual(['Alpha']);
    });

    it('should return an empty array for an empty input', () => {
      expect(getUniqueSortedSupportNamesFromAttachments([])).toEqual([]);
    });

    it('should handle a null/undefined input gracefully', () => {
      expect(getUniqueSortedSupportNamesFromAttachments(null as unknown as CatalogAttachment[])).toEqual([]);
    });
  });

  describe('buildSupportNameFilterTables', () => {
    it('should separate catalog names from supplementary names', () => {
      const supports = [makeSupport('s1', { name: 'TypeA' }), makeSupport('s2', { name: 'CustomType' })];
      const attachments = [makeAttachment('TypeA')];
      const result = buildSupportNameFilterTables(supports, attachments);
      expect(result.catalogSupportNames).toEqual(['TypeA']);
      expect(result.supplementarySupportNames).toEqual(['CustomType']);
    });

    it('should return empty arrays for empty inputs', () => {
      const result = buildSupportNameFilterTables([], []);
      expect(result.catalogSupportNames).toEqual([]);
      expect(result.supplementarySupportNames).toEqual([]);
    });

    it('should ignore supports with no name', () => {
      const supports = [makeSupport('s1', { name: null }), makeSupport('s2', { name: 'KnownType' })];
      const attachments = [makeAttachment('KnownType')];
      const result = buildSupportNameFilterTables(supports, attachments);
      expect(result.supplementarySupportNames).toEqual([]);
    });
  });

  describe('calculateSupportNumber', () => {
    it('should return isNumberField=false for non-number fields', () => {
      const support = makeSupport('s1', { number: 'ABC123' });
      const result = calculateSupportNumber(support, 'spanLength');
      expect(result.isNumberField).toBe(false);
      expect(result.firstNumber).toBeNull();
    });

    it('should extract a trailing number from a mixed support number', () => {
      const support = makeSupport('s1', { number: 'A001' });
      const result = calculateSupportNumber(support, 'number');
      expect(result.isNumberField).toBe(true);
      expect(result.firstNumber).toBe(1);
      expect(result.restOfString).toBe('A');
    });

    it('should handle a pure numeric support number', () => {
      const support = makeSupport('s1', { number: '123' });
      const result = calculateSupportNumber(support, 'number');
      expect(result.isNumberField).toBe(true);
      expect(result.firstNumber).toBe(123);
      expect(result.restOfString).toBe('');
    });

    it('should return isNumberField=false when the support number has no trailing digits', () => {
      const support = makeSupport('s1', { number: 'ABC' });
      const result = calculateSupportNumber(support, 'number');
      expect(result.isNumberField).toBe(false);
    });
  });

  describe('calculateSupportFootAltitude', () => {
    it('should return attachmentHeight - 30 when the result is above the -150 minimum', () => {
      expect(calculateSupportFootAltitude(100)).toBe(70);
      expect(calculateSupportFootAltitude(30)).toBe(0);
      expect(calculateSupportFootAltitude(-100)).toBe(-130);
    });

    it('should return -150 when attachmentHeight - 30 would be below the minimum', () => {
      expect(calculateSupportFootAltitude(-120)).toBe(-150);
      expect(calculateSupportFootAltitude(-200)).toBe(-150);
    });

    it('should return exactly -150 at the boundary', () => {
      expect(calculateSupportFootAltitude(-120)).toBe(-150);
    });
  });

  describe('buildChainFieldChanges', () => {
    it('should return 4 changes: chainLength, chainWeight, chainSurface=0, chainV=false', () => {
      const changes = buildChainFieldChanges('uuid1', 10.5, 2.3);
      expect(changes).toHaveLength(4);
      expect(changes).toContainEqual({ uuid: 'uuid1', support: { chainLength: 10.5 } });
      expect(changes).toContainEqual({ uuid: 'uuid1', support: { chainWeight: 2.3 } });
      expect(changes).toContainEqual({ uuid: 'uuid1', support: { chainSurface: 0 } });
      expect(changes).toContainEqual({ uuid: 'uuid1', support: { chainV: false } });
    });

    it('should handle null values for chainLength and chainWeight', () => {
      const changes = buildChainFieldChanges('uuid1', null, null);
      expect(changes).toContainEqual({ uuid: 'uuid1', support: { chainLength: null } });
      expect(changes).toContainEqual({ uuid: 'uuid1', support: { chainWeight: null } });
    });
  });

  describe('buildCopyColumnChanges', () => {
    it('should return an empty array when the supports list is empty', () => {
      expect(buildCopyColumnChanges([], 'number')).toEqual([]);
    });

    it('should skip the last support when copying spanLength', () => {
      const supports = [makeSupport('s1'), makeSupport('s2'), makeSupport('s3')];
      const changes = buildCopyColumnChanges(supports, 'spanLength');
      const uuids = changes.map((c) => c.uuid);
      expect(uuids).toContain('s1');
      expect(uuids).toContain('s2');
      expect(uuids).not.toContain('s3');
    });

    it('should increment the number suffix when copying the number field', () => {
      const supports = [
        makeSupport('s1', { number: 'A1' }),
        makeSupport('s2', { number: 'A2' }),
        makeSupport('s3', { number: 'A3' })
      ];
      const changes = buildCopyColumnChanges(supports, 'number');
      expect(changes).toContainEqual({ uuid: 's1', support: { number: 'A1' } });
      expect(changes).toContainEqual({ uuid: 's2', support: { number: 'A2' } });
      expect(changes).toContainEqual({ uuid: 's3', support: { number: 'A3' } });
    });

    it('should copy the same value when the number has no numeric suffix', () => {
      const supports = [makeSupport('s1', { number: 'ABC' }), makeSupport('s2', { number: 'DEF' })];
      const changes = buildCopyColumnChanges(supports, 'number');
      expect(changes).toContainEqual({ uuid: 's1', support: { number: 'ABC' } });
      expect(changes).toContainEqual({ uuid: 's2', support: { number: 'ABC' } });
    });

    it('should propagate chain fields when copying chainName', () => {
      const supports = [
        makeSupport('s1', { chainName: 'MyChain', chainLength: 10, chainWeight: 5 }),
        makeSupport('s2')
      ];
      const changes = buildCopyColumnChanges(supports, 'chainName');
      expect(changes).toContainEqual({ uuid: 's1', support: { chainName: 'MyChain' } });
      expect(changes).toContainEqual({ uuid: 's1', support: { chainLength: 10 } });
      expect(changes).toContainEqual({ uuid: 's1', support: { chainWeight: 5 } });
      expect(changes).toContainEqual({ uuid: 's2', support: { chainName: 'MyChain' } });
      expect(changes).toContainEqual({ uuid: 's2', support: { chainLength: 10 } });
      expect(changes).toContainEqual({ uuid: 's2', support: { chainWeight: 5 } });
    });

    it('should propagate supportFootAltitude when copying attachmentHeight', () => {
      const supports = [makeSupport('s1', { attachmentHeight: 50 }), makeSupport('s2', { attachmentHeight: 20 })];
      const changes = buildCopyColumnChanges(supports, 'attachmentHeight');
      expect(changes).toContainEqual({ uuid: 's1', support: { attachmentHeight: 50 } });
      expect(changes).toContainEqual({ uuid: 's1', support: { supportFootAltitude: 20 } }); // 50 - 30
      expect(changes).toContainEqual({ uuid: 's2', support: { attachmentHeight: 50 } });
      expect(changes).toContainEqual({ uuid: 's2', support: { supportFootAltitude: 20 } }); // 50 - 30
    });

    it('should not propagate supportFootAltitude when first attachmentHeight is null', () => {
      const supports = [makeSupport('s1', { attachmentHeight: null }), makeSupport('s2')];
      const changes = buildCopyColumnChanges(supports, 'attachmentHeight');
      const hasFootAltitude = changes.some((c) => 'supportFootAltitude' in c.support);
      expect(hasFootAltitude).toBe(false);
    });
  });

  describe('buildFieldChangeUpdates', () => {
    const mockChains = [
      { chain_name: 'Chain A', mean_length: 10, mean_mass: 2, v_chain: false, chain_type: '', chain_surface: 0, uuid: 'c1' },
      { chain_name: 'Chain B', mean_length: 20, mean_mass: 4, v_chain: true, chain_type: '', chain_surface: 5, uuid: 'c2' }
    ];

    it('should return only the changed field for non-special fields', () => {
      const changes = buildFieldChangeUpdates('uuid1', 'number', '42', []);
      expect(changes).toEqual([{ uuid: 'uuid1', support: { number: '42' } }]);
    });

    it('should include chain fields when chainName matches a known chain', () => {
      const changes = buildFieldChangeUpdates('uuid1', 'chainName', 'Chain A', mockChains);
      expect(changes).toContainEqual({ uuid: 'uuid1', support: { chainName: 'Chain A' } });
      expect(changes).toContainEqual({ uuid: 'uuid1', support: { chainLength: 10 } });
      expect(changes).toContainEqual({ uuid: 'uuid1', support: { chainWeight: 2 } });
      expect(changes).toContainEqual({ uuid: 'uuid1', support: { chainSurface: 0 } });
      expect(changes).toContainEqual({ uuid: 'uuid1', support: { chainV: false } });
    });

    it('should emit only the chainName change when the chain is not found', () => {
      const changes = buildFieldChangeUpdates('uuid1', 'chainName', 'Unknown', mockChains);
      expect(changes).toEqual([{ uuid: 'uuid1', support: { chainName: 'Unknown' } }]);
    });

    it('should include supportFootAltitude when attachmentHeight changes', () => {
      const changes = buildFieldChangeUpdates('uuid1', 'attachmentHeight', 50, []);
      expect(changes).toContainEqual({ uuid: 'uuid1', support: { attachmentHeight: 50 } });
      expect(changes).toContainEqual({ uuid: 'uuid1', support: { supportFootAltitude: 20 } }); // 50 - 30
    });
  });

  describe('findSupplementaryNames', () => {
    it('should return names not present in the catalog (case-insensitive)', () => {
      const result = findSupplementaryNames(['Alpha', 'beta', 'Gamma'], ['ALPHA', 'GAMMA']);
      expect(result).toEqual(['beta']);
    });

    it('should return an empty array when all names are in the catalog', () => {
      expect(findSupplementaryNames(['A', 'B'], ['A', 'B', 'C'])).toEqual([]);
    });

    it('should deduplicate results', () => {
      const result = findSupplementaryNames(['X', 'X', 'Y'], ['Z']);
      expect(result).toEqual(['X', 'Y']);
    });

    it('should filter out empty strings', () => {
      const result = findSupplementaryNames(['', 'A'], ['B']);
      expect(result).toEqual(['A']);
    });
  });

  describe('buildSupplementaryChains', () => {
    it('should create CatalogChain objects for each supplementary name', () => {
      const chains = buildSupplementaryChains(['Custom', 'Known', 'Extra'], ['Known']);
      expect(chains).toHaveLength(2);
      expect(chains.map((c) => c.chain_name)).toEqual(expect.arrayContaining(['Custom', 'Extra']));
    });

    it('should return an empty array when all names are in the catalog', () => {
      expect(buildSupplementaryChains(['A'], ['A'])).toEqual([]);
    });
  });

  describe('getSupportFieldValues', () => {
    it('should return chainName values (null becomes empty string)', () => {
      const supports = [
        makeSupport('s1', { chainName: 'Chain1' }),
        makeSupport('s2', { chainName: null }),
        makeSupport('s3', { chainName: 'Chain2' })
      ];
      expect(getSupportFieldValues(supports, 'chainName')).toEqual(['Chain1', '', 'Chain2']);
    });

    it('should return name values', () => {
      const supports = [makeSupport('s1', { name: 'NameA' }), makeSupport('s2', { name: null })];
      expect(getSupportFieldValues(supports, 'name')).toEqual(['NameA', '']);
    });
  });

  describe('SUPPORT_FIELD_LIMITS', () => {
    it('should have correct limits for spanLength', () => {
      expect(SUPPORT_FIELD_LIMITS.spanLength).toEqual({ min: 5, max: 5000 });
    });

    it('should have correct limits for attachmentHeight', () => {
      expect(SUPPORT_FIELD_LIMITS.attachmentHeight).toEqual({ min: -100, max: 9000 });
    });

    it('should have correct limits for spanAngle', () => {
      expect(SUPPORT_FIELD_LIMITS.spanAngle).toEqual({ min: -200, max: 200 });
    });

    it('should have correct limits for chainLength', () => {
      expect(SUPPORT_FIELD_LIMITS.chainLength).toEqual({ min: 0, max: 15 });
    });

    it('should have correct limits for chainWeight', () => {
      expect(SUPPORT_FIELD_LIMITS.chainWeight).toEqual({ min: 0, max: 5000 });
    });

    it('should have correct limits for attachmentSet', () => {
      expect(SUPPORT_FIELD_LIMITS.attachmentSet).toEqual({ min: 1, max: 60 });
    });

    it('should have correct limits for armLength', () => {
      expect(SUPPORT_FIELD_LIMITS.armLength).toEqual({ min: -50, max: 50 });
    });

    it('should have correct limits for counterWeight', () => {
      expect(SUPPORT_FIELD_LIMITS.counterWeight).toEqual({ min: 0, max: 5000 });
    });

    it('should have correct limits for supportFootAltitude', () => {
      expect(SUPPORT_FIELD_LIMITS.supportFootAltitude).toEqual({ min: -150, max: 9000 });
    });

    it('should have correct limits for chainSurface', () => {
      expect(SUPPORT_FIELD_LIMITS.chainSurface).toEqual({ min: 0, max: 9.99 });
    });
  });
});
