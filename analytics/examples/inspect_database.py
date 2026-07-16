from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.database import AnalyticsRepository, initialize_database


def main() -> None:
    path = initialize_database()
    print(f"Banco: {path}")
    print("\nContagem por tabela:")

    with AnalyticsRepository(path) as repo:
        for table, total in repo.table_counts().items():
            print(f"- {table}: {total}")

        exports = repo.recent_exports(limit=5)
        if exports:
            print("\nExports recentes:")
            for item in exports:
                print(f"- {item['component']} | {item['title']} | {item['output_path']}")


if __name__ == "__main__":
    main()
