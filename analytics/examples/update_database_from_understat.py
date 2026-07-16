from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.config import load_config
from adql_analytics.database import initialize_database
from adql_analytics.database.writers.common import print_summary
from adql_analytics.database.writers.understat_writer import write_understat_player_stats_to_database
from adql_analytics.io import write_dataframe
from adql_analytics.sources.understat import (
    UnderstatRequest,
    fetch_understat_player_season_stats,
    sample_understat_player_season_stats,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Atualiza o banco com estatísticas ofensivas do Understat.")
    parser.add_argument("--league", default="ENG-Premier League")
    parser.add_argument("--season", default="2025-2026")
    parser.add_argument("--no-cache", action="store_true")
    parser.add_argument("--sample", action="store_true", help="Usa base fictícia local, sem internet.")
    parser.add_argument("--raw-output", default="understat_players_db_raw.csv")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config()
    db_path = initialize_database()

    if args.sample:
        df = sample_understat_player_season_stats()
    else:
        df = fetch_understat_player_season_stats(
            UnderstatRequest(leagues=args.league, seasons=args.season, no_cache=args.no_cache)
        )

    raw_path = write_dataframe(df, config.raw_data_dir / args.raw_output)
    summary = write_understat_player_stats_to_database(df)
    print(f"Banco: {db_path}")
    print(f"CSV bruto: {raw_path}")
    print_summary("Understat → banco", summary)


if __name__ == "__main__":
    main()
