/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Routes } from '@angular/router';

/**
 * Dev-only routes, swapped in for the real ones (see dev-routes.development.ts)
 * via the `development` build configuration's fileReplacements in angular.json.
 * Kept empty here so nothing extra is bundled in production builds.
 */
export const devRoutes: Routes = [];
