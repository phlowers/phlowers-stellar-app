# E2E Tests - Playwright

This directory contains end-to-end tests for the Stellar application using Playwright.

## Prerequisites

### 1. Build the Application

E2E tests require a production build of the application:

```bash
npm run e2e:prepare
```

This command runs `npm run build:en` which creates a build in `dist/en/`.

### 2. Install Playwright Browsers

First time setup requires downloading the test browsers:

```bash
npx playwright install
```

### 3. Install System Dependencies (Linux only)

On Linux systems, additional libraries are required to run headless browsers:

#### For Debian/Ubuntu:
```bash
# Using Playwright (requires sudo)
sudo npx playwright install-deps

# Or using apt directly (requires sudo)
sudo apt-get install libx11-xcb1 libasound2t64 libgbm1
```

#### For Oracle Linux/RHEL/CentOS/Fedora:
```bash
# Using dnf (requires sudo)
sudo dnf install -y \
  libX11-xcb \
  alsa-lib \
  mesa-libgbm \
  mesa-libEGL \
  libxkbcommon \
  libXcomposite \
  libXdamage \
  libXrandr \
  libXcursor \
  gtk3 \
  dbus-glib \
  nss \
  nspr \
  atk \
  at-spi2-atk \
  cups-libs \
  liberation-fonts
```

**If you don't have sudo access:** E2E tests will not run locally but will work in CI/CD where dependencies are pre-installed.

## Running Tests

### Run All E2E Tests

```bash
npm run e2e
```

### Run Specific Test File

```bash
npx playwright test e2e/vtl-guying-bug-589.spec.ts
```

### Run with UI (Headed Mode)

```bash
npm run e2e:headed
```

### Debug Mode

```bash
npx playwright test --debug
```

### Run Specific Test by Name

```bash
npx playwright test --grep "should populate support options"
```

## Test Files

### `update-flow.spec.ts`
Tests the application's update mechanism: asset caching, catalog updates, and version management.

### `vtl-guying-bug-589.spec.ts`
**Regression tests for Bug #589: No support available in VHL/guying**

Tests the complete workflow of:
- Span selection populating support options
- VTL & Guying calculations
- Data persistence (save/reload)
- Form state management

See [bug-589-regression-tests.md](../docs/bug-589-regression-tests.md) for detailed documentation.

## Configuration

E2E tests are configured in [`playwright.config.ts`](../playwright.config.ts):

- **Test directory:** `./e2e`
- **Timeout:** 120 seconds per test
- **Workers:** 1 (no parallel execution)
- **Retries:** 1 (automatic retry on failure)
- **Base URL:** `http://127.0.0.1:4310`
- **Web Server:** Started automatically from `dist/en/`

## Troubleshooting

### Error: Dist directory does not exist

**Solution:** Build the application first:
```bash
npm run e2e:prepare
```

### Error: Executable doesn't exist at chrome-headless-shell

**Solution:** Install Playwright browsers:
```bash
npx playwright install
```

### Error: libgbm.so.1: cannot open shared object file

**Solution:** Install system dependencies (requires sudo):
```bash
sudo npx playwright install-deps
```

### Tests timing out or failing randomly

- Check that the web server is running (started automatically by Playwright)
- Verify that port 4310 is not already in use
- Try increasing timeout in `playwright.config.ts`
- Run tests one at a time: `npx playwright test --workers=1`

## CI/CD Integration

E2E tests should run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Build application
  run: npm run e2e:prepare

- name: Run E2E tests
  run: npm run e2e
```

## Writing New E2E Tests

### Test Structure

```typescript
import { expect, test } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Setup common to all tests
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const button = page.locator('[data-testid="my-button"]');
    
    // Act
    await button.click();
    
    // Assert
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Wait for elements** to be visible/enabled before interacting
3. **Add descriptive test names** that explain what is being tested
4. **Group related tests** using `test.describe()`
5. **Clean up test data** in `afterEach` hooks if needed
6. **Use page fixtures** instead of creating pages manually
7. **Add comments** for complex workflows or UI interactions

### Selectors Priority

1. `[data-testid="..."]` - Most stable
2. `role="button"` with accessible names - Semantic
3. Text content - Use for visible labels only
4. CSS classes - Least stable, avoid if possible

## Viewing Test Reports

After test execution, view the HTML report:

```bash
npx playwright show-report
```

View trace for failed tests:

```bash
npx playwright show-trace test-results/path-to-trace.zip
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
