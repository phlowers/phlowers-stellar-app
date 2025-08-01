/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

export const primengPreset = definePreset(Aura, {
  semantic: {
    primary: {
      0: '#fcfbfd',
      50: '#f9f7fc',
      100: '#f3eff8',
      200: '#e6def0',
      300: '#d2c3e4',
      400: '#b89fd3',
      500: '#9979bc',
      600: '#7d5a9f',
      700: '#674883',
      800: '#563c6c',
      900: '#4a355a',
      950: '#2b1a38'
    },
    secondary: {
      0: '#f9feff',
      50: '#edfdfe',
      100: '#d1f9fc',
      200: '#a9f2f8',
      300: '#6ee6f2',
      400: '#2bd0e5',
      500: '#0fb3cb',
      600: '#108faa',
      700: '#14738a',
      800: '#195e71',
      900: '#1a4d5f',
      950: '#0c3949'
    },
    grey: {
      white: '#fff',
      0: '#f4f5f4',
      50: '#ebebea',
      100: '#e1e1e0',
      150: '#d7d6d5',
      200: '#cdcccb',
      250: '#c2c1c0',
      300: '#b7b7b6',
      350: '#acacab',
      400: '#a1a1a0',
      450: '#969695',
      500: '#8b8a8a',
      550: '#7f7e7e',
      600: '#737272',
      650: '#666665',
      700: '#595958',
      750: '#4c4c4b',
      800: '#3e3e3d',
      850: '#302f2f',
      900: '#201f1f',
      950: '#0d0c0c'
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.600}',
          hoverColor: '{primary.700}'
        }
      }
    }
  },
  components: {
    datatable: {
      css: () => `
        .p-datatable-table {
          border-collapse: unset;
        }
        .p-datatable-thead > tr > th {
          border-width: 1px 0 1px 0;
        }
        .p-paginator-rpp-dropdown {
          order: 1;
        }
        .p-ripple {
          order: 2;
        }
        .p-paginator-pages {
          order: 2;
        }
        .p-paginator {
          justify-content: end !important;
        }
        .p-paginator-current {
          order: 2;
          margin-right: 30px;
          margin-left: 30px;
        }
      `
    },
    divider: {
      css: () => `
        :root {
          --p-divider-horizontal-margin: 2rem 0;
        }
      `
    },
    dialog: {
      extend: {
        header: {
          background: '#F3F4F4',
          border: '#D2D4D5'
        }
      },
      css: ({ dt }: { dt: (key: string) => string }) => `
          .p-dialog-header {
            background: ${dt('dialog.header.background')};
            border-bottom: 1px solid ${dt('dialog.header.border')};
            border-top-left-radius: inherit;
            border-top-right-radius: inherit;
            padding: 16px;
          }
          .p-dialog-content {
            padding: 16px;
          }
          .p-stepper-separator {
          background: repeating-linear-gradient(
            90deg,
            #fff,
            #fff 5px,
            #cdcccb 5px,
            #cdcccb 10px
          ) !important;
          }
        `
    },
    tabs: {
      css: () => `
        :root {
          --p-tabs-tab-border-width: 0;
          --p-tabs-active-bar-height: 4px;
          --p-tabs-tab-active-background: #F9FAFA;
          --p-tabs-tabpanel-padding: 0px;
        }
        .p-tab {
          font-size: 1rem;
        }
      `
    },
    select: {
      css: () =>
        // we need to override the style of the select of the sections tab
        `
        .select-panel .p-select-option:not(.p-select-option-selected):not(.p-disabled).p-focus {
          background: unset;
          color: unset;
          cursor: auto;
        }
      `
    },
    stepper: {
      css: ({ dt }: { dt: (key: string) => string }) => `
        :root {
          --p-stepper-active-bar-height: 4px;
          --p-stepper-step-gap: 0px;
          --p-stepper-step-number-active-background: ${dt('primary.600')};
          --p-stepper-step-number-active-color: white;
        }
        .p-step-header {
          flex-direction: column;
        }
        .p-step {
          padding: 0px;
        }
        .p-stepper-separator {
          transform: translateY(-12px);
        }
        .p-step-active .p-step-title {
          font-weight: bold;
        }
      `
    },
    radiobutton: {
      css: ({ dt }: { dt: (key: string) => string }) => `
        :root {
          --p-radiobutton-icon-checked-color: ${dt('primary.600')};
          --p-radiobutton-icon-checked-hover-color: ${dt('primary.600')};
          --p-radiobutton-checked-background: white;
          --p-radiobutton-checked-hover-background: white;
        }
      `
    }
  }
});
