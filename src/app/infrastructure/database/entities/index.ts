/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Database entities barrel export
export type { UserEntity } from './user.entity';
export type { StudyEntity } from './study.entity';
export type { CatalogAttachmentEntity } from './catalog-attachment.entity';
export type { CatalogSupportAttachmentEntity, AttachmentSetItem } from './catalog-support-attachment.entity';
export type { CatalogCableEntity } from './catalog-cable.entity';
export type { CatalogChainEntity } from './catalog-chain.entity';
export type { CatalogLineEntity } from './catalog-line.entity';
export type { CatalogMaintenanceEntity } from './catalog-maintenance.entity';
export type { CatalogObstacleTypeEntity } from './catalog-obstacle-type.entity';
export type {
  CatalogObstacleConfigurationEntity,
  ObstacleConformityType
} from './catalog-obstacle-configuration.entity';
export type {
  CatalogObstacleRuleDefinitionEntity,
  ObstacleRulePoint,
  ObstacleRulePressure
} from './catalog-obstacle-rule-definition.entity';
export type { CatalogObstacleDistanceEntity, ObstacleVoltageDistanceMap } from './catalog-obstacle-distance.entity';
export type { CatalogObstacleWindZoneEntity } from './catalog-obstacle-wind-zone.entity';
export type { CatalogObstacleConformityConfigEntity } from './catalog-obstacle-conformity-config.entity';
export { OBSTACLE_CONFORMITY_CONFIG_KEY } from './catalog-obstacle-conformity-config.entity';
export type { MetadataEntity } from './metadata.entity';
