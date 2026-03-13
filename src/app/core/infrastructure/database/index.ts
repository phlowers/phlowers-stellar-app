/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Re-export bridge — will be removed when all consumers are updated to @infrastructure/
export { AppDatabase, AppDB } from '@infrastructure/database/app-database';
export type { UserEntity } from '@infrastructure/database/entities/user.entity';
export type { StudyEntity } from '@infrastructure/database/entities/study.entity';
export type { CatalogAttachmentEntity } from '@infrastructure/database/entities/catalog-attachment.entity';
export type { CatalogCableEntity } from '@infrastructure/database/entities/catalog-cable.entity';
export type { CatalogChainEntity } from '@infrastructure/database/entities/catalog-chain.entity';
export type { CatalogLineEntity } from '@infrastructure/database/entities/catalog-line.entity';
export type { CatalogMaintenanceEntity } from '@infrastructure/database/entities/catalog-maintenance.entity';
export type { CatalogObstacleTypeEntity } from '@infrastructure/database/entities/catalog-obstacle-type.entity';
export type { MetadataEntity } from '@infrastructure/database/entities/metadata.entity';
export * from '@infrastructure/database/schemas/index';
