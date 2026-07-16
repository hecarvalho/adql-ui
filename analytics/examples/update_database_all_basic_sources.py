from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.config import load_config
from adql_analytics.database import AnalyticsRepository, initialize_database
from adql_analytics.database.writers.clubelo_writer import write_clubelo_ratings_to_database
from adql_analytics.database.writers.common import print_summary
from adql_analytics.database.writers.fbref_writer import write_fbref_player_stats_to_database
from adql_analytics.database.writers.football_data_writer import write_football_data_matches_to_database
from adql_analytics.database.writers.understat_writer import write_understat_player_stats_to_database
from adql_analytics.io import write_dataframe
from adql_analytics.sources.clubelo import ClubEloRequest, ClubEloSource, sample_clubelo_ratings
from adql_analytics.sources.fbref_players import FBrefPlayerStatsRequest, fetch_fbref_player_stats, sample_fbref_player_stats
from adql_analytics.sources.football_data_co_uk import FootballDataCoUkRequest, FootballDataCoUkSource, sample_football_data_matches
from adql_analytics.sources.understat import UnderstatRequest, fetch_understat_player_season_stats, sample_understat_player_season_stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Atualiza o banco ADQL com FBref, Understat, Football-Data.co.uk e ClubElo."
    )
    parser.add_argument("--sample", action="store_true", help="Usa bases fictícias locais para validar tudo sem internet.")
    parser.add_argument("--league", default="ENG-Premier League", help="Liga para FBref e Understat.")
    parser.add_argument("--season", default="2025-2026", help="Temporada para FBref, Understat e Football-Data.co.uk.")
    parser.add_argument("--competition", default="E0", help="Código Football-Data.co.uk. Ex.: E0, SP1, D1, I1, F1.")
    parser.add_argument("--date", default=None, help="Data ISO para ClubElo. Omitir usa a data atual disponível pela fonte.")
    parser.add_argument("--stat-types", default="standard,shooting,misc")
    parser.add_argument("--no-cache", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config()
    db_path = initialize_database()

    if args.sample:
        fbref_df = sample_fbref_player_stats()
        understat_df = sample_understat_player_season_stats()
        football_df = sample_football_data_matches()
        clubelo_df = sample_clubelo_ratings()
    else:
        stat_types = [item.strip() for item in args.stat_types.split(",") if item.strip()]
        fbref_df = fetch_fbref_player_stats(
            FBrefPlayerStatsRequest(
                leagues=args.league,
                seasons=args.season,
                stat_types=stat_types,
                no_cache=args.no_cache,
            )
        )
        understat_df = fetch_understat_player_season_stats(
            UnderstatRequest(leagues=args.league, seasons=args.season, no_cache=args.no_cache)
        )
        football_df = FootballDataCoUkSource().read_request(
            FootballDataCoUkRequest(season_code=args.season, competition_code=args.competition)
        )
        clubelo_df = ClubEloSource().read_request(ClubEloRequest(date=args.date))

    raw_paths = {
        "fbref": write_dataframe(fbref_df, config.raw_data_dir / "fbref_players_db_raw.csv"),
        "understat": write_dataframe(understat_df, config.raw_data_dir / "understat_players_db_raw.csv"),
        "football_data_co_uk": write_dataframe(football_df, config.raw_data_dir / "football_data_matches_db_raw.csv"),
        "clubelo": write_dataframe(clubelo_df, config.raw_data_dir / "clubelo_ratings_db_raw.csv"),
    }

    with AnalyticsRepository() as repo:
        summaries = {
            "FBref": write_fbref_player_stats_to_database(fbref_df, repo=repo),
            "Understat": write_understat_player_stats_to_database(understat_df, repo=repo),
            "Football-Data.co.uk": write_football_data_matches_to_database(
                football_df,
                repo=repo,
                season=args.season,
                competition=args.competition,
            ),
            "ClubElo": write_clubelo_ratings_to_database(clubelo_df, repo=repo, rating_date=args.date),
        }

    print(f"Banco: {db_path}")
    print("Arquivos brutos:")
    for source_id, path in raw_paths.items():
        print(f"- {source_id}: {path}")

    for title, summary in summaries.items():
        print_summary(f"\n{title} → banco", summary)

    print("\nValide com:")
    print(r".\.venv\Scripts\python.exe examples\inspect_database.py")


if __name__ == "__main__":
    main()
