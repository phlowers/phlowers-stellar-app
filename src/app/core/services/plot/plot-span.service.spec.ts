/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { PlotSpanService } from './plot-span.service';
import { Section } from '@shared/domain';

describe('PlotSpanService', () => {
  let service: PlotSpanService;

  const mockSupports: Section['supports'] = [
    {
      uuid: 'support-uuid-1',
      number: '10',
      name: 'Support 10',
      spanLength: 100,
      spanAngle: 0,
      attachmentSet: 1,
      attachmentHeight: 10,
      heightBelowConsole: 5,
      cableType: 'type1',
      armLength: 2,
      chainName: 'chain1',
      chainLength: 1,
      chainWeight: 0.5,
      chainV: true,
      counterWeight: 10,
      supportFootAltitude: 100,
      attachmentPosition: 'top',
      chainSurface: 0.1,
      towerModel: 'Tower Model',
      spanAzimut: null,
      xFootLambert93: null,
      yFootLambert93: null
    },
    {
      uuid: 'support-uuid-2',
      number: '20',
      name: 'Support 20',
      spanLength: 150,
      spanAngle: 0,
      attachmentSet: 1,
      attachmentHeight: 10,
      heightBelowConsole: 5,
      cableType: 'type1',
      armLength: 2,
      chainName: 'chain1',
      chainLength: 1,
      chainWeight: 0.5,
      chainV: true,
      counterWeight: 10,
      supportFootAltitude: 100,
      attachmentPosition: 'top',
      chainSurface: 0.1,
      towerModel: 'Tower Model',
      spanAzimut: null,
      xFootLambert93: null,
      yFootLambert93: null
    },
    {
      uuid: 'support-uuid-3',
      number: '30',
      name: 'Support 30',
      spanLength: 120,
      spanAngle: 0,
      attachmentSet: 1,
      attachmentHeight: 10,
      heightBelowConsole: 5,
      cableType: 'type1',
      armLength: 2,
      chainName: 'chain1',
      chainLength: 1,
      chainWeight: 0.5,
      chainV: true,
      counterWeight: 10,
      supportFootAltitude: 100,
      attachmentPosition: 'top',
      chainSurface: 0.1,
      towerModel: 'Tower Model',
      spanAzimut: null,
      xFootLambert93: null,
      yFootLambert93: null
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [PlotSpanService] });
    service = TestBed.inject(PlotSpanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize section to null', () => {
      expect(service.section()).toBeNull();
    });

    it('should initialize spanAmountChoice to "all"', () => {
      expect(service.spanAmountChoice()).toBe('all');
    });

    it('should initialize getSpanOptions to empty array when section is null', () => {
      expect(service.getSpanOptions()).toEqual([]);
    });

    it('should initialize getSpanOptionsWithIndex to empty array when section is null', () => {
      expect(service.getSpanOptionsWithIndex()).toEqual([]);
    });
  });

  describe('getSpanOptions', () => {
    it('should return empty array when section has no supports', () => {
      service.section.set({ supports: [] } as unknown as Section);
      expect(service.getSpanOptions()).toEqual([]);
    });

    it('should return empty array when section has a single support', () => {
      service.section.set({ supports: [mockSupports[0]] } as unknown as Section);
      expect(service.getSpanOptions()).toEqual([]);
    });

    it('should return one span for two supports', () => {
      service.section.set({ supports: mockSupports.slice(0, 2) } as unknown as Section);
      const spans = service.getSpanOptions();
      expect(spans).toHaveLength(1);
      expect(spans[0]).toEqual({ label: '10 - 20', value: 'support-uuid-1' });
    });

    it('should return two spans for three supports', () => {
      service.section.set({ supports: mockSupports } as unknown as Section);
      const spans = service.getSpanOptions();
      expect(spans).toHaveLength(2);
      expect(spans[0]).toEqual({ label: '10 - 20', value: 'support-uuid-1' });
      expect(spans[1]).toEqual({ label: '20 - 30', value: 'support-uuid-2' });
    });

    it('should fallback to 1-based index when support number is null', () => {
      const supportsWithNullNumber = [
        { ...mockSupports[0], number: null },
        { ...mockSupports[1], number: null }
      ];
      service.section.set({ supports: supportsWithNullNumber } as unknown as Section);
      const spans = service.getSpanOptions();
      expect(spans).toHaveLength(1);
      expect(spans[0]).toEqual({ label: '1 - 2', value: 'support-uuid-1' });
    });
  });

  describe('getSpanOptionsWithIndex', () => {
    it('should return empty array when section is null', () => {
      expect(service.getSpanOptionsWithIndex()).toEqual([]);
    });

    it('should return spans with index and uuid', () => {
      service.section.set({ supports: mockSupports } as unknown as Section);
      const spans = service.getSpanOptionsWithIndex();
      expect(spans).toHaveLength(2);
      expect(spans[0]).toEqual({ label: '10 - 20', value: { index: 0, uuid: 'support-uuid-1' } });
      expect(spans[1]).toEqual({ label: '20 - 30', value: { index: 1, uuid: 'support-uuid-2' } });
    });

    it('should return null value when support uuid is empty string', () => {
      const supportsWithEmptyUuid = [{ ...mockSupports[0], uuid: '' }, mockSupports[1], mockSupports[2]];
      service.section.set({ supports: supportsWithEmptyUuid } as unknown as Section);
      const spans = service.getSpanOptionsWithIndex();
      expect(spans[0].value).toBeNull();
      expect(spans[1].value).toEqual({ index: 1, uuid: 'support-uuid-2' });
    });
  });

  describe('getSupportIndex', () => {
    it('should return the 0-based index of a matching support uuid', () => {
      service.section.set({ supports: mockSupports } as unknown as Section);
      expect(service.getSupportIndex('support-uuid-1')).toBe(0);
      expect(service.getSupportIndex('support-uuid-2')).toBe(1);
      expect(service.getSupportIndex('support-uuid-3')).toBe(2);
    });

    it('should return -1 when uuid is not found', () => {
      service.section.set({ supports: mockSupports } as unknown as Section);
      expect(service.getSupportIndex('non-existent')).toBe(-1);
    });

    it('should return -1 when section is null', () => {
      expect(service.getSupportIndex('support-uuid-1')).toBe(-1);
    });
  });

  describe('getSupportOptions', () => {
    it('should return empty array when supportUuid is null', () => {
      service.section.set({ supports: mockSupports } as unknown as Section);
      expect(service.getSupportOptions(null)).toEqual([]);
    });

    it('should return LEFT and RIGHT options for the first support', () => {
      service.section.set({ supports: mockSupports } as unknown as Section);
      const options = service.getSupportOptions('support-uuid-1');
      expect(options).toHaveLength(2);
      expect(options[0]).toEqual({ label: '10', value: 'LEFT' });
      expect(options[1]).toEqual({ label: '20', value: 'RIGHT' });
    });

    it('should return correct labels for the second support', () => {
      service.section.set({ supports: mockSupports } as unknown as Section);
      const options = service.getSupportOptions('support-uuid-2');
      expect(options).toHaveLength(2);
      expect(options[0]).toEqual({ label: '20', value: 'LEFT' });
      expect(options[1]).toEqual({ label: '30', value: 'RIGHT' });
    });

    it('should fallback to 1-based index when support number is null', () => {
      const supportsWithNullNumber = [
        { ...mockSupports[0], number: null },
        { ...mockSupports[1], number: null },
        { ...mockSupports[2], number: null }
      ];
      service.section.set({ supports: supportsWithNullNumber } as unknown as Section);
      const options = service.getSupportOptions('support-uuid-1');
      expect(options).toHaveLength(2);
      expect(options[0]).toEqual({ label: '1', value: 'LEFT' });
      expect(options[1]).toEqual({ label: '2', value: 'RIGHT' });
    });

    it('should return empty array when uuid does not match any support', () => {
      service.section.set({ supports: mockSupports } as unknown as Section);
      expect(service.getSupportOptions('non-existent')).toEqual([]);
    });

    it('should return empty array for the last support (no right span)', () => {
      service.section.set({ supports: mockSupports } as unknown as Section);
      expect(service.getSupportOptions('support-uuid-3')).toEqual([]);
    });

    it('should return empty array when section is null', () => {
      expect(service.getSupportOptions('support-uuid-1')).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should reset spanAmountChoice to "all"', () => {
      service.spanAmountChoice.set('single');
      service.reset();
      expect(service.spanAmountChoice()).toBe('all');
    });

    it('should not affect the section signal', () => {
      service.section.set({ supports: mockSupports } as unknown as Section);
      service.reset();
      expect(service.section()?.supports).toHaveLength(3);
    });
  });
});
