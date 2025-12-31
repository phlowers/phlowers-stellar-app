# Deployment Checklist

## Pre-Deployment (one-time)

### Dependencies

- [ ] `brotli` installed: `apt-get install brotli`
- [ ] Python 3.12+ available
- [ ] Read/write access to `public/pyodide/`

### Generating compressed files

```bash
npm run set-up-mechaphlowers
```

Verify output:
- [ ] `public/pyodide/*.whl` downloaded
- [ ] `public/pyodide/*.whl.br` created (4 large files > 1 MB)
- [ ] `public/pyodide/*.whl.gz` created (gzip fallback)
- [ ] `src/app/core/services/worker_python/python-packages.json` generated

Example output:
```
Compressing 4 large files (>= 1.0 MB)
Skipping 22 small files (< 1.0 MB)

plotly                       25.38 MB →    18.69 MB (26.4%) [brotli + gzip]
pandas                       12.15 MB →    11.88 MB (  2.2%) [brotli + gzip]
numpy                        18.35 MB →    18.02 MB (  1.7%) [brotli + gzip]
pydantic_core                 1.98 MB →     1.97 MB (  0.6%) [brotli + gzip]

Total: 57.86 MB → 50.56 MB
Savings: 7.30 MB (12.6%)
```

## Apache Configuration (server)

### Apache Modules

```bash
# Enable modules
a2enmod rewrite
a2enmod headers
a2enmod deflate
a2enmod brotli
a2enmod ssl

# Restart
systemctl restart apache2

# Verify
apache2ctl -M | grep rewrite
apache2ctl -M | grep headers
apache2ctl -M | grep deflate
apache2ctl -M | grep brotli
apache2ctl -M | grep ssl
```

- [ ] `mod_rewrite` enabled
- [ ] `mod_headers` enabled
- [ ] `mod_deflate` enabled
- [ ] `mod_brotli` enabled
- [ ] `mod_ssl` enabled

### httpd.conf Configuration

Copy the `httpd.conf` file from repo to Apache configuration:

```bash
cp httpd.conf /etc/apache2/sites-available/stellar.conf
a2ensite stellar
a2dissite default-ssl  # if necessary
systemctl restart apache2
```

This file includes:
- ✅ Rewriting to serve `.whl.br` (Brotli) as primary
- ✅ Fallback `.whl.gz` (Gzip) for old clients
- ✅ Correct `Content-Encoding` headers
- ✅ Cache-Control per file type
- ✅ HTTPS forcing (HTTP → HTTPS)
- ✅ Security headers (HSTS, X-Content-Type-Options, etc.)

## File Deployment

### Web root structure

```
/var/www/stellar/
├── index.html
├── service-worker.js
├── manifest.webmanifest
├── main.*.js          ← Hashed angular assets
├── styles.*.css       ← Hashed angular assets
├── pyodide/
│   ├── *.whl          ← Original files (26 files)
│   ├── *.whl.br       ← Brotli (4 large files)
│   ├── *.whl.gz       ← Gzip fallback (4 large files)
│   ├── pyodide.asm.js
│   ├── pyodide.asm.wasm
│   ├── python_stdlib.zip
│   └── pyodide-lock.json
├── config/
│   └── python-packages.json  ← Pyodide configuration
└── fonts/, icons/, img/      ← Static assets
```

### Deployment commands

```bash
# Copy Angular build files
scp -r dist/* user@server:/var/www/stellar/

# Copy all Pyodide files
scp -r public/pyodide/* user@server:/var/www/stellar/pyodide/

# Copy Python configuration
scp src/app/core/services/worker_python/python-packages.json \
    user@server:/var/www/stellar/config/

# Verify on server
ssh user@server
ls -lh /var/www/stellar/pyodide/ | wc -l  # Should see ~78 files (26*3)
ls -lh /var/www/stellar/config/python-packages.json
```

- [ ] Angular build copied
- [ ] All `*.whl` copied
- [ ] All `*.whl.br` copied (4 files)
- [ ] All `*.whl.gz` copied (4 files)
- [ ] `python-packages.json` copied

### Permissions

```bash
# On server
chmod 644 /var/www/stellar/pyodide/*.whl*
chmod 644 /var/www/stellar/config/python-packages.json
chown -R www-data:www-data /var/www/stellar/
```

- [ ] `.whl` files readable by Apache (644)
- [ ] `.whl.br` files readable (644)
- [ ] `.whl.gz` files readable (644)
- [ ] Owner = `www-data` or Apache user

## Post-Deployment Verification

### Basic tests

```bash
# Homepage accessible
curl -I https://example.com/
# Must return: 200 OK

# Service worker accessible
curl -I https://example.com/service-worker.js
# Must return: 200 OK, Cache-Control: no-cache

# Wheel file accessible
curl -I https://example.com/pyodide/numpy.whl
# Must return: 200 OK
```

- [ ] Homepage accessible (https)
- [ ] Service worker accessible
- [ ] Wheel files accessible

### Brotli compression test

```bash
# Request with Accept-Encoding: br
curl -I -H "Accept-Encoding: br" https://example.com/pyodide/plotly.whl

# Verify response:
# Content-Encoding: br           ✅
# Content-Type: application/zip   ✅
# Content-Length: ~19000000      ✅ (plotly 26% compressed)
```

- [ ] `Content-Encoding: br` present
- [ ] `Content-Type: application/zip` correct
- [ ] Compressed size visible (plotly 26%, pandas/numpy ~2%)

### Gzip compression test (fallback)

```bash
# Request without Brotli (or with Accept-Encoding: gzip only)
curl -I -H "Accept-Encoding: gzip;q=0" https://example.com/pyodide/plotly.whl

# Verify response:
# Content-Encoding: gzip         ✅ (if brotli not available)
# Content-Type: application/zip   ✅
# Content-Length: ~19000000      ✅ (same as br)
```

- [ ] `Content-Encoding: gzip` present when brotli unavailable
- [ ] Only 4 large files have .gz (numpy, pandas, plotly, pydantic_core)

### HTTPS forcing test

```bash
# HTTP request
curl -I http://example.com/

# Must return:
# HTTP/1.1 301 Moved Permanently
# Location: https://example.com/
```

- [ ] HTTP redirects to HTTPS (301)
- [ ] HSTS header present: `Strict-Transport-Security: ...`

### Cache headers test

```bash
# Hashed assets (1 year)
curl -I https://example.com/main.abc123def456.js
# Cache-Control: max-age=31536000, immutable

# Config (1 hour)
curl -I https://example.com/config/python-packages.json
# Cache-Control: max-age=3600

# Service worker (no cache)
curl -I https://example.com/service-worker.js
# Cache-Control: no-cache, no-store, must-revalidate
```

- [ ] Hashed assets: `max-age=31536000`
- [ ] JSON config: `max-age=3600`
- [ ] Service worker: `no-cache`

### Security headers test

```bash
# Check security headers
curl -I https://example.com/ | grep -i "X-Content-Type-Options\|X-Frame-Options\|Referrer-Policy"

# Must have:
# X-Content-Type-Options: nosniff      ✅
# X-Frame-Options: SAMEORIGIN          ✅
# Referrer-Policy: strict-origin-when-cross-origin ✅
```

- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: SAMEORIGIN`
- [ ] `Referrer-Policy` present
- [ ] HSTS header present

### Python worker test

Complete Pyodide testing is in the app itself:
1. Open the page
2. Verify Pyodide loads without console errors
3. Execute simple Python code

```bash
# Check logs
# Should see: "Pyodide loaded successfully"
# No error: "Failed to load wheel"
```

- [ ] JavaScript console without errors
- [ ] Pyodide loads wheels successfully
- [ ] Python code executes without error

## Rollback

### In case of problems

```bash
# Restore previous version
scp -r backup/previous-version/* user@server:/var/www/stellar/

# Restart Apache
ssh user@server "systemctl restart apache2"

# Verify
curl -I https://example.com/
```

## Post-Deployment Monitoring

### Regular verification

```bash
# Verify files still exist
ssh user@server "ls -lh /var/www/stellar/pyodide/ | wc -l"
# Should return ~78 (26 .whl + 4 .whl.br + 4 .whl.gz + pyodide files)

# Verify disk usage
ssh user@server "du -sh /var/www/stellar/pyodide/"
# Should show: 26 wheels (62 MB) + 4 .br (7.3 MB) + 4 .gz (~7.3 MB) ≈ 76 MB

# Verify permissions
ssh user@server "ls -l /var/www/stellar/pyodide/*.whl | head -1"
# Must be readable
```

### Apache logs

```bash
# Errors
tail -f /var/log/apache2/error.log

# Access
tail -f /var/log/apache2/access.log | grep "pyodide"

# Look for rewriting errors
grep "mod_rewrite" /var/log/apache2/error.log
```

## Regular Maintenance

### Adding a new Pyodide package

```bash
# 1. Local - run complete setup again
npm run set-up-mechaphlowers
# This re-downloads all packages + compresses large ones

# 2. Deploy all files
scp -r public/pyodide/* user@server:/var/www/stellar/pyodide/
scp src/app/core/services/worker_python/python-packages.json \
    user@server:/var/www/stellar/config/

# 3. Verify
curl -I https://example.com/pyodide/new_package.whl
```

### Renewing SSL certificate

```bash
# Let's Encrypt + Certbot
certbot renew

# Verify expiration date
openssl x509 -in /etc/ssl/certs/cert.pem -noout -dates
```
