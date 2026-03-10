---
html_theme.sidebar_secondary.remove: true
---

# Application Update

This page explains how Stellar updates itself and how your user data is preserved.

## What Gets Updated

When a new version is deployed, the application updates:

- application files (HTML, JavaScript, CSS)
- static assets listed in the manifest
- catalog CSV files (lines, cables, chains, maintenance, attachments, obstacle types)

## What Is Preserved

Your studies are not deleted during a normal update.

- user studies remain in IndexedDB
- only catalog tables are re-synchronized when needed

## How Updates Work

1. The Service Worker detects a new manifest version.
2. Application files are downloaded and replaced in the app cache.
3. The app compares CSV hashes.
4. Only catalogs whose CSV changed are re-imported.

This approach reduces network traffic, improves startup performance, and avoids unnecessary re-imports.

## When You Need to Act

In most cases, updates are automatic.

You may see an update notification when a new version is available. In that case:

1. Click the update button.
2. Wait for the confirmation message.
3. Reload the page if needed.

## User Best Practices

- Keep a single main Stellar tab open during an update.
- Avoid forcing multiple consecutive page reloads.
- If you are offline, reconnect and then reload the page.

## Troubleshooting

If you still see an old interface after deployment:

1. Close all open Stellar tabs.
2. Reopen the application.
3. Perform a full browser reload.

If the issue persists, contact support and provide:

- the version displayed in the interface
- the date and time
- the browser name and version
