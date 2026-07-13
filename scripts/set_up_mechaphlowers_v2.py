# /// script
# requires-python = ">=3.13,<3.14"
# dependencies = ["requests == 2.32.3"]
# ///
"""Build stellar-engine and prepare Python packages for the Pyodide worker.

Steps:
  1. Build stellar-engine from source
  2. Download the Pyodide runtime
  3. Download stellar-engine's dependencies via pip (transitive resolution)
  4. Replace packages with pre-compiled CDN wheels when available
  5. Compile remaining wheels to bytecode and generate configuration

Usage:
    uv run scripts/set_up_mechaphlowers_v2.py
    uv run scripts/set_up_mechaphlowers_v2.py --local-cdn-dir /path/to/cdn
    uv run scripts/set_up_mechaphlowers_v2.py --local-mechaphlowers
    uv run scripts/set_up_mechaphlowers_v2.py --engine-only
"""

import argparse
import json
import re
import shutil
import subprocess
import tarfile
import tempfile
import zipfile
from pathlib import Path

import requests

# ── Configuration ────────────────────────────────────────────────────────────

SCRIPTS_DIR = Path(__file__).parent
PACKAGE_JSON = SCRIPTS_DIR.parent / "package.json"
PYODIDE_DIR = Path("./public/pyodide")
PACKAGES_JSON = Path(
    "./src/app/core/services/worker_python/python-packages.json"
)
SE_DIR = Path("./stellar-engine")
SE_DIST = SE_DIR / "dist"
SE_INPUT = SE_DIR / "input"
CONSTRAINTS = SCRIPTS_DIR / "constraints.in"
CORE_FILES = (
    "pyodide.asm.wasm",
    "pyodide.asm.js",
    "python_stdlib.zip",
    "pyodide-lock.json",
)


# ── Utilities ────────────────────────────────────────────────────────────────


def norm(name: str) -> str:
    """Normalize package name (PEP 503)."""
    return re.sub(r"[-_.]+", "-", name).lower()


def parse_wheel(filename: str) -> tuple[str, str]:
    """Return ``(normalized_name, version)`` from a wheel filename."""
    parts = filename.split("-")
    return norm(parts[0]), parts[1] if len(parts) > 1 else ""


def wheels_in(directory: Path) -> list[str]:
    """List ``.whl`` filenames in *directory*."""
    return [f.name for f in directory.glob("*.whl") if f.is_file()]


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    """Run a command; exit on failure."""
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode:
        print(f"Error: {result.stderr}")
        raise SystemExit(1)
    return result


def find_wheel(directory: Path, pattern: str, label: str) -> Path:
    """Return the single wheel matching *pattern* in *directory*."""
    found = sorted(directory.glob(pattern))
    if len(found) != 1:
        print(
            f"Error: expected 1 {label} wheel in {directory}, found {len(found)}"
        )
        raise SystemExit(1)
    return found[0]


def wheel_deps(whl: Path) -> list[str]:
    """Extract non-extra ``Requires-Dist`` from a wheel."""
    with zipfile.ZipFile(whl) as zf:
        for path in zf.namelist():
            if not path.endswith("/METADATA"):
                continue
            deps = []
            for line in zf.read(path).decode().splitlines():
                if line.startswith("Requires-Dist:") and "; extra" not in line:
                    dep = re.split(r"\s*;\s*", line[14:].strip())[0].strip()
                    if dep:
                        deps.append(dep)
            return deps
    return []


def pyodide_version() -> str:
    """Read Pyodide version from ``package.json``."""
    return json.loads(PACKAGE_JSON.read_text())["dependencies"][
        "pyodide"
    ].lstrip("^~")


# ── Step 1 – Build stellar-engine ────────────────────────────────────────────


def build_stellar_engine(local_wheel: Path | None) -> Path:
    """Build stellar-engine, optionally patching mechaphlowers version."""
    print("\n[1/5] Building stellar-engine...")
    pyproject = SE_DIR / "pyproject.toml"

    if SE_DIST.exists():
        for f in SE_DIST.glob("stellar_engine*"):
            f.unlink()

    original = None
    if local_wheel:
        ver = parse_wheel(local_wheel.name)[1]
        original = pyproject.read_text()
        pyproject.write_text(
            re.sub(
                r'"mechaphlowers[^"]*"', f'"mechaphlowers=={ver}"', original
            )
        )
        print(f"  Patched pyproject.toml → mechaphlowers=={ver}")

    try:
        run(["uv", "build", "--wheel", "--directory", str(SE_DIR)])
    finally:
        if original is not None:
            pyproject.write_text(original)
            print("  Restored original pyproject.toml")

    whl = find_wheel(SE_DIST, "stellar_engine*.whl", "stellar-engine")
    print(f"  ✓ Built {whl.name}")
    return whl


# ── Step 2 – Download Pyodide runtime ────────────────────────────────────────


def download_pyodide(registry: str) -> None:
    """Download and extract Pyodide runtime from NPM."""
    ver = pyodide_version()
    print(f"\n[2/5] Downloading Pyodide runtime v{ver}...")

    with tempfile.TemporaryDirectory() as tmp:
        tgz = Path(tmp) / "pyodide.tgz"
        tgz.write_bytes(
            requests.get(
                f"{registry}/pyodide/-/pyodide-{ver}.tgz", timeout=60
            ).content
        )
        with tarfile.open(tgz, "r:gz") as tar:
            tar.extractall(path=PYODIDE_DIR, filter="data")

    pkg = PYODIDE_DIR / "package"
    if pkg.exists():
        for name in CORE_FILES:
            src = pkg / name
            if src.exists():
                shutil.move(str(src), str(PYODIDE_DIR / name))
        shutil.rmtree(pkg)

    print("  ✓ Done")


# ── Step 3 – Download packages ───────────────────────────────────────────────


def download_packages(
    se_wheel: Path, local_wheel: Path | None
) -> dict[str, str]:
    """Download stellar-engine's transitive dependencies via pip.

    Returns ``{normalized_name: version}`` for all wheels in output dir.
    """
    print("\n[3/5] Downloading packages...")
    deps = wheel_deps(se_wheel)
    print(f"  stellar-engine requires: {', '.join(deps)}")

    cmd = [
        "uvx",
        "--python",
        ">=3.13,<3.14",
        "pip",
        "download",
        "-d",
        str(PYODIDE_DIR),
        "-c",
        str(CONSTRAINTS),
        *deps,
    ]
    if local_wheel:
        cmd.extend(["--find-links", str(SE_INPUT)])
    run(cmd)

    shutil.copy(se_wheel, PYODIDE_DIR / se_wheel.name)

    if local_wheel:
        pat = parse_wheel(local_wheel.name)[0].replace("-", "_")
        for w in PYODIDE_DIR.glob(f"{pat}*.whl"):
            if w.name != local_wheel.name:
                w.unlink()
        shutil.copy(local_wheel, PYODIDE_DIR / local_wheel.name)
        print(f"  Using local wheel: {local_wheel.name}")

    result = dict(parse_wheel(w) for w in wheels_in(PYODIDE_DIR))
    print(f"  ✓ {len(result)} packages ready")
    return result


# ── Step 4 – Replace with CDN wheels ─────────────────────────────────────────


def replace_with_cdn(
    downloaded: dict[str, str], cdn_url: str, local_cdn: Path | None
) -> set[str]:
    """Replace pip-downloaded wheels with CDN versions where versions match.

    Returns the set of CDN wheel filenames kept in the output directory.
    """
    label = f"local CDN ({local_cdn})" if local_cdn else "CDN"
    print(f"\n[4/5] Replacing with {label} wheels...")

    if local_cdn:
        lock_data = json.loads((local_cdn / "pyodide-lock.json").read_text())
    else:
        resp = requests.get(f"{cdn_url}/pyodide-lock.json", timeout=30)
        resp.raise_for_status()
        lock_data = resp.json()

    cdn_names: set[str] = set()
    missing: list[tuple[str, str]] = []

    for pkg in lock_data.get("packages", {}).values():
        name = norm(pkg.get("name", ""))
        ver, fname = pkg.get("version", ""), pkg.get("file_name", "")
        if name not in downloaded or downloaded[name] != ver:
            continue

        for w in PYODIDE_DIR.glob(f"{name.replace('-', '_')}*.whl"):
            w.unlink()

        try:
            if local_cdn:
                src = next(
                    (
                        local_cdn / v
                        for v in (
                            fname,
                            fname.replace(
                                "-py3-none-any.whl", "-cp313-none-any.whl"
                            ),
                            fname.replace(
                                "-py2.py3-none-any.whl", "-cp313-none-any.whl"
                            ),
                        )
                        if (local_cdn / v).exists()
                    ),
                    None,
                )
                if src:
                    shutil.copy(src, PYODIDE_DIR / src.name)
                    cdn_names.add(src.name)
                    print(f"  ✓ {name} ({ver})")
                else:
                    missing.append((name, fname))
                    print(f"  ✗ {name}: {fname} not found")
            else:
                data = requests.get(f"{cdn_url}/{fname}", timeout=60).content
                (PYODIDE_DIR / fname).write_bytes(data)
                cdn_names.add(fname)
                print(f"  ✓ {name} ({ver})")
        except (requests.RequestException, OSError) as exc:
            print(f"  ✗ {name}: {exc}")

    if local_cdn and missing:
        print(f"\n  ✗ {len(missing)} wheel(s) missing from local CDN:")
        for n, f in missing:
            print(f"    - {n}: {f}")
        raise SystemExit(1)

    print(f"  ✓ Replaced {len(cdn_names)} packages with {label} versions")
    return cdn_names


# ── Step 5 – Compile, deduplicate & generate config ──────────────────────────


def deduplicate(cdn_names: set[str]) -> None:
    """Keep one wheel per package (wasm32 for CDN, cp313 otherwise)."""
    by_name: dict[str, list[str]] = {}
    for w in wheels_in(PYODIDE_DIR):
        by_name.setdefault(parse_wheel(w)[0], []).append(w)

    for name, ws in by_name.items():
        if len(ws) <= 1:
            continue
        prefs = (
            ("pyodide", "-cp313-")
            if name in cdn_names
            else ("-cp313-", "pyodide")
        )
        keep = (
            next((w for w in ws if prefs[0] in w.lower()), None)
            or next((w for w in ws if prefs[1] in w.lower()), None)
            or ws[0]
        )
        for w in ws:
            if w != keep:
                (PYODIDE_DIR / w).unlink()


def compile_wheels(cdn_names: set[str]) -> None:
    """Compile non-CDN wheels to bytecode with ``pyodide py-compile``."""
    print("\n[+] Compiling wheels...")
    safe = PYODIDE_DIR / ".protected"
    safe.mkdir(exist_ok=True)

    # Protect core files and CDN wheels from compilation
    to_protect = [PYODIDE_DIR / n for n in CORE_FILES] + [
        w
        for w in PYODIDE_DIR.glob("*.whl")
        if parse_wheel(w.name)[0] in cdn_names
    ]
    moved = []
    for src in to_protect:
        if src.exists():
            shutil.move(str(src), str(safe / src.name))
            moved.append(src.name)

    cdn_count = sum(1 for m in moved if m.endswith(".whl"))
    if cdn_count:
        print(f"  Skipping {cdn_count} CDN wheels (already compiled)")

    result = subprocess.run(
        [
            "uvx",
            "--from",
            "pyodide-build",
            "pyodide",
            "py-compile",
            "--compression-level",
            "6",
            str(PYODIDE_DIR),
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode:
        print(f"  ✗ pyodide py-compile failed (exit {result.returncode})")
        print(f"    stdout: {result.stdout}")
        print(f"    stderr: {result.stderr}")
        raise SystemExit(1)

    for name in moved:
        shutil.move(str(safe / name), str(PYODIDE_DIR / name))
    safe.rmdir()

    for old in PYODIDE_DIR.glob("*.old"):
        old.unlink()

    print("  ✓ Done")


def finalize(cdn_names: set[str], downloaded: dict[str, str]) -> int:
    """Write ``python-packages.json`` and verify all dependencies."""
    packages = {}
    for w in wheels_in(PYODIDE_DIR):
        name = parse_wheel(w)[0]
        packages[name] = {
            "file_name": w,
            "name": w.split("-")[0],
            "source": "cdn" if name in cdn_names else "local",
        }
    PACKAGES_JSON.parent.mkdir(parents=True, exist_ok=True)
    PACKAGES_JSON.write_text(
        json.dumps(packages, ensure_ascii=False, indent=2, sort_keys=True)
    )

    print("\n[✓] Verifying dependencies...")
    installed = dict(parse_wheel(w) for w in wheels_in(PYODIDE_DIR))
    problems = [
        (n, v, installed.get(n, "MISSING"))
        for n, v in downloaded.items()
        if installed.get(n) != v
    ]
    if problems:
        for n, expected, got in sorted(problems):
            print(f"    - {n}: expected {expected}, got {got}")
        raise SystemExit(1)

    print(f"  ✓ All {len(downloaded)} packages verified")
    return len(packages)


# ── Engine-only mode ──────────────────────────────────────────────────────────


def engine_only(local_wheel: Path | None) -> None:
    """Build stellar-engine, place it in PYODIDE_DIR, update packages JSON."""
    se_wheel = build_stellar_engine(local_wheel)

    # Remove old stellar-engine wheels from PYODIDE_DIR
    for old in PYODIDE_DIR.glob("stellar_engine*.whl"):
        old.unlink()

    dest = PYODIDE_DIR / se_wheel.name
    shutil.copy(se_wheel, dest)
    print(f"  Copied {se_wheel.name} → {dest}")

    # Update only the stellar-engine entry in python-packages.json
    packages = json.loads(PACKAGES_JSON.read_text())
    packages["stellar-engine"] = {
        "file_name": se_wheel.name,
        "name": se_wheel.name.split("-")[0],
        "source": "local",
    }
    PACKAGES_JSON.write_text(
        json.dumps(packages, ensure_ascii=False, indent=2, sort_keys=True)
    )
    print(f"  ✓ Updated stellar-engine in {PACKAGES_JSON}")


# ── Main ─────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build stellar-engine and prepare Python packages for Pyodide",
    )
    parser.add_argument(
        "--npm-registry-url", default="https://registry.npmjs.org/"
    )
    parser.add_argument(
        "--local-cdn-dir",
        type=Path,
        help="Local directory with pre-downloaded CDN wheels",
    )
    parser.add_argument(
        "--local-mechaphlowers",
        action="store_true",
        help="Use a local mechaphlowers wheel from stellar-engine/input/",
    )
    parser.add_argument(
        "--engine-only",
        action="store_true",
        help="Only rebuild stellar-engine and update its wheel in place",
    )
    args = parser.parse_args()

    if (
        args.local_cdn_dir
        and not (args.local_cdn_dir / "pyodide-lock.json").exists()
    ):
        print(f"Error: {args.local_cdn_dir}/pyodide-lock.json not found")
        raise SystemExit(1)

    local_wheel = None
    if args.local_mechaphlowers:
        local_wheel = find_wheel(
            SE_INPUT, "mechaphlowers*.whl", "mechaphlowers"
        )
        print(f"  Found local mechaphlowers wheel: {local_wheel.name}")

    if args.engine_only:
        print("\n" + "=" * 50)
        print("ENGINE-ONLY MODE")
        print("=" * 50)
        engine_only(local_wheel)
        print("\n" + "=" * 50)
        print("✓ stellar-engine rebuilt and updated")
        print("=" * 50)
        return

    ver = pyodide_version()

    print("=" * 50)
    print(f"Pyodide: {ver}")
    print("=" * 50)

    if PYODIDE_DIR.exists():
        shutil.rmtree(PYODIDE_DIR)
    PYODIDE_DIR.mkdir(parents=True)
    PACKAGES_JSON.unlink(missing_ok=True)

    cdn_url = f"https://cdn.jsdelivr.net/pyodide/v{ver}/full"
    se_wheel = build_stellar_engine(local_wheel)
    download_pyodide(args.npm_registry_url)
    downloaded = download_packages(se_wheel, local_wheel)
    cdn_files = replace_with_cdn(downloaded, cdn_url, args.local_cdn_dir)
    cdn_names = {parse_wheel(w)[0] for w in cdn_files}

    deduplicate(cdn_names)
    compile_wheels(cdn_names)
    deduplicate(cdn_names)
    num = finalize(cdn_names, downloaded)

    # Summary
    print("\n" + "=" * 50)
    print("INSTALLED PACKAGES")
    print("=" * 50)
    cdn_count = pypi_count = 0
    for w in sorted(wheels_in(PYODIDE_DIR)):
        name, v = parse_wheel(w)
        tag = "CDN" if name in cdn_names else "PyPI"
        print(f"  {name:30} {v:15} [{tag}]")
        if name in cdn_names:
            cdn_count += 1
        else:
            pypi_count += 1
    print("=" * 50)
    print(
        f"✓ Setup complete: {num} packages ({cdn_count} CDN, {pypi_count} PyPI)"
    )
    print(f"  Config: {PACKAGES_JSON}")
    print("=" * 50)


if __name__ == "__main__":
    main()
