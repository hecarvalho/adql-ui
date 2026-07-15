from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.config import load_config
from adql_analytics.io import write_dataframe, write_json
from adql_analytics.sources.understat import (
    UnderstatRequest,
    fetch_understat_player_season_stats,
    sample_understat_player_season_stats,
)
from adql_analytics.transforms.understat_player_comparison import (
    understat_players_to_c05_payload,
)


def parse_csv_list(value: str | None) -> list[str] | None:
    if not value:
        return None
    return [item.strip() for item in value.split(",") if item.strip()]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Gera um JSON C-05 Player Comparison a partir de dados do Understat."
    )
    parser.add_argument(
        "--league",
        default="ENG-Premier League",
        help='Liga no padrão soccerdata/Understat. Ex.: "ENG-Premier League", "ESP-La Liga".',
    )
    parser.add_argument(
        "--season",
        default="2025-2026",
        help='Temporada no padrão soccerdata. Ex.: "2025-2026", "2025-26" ou 2025.',
    )
    parser.add_argument(
        "--players",
        nargs="*",
        default=None,
        help='Jogadores a comparar. Ex.: --players "Erling Haaland" "Mohamed Salah"',
    )
    parser.add_argument(
        "--metrics",
        default="Gols/90,xG/90,npxG/90,xA/90,Chutes/90,KP/90,xGChain/90,xGBuildup/90,Gols - xG",
        help='Métricas do C-05 separadas por vírgula. Ex.: "xG/90,xA/90,Chutes/90".',
    )
    parser.add_argument(
        "--min-90s",
        type=float,
        default=5.0,
        help="Mínimo de 90s para entrar na base de percentis.",
    )
    parser.add_argument(
        "--max-players",
        type=int,
        default=2,
        help="Quantidade de jogadores quando --players não for informado.",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Força nova coleta quando a versão do soccerdata suportar no_cache.",
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Usa uma base fictícia local para validar o pipeline sem internet.",
    )
    parser.add_argument(
        "--title",
        default=None,
        help="Título do card C-05. Se omitido, o script gera automaticamente.",
    )
    parser.add_argument(
        "--output",
        default="c05_understat_player_comparison.json",
        help="Nome do arquivo JSON de saída dentro de analytics/outputs.",
    )
    parser.add_argument(
        "--raw-output",
        default="understat_players_raw.csv",
        help="Nome do CSV bruto normalizado dentro de analytics/data/raw.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config()

    if args.sample:
        df = sample_understat_player_season_stats()
        source_label = "Base fictícia local / ADQL Analytics Layer"
    else:
        request = UnderstatRequest(
            leagues=args.league,
            seasons=args.season,
            no_cache=args.no_cache,
        )
        df = fetch_understat_player_season_stats(request)
        source_label = f"Understat via soccerdata | {args.league} | {args.season}"

    raw_path = config.raw_data_dir / args.raw_output
    write_dataframe(df, raw_path)

    title = args.title
    if not title:
        title = "Comparação Understat"
        if args.players:
            title = " × ".join(args.players[:3])

    payload = understat_players_to_c05_payload(
        df=df,
        players=args.players,
        title=title,
        subtitle=f"Percentis 0-100 | {args.league} | {args.season}",
        metric_labels=parse_csv_list(args.metrics),
        min_90s=args.min_90s,
        max_players=args.max_players,
        source=source_label,
    )

    output_path = config.output_dir / args.output
    write_json(payload, output_path)

    print(f"CSV bruto: {raw_path}")
    print(f"JSON C-05: {output_path}")
    print("Importe o JSON no ADQL UI pelo card do C-05 Analytics Layer.")


if __name__ == "__main__":
    main()
