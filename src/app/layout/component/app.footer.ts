/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-footer',
  template: `<div i18n class="layout-footer">{{ appName }} by RTE</div>`
})
export class AppFooterComponent {
  appName = environment.appName;
}
