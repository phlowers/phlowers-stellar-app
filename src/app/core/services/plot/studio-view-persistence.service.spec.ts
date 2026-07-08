/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { TestBed } from '@angular/core/testing';
import { StudioViewPersistenceService } from './studio-view-persistence.service';
import { StudioViewState } from '@shared/types/plot.types';

const SECTION_UUID = 'section-uuid-1234';
const STORAGE_KEY = `stellar-studio-view-${SECTION_UUID}`;

const mockState: StudioViewState = {
  startSupport: 2,
  endSupport: 5,
  camera: {
    eye: { x: 1.5, y: 0.5, z: 0.8 },
    center: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 0, z: 1 }
  },
  scalingFactors: { x: 1, y: 1, z: 1, aspectMode: 'data' },
  resolution: 75
};

describe('StudioViewPersistenceService', () => {
  let service: StudioViewPersistenceService;

  beforeEach(() => {
    globalThis.localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(StudioViewPersistenceService);
  });

  afterEach(() => {
    globalThis.localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('save()', () => {
    it('should write the correct key to localStorage', () => {
      service.save(SECTION_UUID, mockState);
      expect(globalThis.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    });

    it('should serialise the state as JSON', () => {
      service.save(SECTION_UUID, mockState);
      const raw = globalThis.localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(raw!)).toEqual(mockState);
    });

    it('should overwrite an existing entry for the same sectionUuid', () => {
      service.save(SECTION_UUID, mockState);
      const updated: StudioViewState = { ...mockState, startSupport: 0, endSupport: 10 };
      service.save(SECTION_UUID, updated);
      const raw = globalThis.localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(raw!).startSupport).toBe(0);
      expect(JSON.parse(raw!).endSupport).toBe(10);
    });

    it('should use separate keys for different sectionUuids', () => {
      const otherUuid = 'other-section-uuid';
      service.save(SECTION_UUID, mockState);
      service.save(otherUuid, { ...mockState, startSupport: 99 });
      const first = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY)!);
      const second = JSON.parse(globalThis.localStorage.getItem(`stellar-studio-view-${otherUuid}`)!);
      expect(first.startSupport).toBe(2);
      expect(second.startSupport).toBe(99);
    });

    it('should save a state with null camera', () => {
      service.save(SECTION_UUID, { ...mockState, camera: null });
      const raw = globalThis.localStorage.getItem(STORAGE_KEY);
      expect(JSON.parse(raw!).camera).toBeNull();
    });
  });

  describe('load()', () => {
    it('should return the saved StudioViewState', () => {
      service.save(SECTION_UUID, mockState);
      expect(service.load(SECTION_UUID)).toEqual(mockState);
    });

    it('should return null when no entry exists for the sectionUuid', () => {
      expect(service.load('non-existent-uuid')).toBeNull();
    });

    it('should return null when the stored value is corrupted JSON', () => {
      globalThis.localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
      expect(service.load(SECTION_UUID)).toBeNull();
    });

    it('should not throw when the stored value is corrupted JSON', () => {
      globalThis.localStorage.setItem(STORAGE_KEY, '{broken');
      expect(() => service.load(SECTION_UUID)).not.toThrow();
    });

    it('should return null for an empty string stored value', () => {
      globalThis.localStorage.setItem(STORAGE_KEY, '');
      expect(service.load(SECTION_UUID)).toBeNull();
    });

    it('should preserve all StudioViewState fields', () => {
      service.save(SECTION_UUID, mockState);
      const loaded = service.load(SECTION_UUID)!;
      expect(loaded.startSupport).toBe(mockState.startSupport);
      expect(loaded.endSupport).toBe(mockState.endSupport);
      expect(loaded.camera).toEqual(mockState.camera);
      expect(loaded.scalingFactors).toEqual(mockState.scalingFactors);
      expect(loaded.resolution).toBe(mockState.resolution);
    });
  });

  describe('remove()', () => {
    it('should delete the localStorage entry for the sectionUuid', () => {
      service.save(SECTION_UUID, mockState);
      service.remove(SECTION_UUID);
      expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('should not throw when removing a non-existent key', () => {
      expect(() => service.remove('non-existent-uuid')).not.toThrow();
    });

    it('should only remove the targeted sectionUuid entry', () => {
      const otherUuid = 'other-section-uuid';
      service.save(SECTION_UUID, mockState);
      service.save(otherUuid, mockState);
      service.remove(SECTION_UUID);
      expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(globalThis.localStorage.getItem(`stellar-studio-view-${otherUuid}`)).not.toBeNull();
    });
  });
});
