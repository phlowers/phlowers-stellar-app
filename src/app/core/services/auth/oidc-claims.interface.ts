/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Claims returned by the OIDC `/auth/userinfo` CGI endpoint.
 * `email` is mandatory (used as IndexedDB primary key); all other fields are optional.
 */
export interface OidcClaims {
  email: string;
  sub?: string;
  given_name?: string;
  family_name?: string;
  roles?: string[];
}
