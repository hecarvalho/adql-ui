from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.config import load_config
from adql_analytics.io import write_dataframe, write_json
from adql_analytics.sources.football_data_co_uk import (
    FootballDataCoUkRequest,
    FootballDataCoUkSource,
    normalize_competition_code,
    normalize_season_code,
    sample_football_data_matches,
)
from adql_analytics.transforms.football_data_table import football_data_to_c06_payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Gera JSON C-06 Table Builder a partir de CSVs do Football-Data.co.uk."
    )
    parser.add_argument(
        "--season",
        default="2025-2026",
        help='Temporada. Ex.: "2025-2026", "2025-26", "2025" ou "2526".',
    )
    parser.add_argument(
        "--competition",
        default="E0",
        help='Competição. Ex.: E0, Premier League, La Liga, Serie A, Bundesliga, Ligue 1.',
    )
    parser.add_argument(
        "--team",
        nargs="+",
        default=["Arsenal", "Liverpool"],
        help='Time(s) para análise. Ex.: --team "Arsenal" "Liverpool".',
    )
    parser.add_argument(
        "--mode",
        choices=("compare", "matches"),
        default="compare",
        help="compare = resumo entre equipes; matches = últimos jogos da primeira equipe.",
    )
    parser.add_argument(
        "--last-n",
        type=int,
        default=5,
        help="Quantidade de jogos recentes por equipe.",
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Usa uma base local fictícia para validar sem internet.",
    )
    parser.add_argument(
        "--title",
        default=None,
        help="Título do card C-06. Se omitido, o script gera automaticamente.",
    )
    parser.add_argument(
        "--output",
        default="c06_football_data_form.json",
        help="Nome do JSON de saída dentro de analytics/outputs.",
    )
    parser.add_argument(
        "--raw-output",
        default="football_data_matches_raw.csv",
        help="Nome do CSV bruto dentro de analytics/data/raw.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config()

    if args.sample:
        df = sample_football_data_matches()
        source_label = "Base fictícia local / ADQL Analytics Layer"
    else:
        season_code = normalize_season_code(args.season)
        competition_code = normalize_competition_code(args.competition)
        request = FootballDataCoUkRequest(
            season_code=season_code,
            competition_code=competition_code,
        )
        source = FootballDataCoUkSource()
        df = source.read_request(request)
        source_label = f"Football-Data.co.uk | {competition_code} | {season_code}"

    raw_path = config.raw_data_dir / args.raw_output
    write_dataframe(df, raw_path)

    payload = football_data_to_c06_payload(
        df=df,
        teams=args.team,
        mode=args.mode,
        last_n=args.last_n,
        title=args.title,
        source=source_label,
    )

    output_path = config.output_dir / args.output
    write_json(payload, output_path)

    print(f"CSV bruto: {raw_path}")
    print(f"JSON C-06: {output_path}")
    print("Importe o JSON no ADQL UI pelo card do C-06 Analytics Layer.")


if __name__ == "__main__":
    main()
