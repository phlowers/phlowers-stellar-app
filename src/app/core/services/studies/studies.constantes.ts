/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { StudyExportFormat, StudyExportFormatOption } from './studies.interfaces';

/** Default study export format. */
export const DEFAULT_STUDY_EXPORT_FORMAT: StudyExportFormat = 'clst';

/** Export format options, default first. */
export const STUDY_EXPORT_FORMAT_OPTIONS: StudyExportFormatOption[] = [
  { label: '.clst', value: 'clst' },
  { label: '.stsd', value: 'stsd' }
];
