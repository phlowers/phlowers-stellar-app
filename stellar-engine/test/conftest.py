from pathlib import Path
import sys


projet_dir: Path = Path(__file__).resolve().parents[1]
print("--conftest--")
print(projet_dir)
source_dir: Path = projet_dir / "src"
sys.path.append(str(source_dir))