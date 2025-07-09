/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PageTitleService } from '@ui/shared/service/page-title/page-title.service';
import { IconComponent } from '../../atoms/icon/icon.component';

@Component({
  selector: 'app-topbar',
  imports: [CommonModule, IconComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();
  public currentPageTitle = signal<string>('');
  public workerReady = signal<boolean>(true);
  public readonly workerError = signal<boolean>(false);

  constructor(private readonly pageTitleService: PageTitleService) {}

  ngOnInit() {
    this.subscriptions.add(
      this.pageTitleService.pageTitle$.subscribe((title) => {
        this.currentPageTitle.set(title);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
