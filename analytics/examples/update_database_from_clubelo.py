from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.config import load_config
from adql_analytics.database import initialize_database
from adql_analytics.database.writers.clubelo_writer import write_clubelo_ratings_to_database
from adql_analytics.database.writers.common import print_summary
from adql_analytics.io import write_dataframe
from adql_analytics.sources.clubelo import ClubEloRequest, ClubEloSource, sample_clubelo_ratings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Atualiza o banco com ratings ClubElo.")
    parser.add_argument("--date", default=None, help="Data ISO YYYY-MM-DD. Omitir para usar a data atual disponível pela fonte.")
    parser.add_argument("--sample", action="store_true", help="Usa base fictícia local, sem internet.")
    parser.add_argument("--raw-output", default="clubelo_ratings_db_raw.csv")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config()
    db_path = initialize_database()

    if args.sample:
        df = sample_clubelo_ratings()
    else:
        source = ClubEloSource()
        df = source.read_request(ClubEloRequest(date=args.date))

    raw_path = write_dataframe(df, config.raw_data_dir / args.raw_output)
    summary = write_clubelo_ratings_to_database(df, rating_date=args.date)
    print(f"Banco: {db_path}")
    print(f"CSV bruto: {raw_path}")
    print_summary("ClubElo → banco", summary)


if __name__ == "__main__":
    main()
