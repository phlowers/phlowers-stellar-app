# Plan: Auth-gated PWA install and update flow

## Context

The application currently computes PWA install/update availability in `UpdateService` and opens a global dialog from `AppComponent` whenever `needUpdate()` is true. The requested behavior changes are:

- The install/update popup must never appear for unauthenticated users.
- The first installation must start automatically instead of waiting for a confirmation popup.
- The popup must remain only for true application updates.

Impacted areas are limited to Angular startup/application services and the root presentation layer. No Python or Pyodide change is expected.

## Steps

1. [x] **Step 1 - Refine pending PWA action state**

- **Layer**: application
- **Files**: `src/app/core/services/worker_update/worker_update.service.ts`
- **Action**: Modify
- **Details**: Replace the current implicit `needUpdate + isFirstLaunch` combination with an explicit decision flow that distinguishes `none`, `first-install`, and `update-available`. Keep `checkForUpdateOnce()` responsible for detecting cache-empty first launch versus version mismatch, but make the service expose state that the UI can consume without guessing. Preserve the existing manual admin update capability.
- **Acceptance**: The service can express, after startup check, whether there is no action, a pending first install, or a pending update, and this state remains stable until the UI or service worker completes the action.

2. [x] **Step 2 - Gate startup behavior on authenticated user state**

- **Layer**: application
- **Files**: `src/app/core/services/worker_update/worker_update.service.ts`, `src/app/core/services/auth/auth.service.ts`
- **Action**: Modify
- **Details**: Ensure PWA install/update prompts are only actionable when `AuthService.currentUser()` is populated. Cover the important delayed-auth case: when the app starts on `/login`, the startup check may already have found a pending first install or update before the user logs in. The plan should therefore keep the pending action in service state, then allow the presentation layer to react once authentication becomes available, without re-running broad startup initialization.
- **Acceptance**: An unauthenticated session never surfaces the install/update popup, while a later successful login still has enough state available to trigger the right next action.

3. [x] **Step 3 - Auto-run first install and restrict dialog to updates**

- **Layer**: presentation
- **Files**: `src/app/app.component.ts`, `src/app/app.component.html`
- **Action**: Modify
- **Details**: Rework the root component effects so they observe both authenticated user state and the pending PWA action. If the pending action is `first-install` and the user is authenticated, launch installation automatically and keep the dialog closed. If the pending action is `update-available` and the user is authenticated, open the dialog. Remove first-install-specific dialog copy/actions so the dialog becomes update-only.
- **Acceptance**: First install starts automatically after authentication, including when login happens after bootstrap; the root dialog opens only for updates; the login page never displays the update dialog.

4. [x] **Step 4 - Align secondary presentation surfaces**

- **Layer**: presentation
- **Files**: `src/app/features/home/presentation/pages/home/home.component.ts`, `src/app/features/admin/presentation/pages/admin/admin.ts`, `src/app/features/admin/presentation/pages/admin/admin.html`
- **Action**: Modify
- **Details**: Review and adjust presentation text/actions that currently rely on `needUpdate()` alone so they remain semantically correct once first install is auto-triggered and only updates are user-confirmed. Keep the admin page as the explicit manual control surface for checking/applying updates.
- **Acceptance**: Home/admin UI does not incorrectly advertise a manual update prompt during first install, and update-related controls remain coherent with the new flow.

5. [x] **Step 5 - Update service tests**

- **Layer**: application
- **Files**: `src/app/core/services/worker_update/worker_update.service.spec.ts`
- **Action**: Modify
- **Details**: Extend unit tests to cover the new pending-action model, unauthenticated suppression, first-install persistence until login, and update detection for authenticated sessions. Keep existing service worker completion tests aligned with the revised state transitions.
- **Acceptance**: The spec proves that first install is identified separately from update, no popup-driving update state is exposed to unauthenticated users, and the service resets state correctly after install/update completion.

6. [x] **Step 6 - Update root component tests**

- **Layer**: presentation
- **Files**: `src/app/app.component.spec.ts`
- **Action**: Modify
- **Details**: Add rendering/behavior tests for three scenarios: unauthenticated startup with pending action, authenticated first install, and authenticated update available. Verify that the dialog is hidden for unauthenticated users, hidden during automatic install, and visible only for authenticated update cases.
- **Acceptance**: Root component tests fail if the dialog reappears on the login page or if first install stops auto-starting after login.

7. [x] **Step 7 - Validate and review**

- **Layer**: application + presentation
- **Files**: `src/app/core/services/worker_update/worker_update.service.spec.ts`, `src/app/app.component.spec.ts`
- **Action**: Modify / Verify
- **Details**: Run the focused Vitest specs for the touched service/component (`/skill-test`), then perform a final implementation audit (`/skill-review`) to confirm the auth gating, delayed-login flow, and update-only dialog behavior.
- **Acceptance**: Targeted tests pass and the review confirms there is no regression where install/update UI becomes visible before authentication.