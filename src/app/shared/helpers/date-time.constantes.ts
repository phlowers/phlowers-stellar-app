/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Time zone used for raw dates when `environment.timeZone` is missing or is not a valid IANA zone. */
export const DEFAULT_TIME_ZONE = 'Europe/Paris';

/** Fields read from a date to build its RFC 9557 representation; the offset comes from `timeZoneName`. */
export const RFC_9557_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
  hourCycle: 'h23',
  timeZoneName: 'longOffset'
};
