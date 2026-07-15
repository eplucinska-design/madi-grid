from __future__ import annotations

import argparse
import os
import shutil
import zipfile
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_EXPORT_DIR = ROOT / "exports"
PACKAGE_NAME = "madi-grid-github-package"

EXCLUDED_DIRS = {
    ".git",
    ".next",
    ".turbo",
    ".vercel",
    "node_modules",
    "exports",
    "__pycache__",
    ".video-frames",
}

EXCLUDED_SUFFIXES = {
    ".log",
    ".tsbuildinfo",
    ".zip",
    ".pyc",
    ".pyo",
}

EXCLUDED_FILES = {
    ".DS_Store",
    "Thumbs.db",
}


def should_include(path: Path) -> bool:
    rel_parts = path.relative_to(ROOT).parts
    if any(part in EXCLUDED_DIRS for part in rel_parts):
        return False
    if path.name in EXCLUDED_FILES:
        return False
    if path.suffix.lower() in EXCLUDED_SUFFIXES:
        return False
    return True


def copy_project(destination: Path) -> list[Path]:
    copied: list[Path] = []
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True, exist_ok=True)

    for source in ROOT.rglob("*"):
        if not source.is_file() or not should_include(source):
            continue
        rel = source.relative_to(ROOT)
        target = destination / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        copied.append(rel)

    return copied


def write_package_readme(destination: Path, copied: list[Path]) -> None:
    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    extensions = sorted({path.suffix.lower() or "(no extension)" for path in copied})
    readme = f"""# MADI GRID - paczka dla GitHuba

Wygenerowano: {generated_at}

Ta paczka zawiera aktualny stan aplikacji MADI GRID bez folderow tymczasowych:
- bez `node_modules`
- bez `.next`
- bez logow i plikow build cache

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Domyslny adres aplikacji:

```text
http://127.0.0.1:3000
```

## Build produkcyjny

```bash
npm run build
npm run start
```

## Zakres plikow

Paczka zawiera kod aplikacji Next.js/React, style CSS, pliki konfiguracyjne oraz skrypt eksportu.
Wykryte rozszerzenia: {", ".join(extensions)}

## Aktualizacja paczki

Po zmianach uruchom:

```bash
python scripts/export_github_package.py
```

Wynik pojawi sie w folderze `exports`.
"""
    (destination / "README_GITHUB_PACKAGE.md").write_text(readme, encoding="utf-8")


def zip_directory(source_dir: Path, zip_path: Path) -> None:
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in source_dir.rglob("*"):
            if file_path.is_file():
                archive.write(file_path, file_path.relative_to(source_dir.parent))


def main() -> None:
    parser = argparse.ArgumentParser(description="Eksportuje aktualny stan MADI GRID jako paczke dla GitHuba.")
    parser.add_argument("--out", default=str(DEFAULT_EXPORT_DIR), help="Folder wyjsciowy dla paczki.")
    args = parser.parse_args()

    export_dir = Path(args.out).resolve()
    package_dir = export_dir / PACKAGE_NAME
    zip_path = export_dir / f"{PACKAGE_NAME}.zip"

    export_dir.mkdir(parents=True, exist_ok=True)
    copied = copy_project(package_dir)
    write_package_readme(package_dir, copied)
    zip_directory(package_dir, zip_path)

    size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f"Folder paczki: {package_dir}")
    print(f"ZIP: {zip_path}")
    print(f"Plikow: {len(copied)}")
    print(f"Rozmiar ZIP: {size_mb:.2f} MB")


if __name__ == "__main__":
    os.chdir(ROOT)
    main()
