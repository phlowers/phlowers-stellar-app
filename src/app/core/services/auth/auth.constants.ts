/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** URL of the Apache CGI endpoint that returns OIDC claims (PKCE-protected). */
export const USERINFO_URL = '/auth/userinfo';

/**
 * URL of the Apache CGI endpoint that forces the OIDC sign-in prompt with
 * G@IA. A full top-level navigation to this URL triggers mod_auth_openidc:
 * if no session exists the browser is redirected to the G@IA authorization
 * endpoint, then back to "/" once authenticated.
 */
export const LOGIN_URL = '/auth/login';
