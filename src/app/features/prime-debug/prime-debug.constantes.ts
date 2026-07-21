/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { MenuItem } from 'primeng/api';
import { DebugOption } from './prime-debug.model';

export const DEMO_OPTIONS: DebugOption[] = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' }
];

export const TOOLS_MENU_ITEMS: MenuItem[] = [
  { label: 'Rename', command: () => undefined },
  { label: 'Duplicate', command: () => undefined },
  { label: 'Delete', command: () => undefined }
];

export const TABLE_ROWS = [
  { span: 'S1-S2', length: 245.12 },
  { span: 'S2-S3', length: 198.4 },
  { span: 'S3-S4', length: 302.75 }
];
