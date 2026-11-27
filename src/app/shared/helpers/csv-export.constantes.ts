/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Declaring the charset and prefixing a BOM forces UTF-8, otherwise Excel decodes accented labels as ANSI
export const CSV_EXPORT_MIME_TYPE = 'text/csv;charset=utf-8';
export const CSV_BOM = '\uFEFF';

export const CSV_SEPARATOR = ';';
export const CSV_LINE_BREAK = '\r\n';
