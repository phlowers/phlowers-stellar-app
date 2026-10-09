/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MaintenanceService } from '@shared/catalog/services/maintenance.service';
import { CatalogMaintenance, Section } from '@shared/domain';
import { createEmptySection } from '@shared/domain/helpers/sections.helpers';
import { MaintenanceCorrectionService } from './maintenance-correction.service';

describe('MaintenanceCorrectionService', () => {
  let service: MaintenanceCorrectionService;
  let maintenanceServiceMock: { getMaintenance: ReturnType<typeof vi.fn> };

  const catalog: CatalogMaintenance[] = [
    {
      maintenance_center: 'FAKE-CM-01',
      maintenance_center_id: 'fake-center-id',
      regional_team: 'FAKE-GMR-01',
      regional_team_id: 'fake-regional-id',
      maintenance_team: 'FAKE-EEL-01',
      maintenance_team_id: 'fake-team-id'
    }
  ];

  const buildSection = (overrides: Partial<Section> = {}): Section => ({
    ...createEmptySection(),
    cm_designation: 'FAKE-CM-01',
    eel_designation: 'FAKE-EEL-01',
    gmr_designation: 'FAKE-GMR-01',
    ...overrides
  });

  beforeEach(() => {
    maintenanceServiceMock = { getMaintenance: vi.fn().mockResolvedValue(catalog) };
    TestBed.configureTestingModule({
      providers: [{ provide: MaintenanceService, useValue: maintenanceServiceMock }]
    });
    service = TestBed.inject(MaintenanceCorrectionService);
  });

  it('should fill the center, team and regional team IDs from the designations', async () => {
    const result = await service.correctMaintenance(buildSection());

    expect(result.maintenance_center_id).toBe('fake-center-id');
    expect(result.maintenance_team_id).toBe('fake-team-id');
    expect(result.regional_team_id).toBe('fake-regional-id');
  });

  it('should leave the IDs unset when no designation matches the catalog', async () => {
    maintenanceServiceMock.getMaintenance.mockResolvedValue([]);

    const result = await service.correctMaintenance(buildSection());

    expect(result.maintenance_center_id).toBeUndefined();
    expect(result.maintenance_team_id).toBeUndefined();
    expect(result.regional_team_id).toBeUndefined();
  });

  it('should leave the IDs unset when the section has no designation', async () => {
    const result = await service.correctMaintenance(
      buildSection({ cm_designation: undefined, eel_designation: undefined, gmr_designation: undefined })
    );

    expect(result.maintenance_center_id).toBeUndefined();
  });

  it('should treat a missing catalog as empty', async () => {
    maintenanceServiceMock.getMaintenance.mockResolvedValue(undefined);

    expect((await service.correctMaintenance(buildSection())).maintenance_center_id).toBeUndefined();
  });

  it('should keep an existing ID when its designation has no catalog match', async () => {
    const result = await service.correctMaintenance(
      buildSection({ cm_designation: 'FAKE-CM-UNKNOWN', maintenance_center_id: 'existing-id' })
    );

    expect(result.maintenance_center_id).toBe('existing-id');
  });
});
