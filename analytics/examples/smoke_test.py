from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.config import load_config


def main() -> None:
    config = load_config()
    print("ADQL Analytics Layer V1")
    print(f"Cache: {config.cache_dir}")
    print(f"Outputs: {config.output_dir}")
    print("Fontes configuradas:")
    for name, source in config.sources.items():
        status = "ativada" if source.get("enabled") else "desativada"
        print(f"- {name}: {status} | {source.get('purpose')}")


if __name__ == "__main__":
    main()
