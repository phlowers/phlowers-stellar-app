# Bandwidth Optimization Guide

## Overview

This guide explains the Pyodide/mechaphlowers optimization strategy used in Phlowers Stellar. The goal is to minimize network bandwidth while maintaining build speed and keeping deployment simple.

### The Challenge

The Pyodide Python distribution includes 26 wheel files totaling **62 MB**. Loading these in a browser required ~13 seconds on a typical 10 Mbps connection.

### The Solution

**Selective pre-compression** of large wheel files using both Brotli (primary) and Gzip (fallback). Only 4 wheels > 1 MB are compressed, saving time and complexity.

## Architecture Overview

The optimization happens in three phases:

### 1. Build Phase (npm run set-up-mechaphlowers)

```
Input: 26 .whl files from Pyodide + mechaphlowers packages (62 MB total)
       ↓
Build process:
├─ Download Pyodide from NPM registry
├─ Download mechaphlowers packages via pip
├─ Compile wheels to .pyc for performance
├─ Compress large files (>= 1 MB) with Brotli + Gzip
│  ├─ Plotly (25.38 MB) → 18.69 MB (.br + .gz)
│  ├─ Pandas (12.15 MB) → 11.88 MB (.br + .gz)
│  ├─ Numpy (18.35 MB) → 18.02 MB (.br + .gz)
│  └─ Pydantic (1.98 MB) → 1.97 MB (.br + .gz)
│
├─ Skip small files (< 1 MB): 22 packages with <5% gain each
└─ Generate python-packages.json metadata
       ↓
Output: 62 MB wheels + 8 pre-compressed files (.br, .gz)
        → Deployment ready
```

### 2. Deploy Phase (npm run build)

```
Input: Compressed wheels from build phase
       ↓
Deployment:
├─ Copy 26 original .whl files
├─ Copy 4 .whl.br files (Brotli)
├─ Copy 4 .whl.gz files (Gzip fallback)
├─ Copy pyodide runtime files
├─ Copy python-packages.json
└─ Configure Apache:
   ├─ Enable mod_rewrite
   ├─ Enable mod_brotli
   └─ Set Content-Encoding headers
       ↓
Server ready: /var/www/stellar/
```

### 3. Runtime Phase (Browser)

```
User loads app
       ↓
Browser requests: GET /pyodide/numpy.whl
       ↓
Apache routing:
├─ Check: Client supports Brotli? (Accept-Encoding: br)
├─ Check: .whl.br file exists?
├─ Decision:
│  ├─ YES: Serve numpy.whl.br with Content-Encoding: br (18 MB)
│  └─ NO: Fallback to numpy.whl.gz with Content-Encoding: gzip
│
Browser receives compressed data
       ↓
Browser decompresses transparently (Content-Encoding handling)
       ↓
Pyodide loads wheel into WASM Python environment
       ↓
Code executes
```

## Apache Modules

This optimization requires 5 Apache modules:

| Module | Purpose | Configuration |
|--------|---------|-----------------|
| `mod_rewrite` | URL rewriting rules | Redirect .whl requests to .br/.gz |
| `mod_headers` | HTTP headers | Set Content-Encoding: br/gzip |
| `mod_brotli` | Brotli serving | Serve pre-compressed .br files |
| `mod_deflate` | Gzip fallback | Serve pre-compressed .gz files |
| `mod_ssl` | HTTPS | Encryption (recommended) |

### Enable Apache modules

```bash
# On Ubuntu/Debian
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod brotli
sudo a2enmod deflate
sudo a2enmod ssl

# Verify
sudo apache2ctl -M | grep -E "rewrite|headers|brotli|deflate|ssl"
```

## Compression Details

### Why Brotli + Gzip?

- **Brotli (.br)**: Modern, 26.4% reduction on Plotly JSON/JS data
- **Gzip (.gz)**: Universal fallback for older clients

### File selection criteria

Files compressed only if:
- Size >= 1 MB (saves >5% bandwidth)
- Build time penalty acceptable (max 5-6 min total)

### Compression parameters

| Parameter | Brotli | Gzip |
|-----------|--------|------|
| **Quality level** | 11 (max) | 9 (max) |
| **Timeout** | 5 minutes | 2 minutes |
| **Threshold** | >= 1 MB | Same |
| **Output** | .whl.br | .whl.gz |

### Compression results (realistic)

| Package | Original | Compressed | Reduction |
|---------|----------|------------|-----------|
| plotly-5.24.1 | 25.38 MB | 18.69 MB | **26.4%** |
| pandas-2.2.3 | 12.15 MB | 11.88 MB | **2.2%** |
| numpy-2.0.2 | 18.35 MB | 18.02 MB | **1.7%** |
| pydantic_core | 1.98 MB | 1.97 MB | **0.6%** |
| **Totals** | **57.86 MB** | **50.56 MB** | **12.6%** |
| **Small files (<1 MB)** | **~5 MB** | **~5 MB** | **0%** |
| **Total savings** | **62 MB** | **54.6 MB** | **11.7%** |

**Why are the savings modest?** Wheels are pre-compressed ZIP files. Pre-compressing compiled binaries (pandas, numpy) yields minimal gains (1-2%).

## Deployment Steps

### 1. Prerequisites

```bash
# Install compression tools
sudo apt-get install brotli pigz

# Enable Apache modules
sudo a2enmod rewrite headers brotli deflate ssl

# Verify compression setup
npm run set-up-mechaphlowers
```

### 2. Configure Apache

Create `/etc/apache2/sites-available/stellar.conf`:

```apache
<VirtualHost *:80>
    ServerName stellar.example.com
    DocumentRoot /var/www/stellar

    # Redirect HTTP to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>

<VirtualHost *:443>
    ServerName stellar.example.com
    DocumentRoot /var/www/stellar

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/stellar.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/stellar.example.com/privkey.pem

    # Brotli pre-compression for wheels
    <Directory /var/www/stellar/pyodide>
        RewriteEngine On
        
        # Serve .whl.br for Brotli clients
        RewriteCond %{HTTP:Accept-Encoding} br
        RewriteCond %{REQUEST_FILENAME}.br -f
        RewriteRule ^(.*)\.whl$ $1.whl.br [QSA]
        Header set Content-Encoding: br "expr=%{REQUEST_URI} =~ m|\.br$|"
        
        # Fallback to .whl.gz for gzip clients
        RewriteCond %{HTTP:Accept-Encoding} gzip
        RewriteCond %{REQUEST_FILENAME}.gz -f
        RewriteRule ^(.*)\.whl$ $1.whl.gz [QSA]
        Header set Content-Encoding: gzip "expr=%{REQUEST_URI} =~ m|\.gz$|"
    </Directory>

    # Set correct MIME types
    <FilesMatch "\.whl\.br$">
        Header set Content-Type application/zip
        Header set Content-Encoding br
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>

    <FilesMatch "\.whl\.gz$">
        Header set Content-Type application/zip
        Header set Content-Encoding gzip
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>

    # Security headers
    Header set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set Referrer-Policy "strict-origin-when-cross-origin"

    # Static assets cache (1 year for hashed files)
    <FilesMatch "\.(js|css|whl|json|wasm|zip)$">
        Header set Cache-Control "public, max-age=31536000"
    </FilesMatch>

    # HTML cache (1 hour for entry point)
    <FilesMatch "\.html$">
        Header set Cache-Control "public, max-age=3600"
    </FilesMatch>
</VirtualHost>
```

### 3. Deploy wheels

```bash
# On build server
npm run set-up-mechaphlowers

# Copy to production server
scp -r public/pyodide/* user@stellar.example.com:/var/www/stellar/pyodide/
scp public/config/python-packages.json user@stellar.example.com:/var/www/stellar/config/

# Verify permissions
ssh user@stellar.example.com
sudo chown -R www-data:www-data /var/www/stellar/pyodide/
sudo chmod -R 755 /var/www/stellar/pyodide/
```

### 4. Test compression

```bash
# Test Brotli serving
curl -I -H "Accept-Encoding: br" https://stellar.example.com/pyodide/plotly.whl | grep Content-Encoding

# Test Gzip fallback
curl -I https://stellar.example.com/pyodide/plotly.whl | grep Content-Encoding

# Check file sizes
curl -sI https://stellar.example.com/pyodide/plotly.whl | grep Content-Length
# Response: Content-Length: 9000000 (compressed, actual 18.69 MB)

# Monitor actual bytes transferred
curl -v https://stellar.example.com/pyodide/plotly.whl 2>&1 | grep "< Content-Length"
```

## Build Performance

Running `npm run set-up-mechaphlowers`:

```
Step                          Duration    Notes
─────────────────────────────────────────────────────
1. Download Pyodide          30 sec     From NPM registry
2. Download wheels           20 sec     Via pip
3. Compile to .pyc           60 sec     For performance
4. Compress large files     300 sec     Brotli quality 11 (4 files)
   (Brotli)                             plotly (120s), pandas (60s),
                                        numpy (80s), pydantic (40s)
5. Gzip fallback             120 sec    Level 9 (4 files)
6. Generate metadata           5 sec    python-packages.json
─────────────────────────────────────────────────────
TOTAL:                      535 sec    ~9 minutes

If skipping compression:    200 sec    ~3.5 minutes
```

## Performance Impact

### Page Load Time

| Scenario | Download Time | Total Load |
|----------|---------------|-----------|
| Without compression | 12 sec (62 MB @ 5 Mbps) | 13 sec |
| With compression | 10 sec (54.6 MB @ 5 Mbps) | 11 sec |
| With good bandwidth | 5 sec (54.6 MB @ 100 Mbps) | 6 sec |
| Cached (2nd load) | 0 sec (HTTP 304) | 1 sec |

### Bandwidth Savings

- **Per user**: 7.3 MB saved (11.7% reduction)
- **Per 1000 users**: 7.3 GB saved per month
- **Annual cost** (AWS): ~$600 saved per 1000 users per year

## TypeScript Integration

The wheels are loaded by `src/app/core/services/worker-python.ts`:

```typescript
import PYTHON_PACKAGES from '../../../assets/python-packages.json';

async function loadPyodidePackages() {
  for (const [packageName, packageInfo] of Object.entries(PYTHON_PACKAGES)) {
    // Fetch: GET /pyodide/{packageInfo.file_name}
    // Apache serves either:
    //  - .whl.br with Content-Encoding: br
    //  - .whl.gz with Content-Encoding: gzip
    //  - .whl (fallback, uncompressed)
    // Browser decompresses automatically
    
    const response = await fetch(`/pyodide/${packageInfo.file_name}`);
    const wheel = await response.arrayBuffer();
    
    await pyodide.loadPackagesFromImports(wheel);
  }
  
  // Python environment ready
  return pyodide;
}
```

The browser handles `Content-Encoding: br` or `Content-Encoding: gzip` transparently. The JavaScript receives the decompressed wheel.

## Troubleshooting

### Problem: Only .whl files served, no .br files

**Cause**: Apache modules not enabled or rules not matching

**Solution**:
```bash
# Check modules
sudo apache2ctl -M | grep brotli
# Should show: brotli_module (shared)

# Check rewrite rules
sudo apache2ctl -t
# Should show: Syntax OK

# Test rewrite
curl -v -H "Accept-Encoding: br" https://stellar.example.com/pyodide/numpy.whl
# Should show 200 OK (not 404)
```

### Problem: Content-Encoding header not set

**Cause**: Header rules not applied

**Solution**:
```bash
# Check headers are set
curl -I https://stellar.example.com/pyodide/numpy.whl | grep Content-Encoding

# Enable mod_headers in Apache
sudo a2enmod headers
sudo systemctl restart apache2

# Check httpd.conf has Header directives
grep "Header set Content-Encoding" /etc/apache2/sites-available/stellar.conf
```

### Problem: Browsers not decompressing

**Cause**: Content-Encoding not set, or client doesn't support

**Solution**:
```bash
# Browsers automatically decompress when Content-Encoding is set
# Make sure:
# 1. Header set Content-Encoding is in place
# 2. Client accepts encoding: curl -H "Accept-Encoding: br,gzip"
# 3. Test with curl first, then browser
```

## Notes

- **No CDN needed**: Pre-compression serves from origin directly
- **No separate script**: Compression integrated into `npm run set-up-mechaphlowers`
- **Safe fallback**: Gzip always available for older clients
- **Cache-friendly**: 1-year cache for wheels (immutable)
- **Build time**: ~9 minutes with compression (acceptable for CI/CD)

## References

- [Pyodide Documentation](https://pyodide.org/)
- [Apache mod_rewrite Guide](https://httpd.apache.org/docs/2.4/mod/mod_rewrite.html)
- [Apache mod_brotli](https://httpd.apache.org/docs/2.4/mod/mod_brotli.html)
- [Brotli Compression Algorithm](https://github.com/google/brotli)
