from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.config import load_config
from adql_analytics.io import write_dataframe, write_json
from adql_analytics.sources.clubelo import (
    ClubEloRequest,
    ClubEloSource,
    sample_clubelo_history,
    sample_clubelo_ratings,
)
from adql_analytics.transforms.clubelo_table import clubelo_to_c06_payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Gera JSON C-06 Table Builder a partir de ratings ClubElo."
    )
    parser.add_argument(
        "--date",
        default=None,
        help='Data do rating no formato YYYY-MM-DD. Se omitida, usa a data corrente disponível pela fonte.',
    )
    parser.add_argument(
        "--mode",
        choices=("top", "compare", "history"),
        default="top",
        help="top = ranking; compare = comparação entre equipes; history = variação recente por equipe.",
    )
    parser.add_argument(
        "--teams",
        nargs="+",
        default=["Arsenal", "Liverpool"],
        help='Equipes para compare/history. Ex.: --teams "Arsenal" "Liverpool".',
    )
    parser.add_argument(
        "--top",
        type=int,
        default=10,
        help="Quantidade de equipes no ranking ou registros recentes no modo history.",
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Usa base local fictícia para validar sem internet.",
    )
    parser.add_argument(
        "--title",
        default=None,
        help="Título do card C-06. Se omitido, o script gera automaticamente.",
    )
    parser.add_argument(
        "--output",
        default="c06_clubelo_table.json",
        help="Nome do JSON de saída dentro de analytics/outputs.",
    )
    parser.add_argument(
        "--raw-output",
        default="clubelo_raw.csv",
        help="Nome do CSV bruto dentro de analytics/data/raw.",
    )
    return parser.parse_args()


def _read_real_clubelo(args: argparse.Namespace) -> tuple[pd.DataFrame, str]:
    source = ClubEloSource()

    if args.mode == "history":
        frames = []
        for team in args.teams:
            history = source.team_history(team)
            frames.append(history)
        df = pd.concat(frames, ignore_index=False)
        source_label = "ClubElo via soccerdata | histórico de equipes"
        return df, source_label

    request = ClubEloRequest(date=args.date)
    df = source.read_request(request)
    source_label = f"ClubElo via soccerdata | {args.date or 'data atual'}"
    return df, source_label


def main() -> None:
    args = parse_args()
    config = load_config()

    if args.sample:
        if args.mode == "history":
            df = sample_clubelo_history()
            source_label = "Base fictícia ClubElo / ADQL Analytics Layer"
        else:
            df = sample_clubelo_ratings()
            source_label = "Base fictícia ClubElo / ADQL Analytics Layer"
    else:
        df, source_label = _read_real_clubelo(args)

    raw_path = config.raw_data_dir / args.raw_output
    write_dataframe(df.reset_index(drop=False) if not isinstance(df.index, pd.RangeIndex) else df, raw_path)

    payload = clubelo_to_c06_payload(
        df=df,
        mode=args.mode,
        teams=args.teams,
        top=args.top,
        date=args.date,
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
