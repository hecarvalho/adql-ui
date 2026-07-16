from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.config import load_config
from adql_analytics.database import initialize_database
from adql_analytics.database.writers.common import print_summary
from adql_analytics.database.writers.football_data_writer import write_football_data_matches_to_database
from adql_analytics.io import write_dataframe
from adql_analytics.sources.football_data_co_uk import (
    FootballDataCoUkRequest,
    FootballDataCoUkSource,
    sample_football_data_matches,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Atualiza o banco com resultados do Football-Data.co.uk.")
    parser.add_argument("--season", default="2025-2026")
    parser.add_argument("--competition", default="E0", help="Código Football-Data.co.uk. Ex.: E0, SP1, D1, I1, F1.")
    parser.add_argument("--sample", action="store_true", help="Usa base fictícia local, sem internet.")
    parser.add_argument("--raw-output", default="football_data_matches_db_raw.csv")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config()
    db_path = initialize_database()

    if args.sample:
        df = sample_football_data_matches()
    else:
        source = FootballDataCoUkSource()
        df = source.read_request(
            FootballDataCoUkRequest(season_code=args.season, competition_code=args.competition)
        )

    raw_path = write_dataframe(df, config.raw_data_dir / args.raw_output)
    summary = write_football_data_matches_to_database(
        df,
        season=args.season,
        competition=args.competition,
    )
    print(f"Banco: {db_path}")
    print(f"CSV bruto: {raw_path}")
    print_summary("Football-Data.co.uk → banco", summary)


if __name__ == "__main__":
    main()
