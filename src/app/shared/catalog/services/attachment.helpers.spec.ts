import { AttachmentCsvDto } from '@infrastructure/dto';
import { mapAttachmentCsvToEntities } from './attachment.helpers';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid')
}));

const makeDto = (overrides: Partial<AttachmentCsvDto> = {}): AttachmentCsvDto => ({
  support_id_catalog: 'cat1',
  support_idr: 'idr1',
  support_adr: 'Support 1',
  support_tower: 'tower1',
  support_family: 'Family 1',
  position: '2',
  X: '1.1',
  Y: '2.2',
  Z: '10.5',
  L: '3.0',
  ...overrides
});

describe('mapAttachmentCsvToEntities', () => {
  it('should map a valid DTO to a CatalogAttachmentEntity', () => {
    const result = mapAttachmentCsvToEntities([makeDto()]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      uuid: 'mock-uuid',
      support_name: 'idr1',
      support_tower: 'tower1',
      attachment_set: 2,
      attachment_altitude: 10.5,
      cross_arm_length: 3.0,
      attachment_set_x: 1.1,
      attachment_set_y: 2.2,
      attachment_set_z: 10.5
    });
  });

  it('should use support_adr when support_idr is empty', () => {
    const result = mapAttachmentCsvToEntities([makeDto({ support_idr: '', support_adr: 'Fallback Name' })]);
    expect(result[0].support_name).toBe('Fallback Name');
  });

  it('should filter out items with neither support_idr nor support_adr', () => {
    const data = [makeDto({ support_idr: '', support_adr: '' }), makeDto({ support_idr: 'valid', support_adr: '' })];
    const result = mapAttachmentCsvToEntities(data);
    expect(result).toHaveLength(1);
    expect(result[0].support_name).toBe('valid');
  });

  it('should parse numeric fields from strings', () => {
    const result = mapAttachmentCsvToEntities([makeDto({ X: '5.5', Y: '6.6', Z: '7.7', L: '8.8', position: '3' })]);
    expect(result[0].attachment_set_x).toBeCloseTo(5.5);
    expect(result[0].attachment_set_y).toBeCloseTo(6.6);
    expect(result[0].attachment_set_z).toBeCloseTo(7.7);
    expect(result[0].cross_arm_length).toBeCloseTo(8.8);
    expect(result[0].attachment_set).toBe(3);
  });

  it('should return empty array when given empty input', () => {
    expect(mapAttachmentCsvToEntities([])).toHaveLength(0);
  });

  it('should set created_at and updated_at as ISO strings', () => {
    const before = new Date().toISOString();
    const result = mapAttachmentCsvToEntities([makeDto()]);
    const after = new Date().toISOString();
    expect(result[0].created_at >= before).toBe(true);
    expect(result[0].updated_at <= after).toBe(true);
  });
});
