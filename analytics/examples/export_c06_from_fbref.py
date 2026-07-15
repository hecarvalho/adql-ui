from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.config import load_config
from adql_analytics.io import write_dataframe, write_json
from adql_analytics.sources.fbref_players import (
    FBrefPlayerStatsRequest,
    fetch_fbref_player_stats,
    sample_fbref_player_stats,
)
from adql_analytics.transforms.table_builder import players_dataframe_to_c06_payload


def parse_csv_list(value: str | None) -> list[str] | None:
    if not value:
        return None

    return [item.strip() for item in value.split(",") if item.strip()]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Gera um JSON C-06 Table Builder a partir de estatísticas do FBref."
    )
    parser.add_argument(
        "--league",
        default="ENG-Premier League",
        help='Liga no padrão soccerdata/FBref. Ex.: "ENG-Premier League" ou "Big 5 European Leagues Combined".',
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
        help='Jogadores específicos. Ex.: --players "Bukayo Saka" "Mohamed Salah"',
    )
    parser.add_argument(
        "--metrics",
        default="Gols/90,Assistências/90,xG/90,xAG/90,Chutes/90",
        help='Métricas exibidas na tabela, separadas por vírgula. Ex.: "Gols/90,xG/90,Chutes/90".',
    )
    parser.add_argument(
        "--sort-metric",
        default="score",
        help='Métrica usada para ordenar quando --players não for informado. Use "score" ou o nome da métrica, ex.: "xG/90".',
    )
    parser.add_argument(
        "--sort-mode",
        choices=("raw", "percentile"),
        default="percentile",
        help="Modo de ordenação da métrica: raw ou percentile. Padrão: percentile.",
    )
    parser.add_argument(
        "--value-type",
        choices=("raw", "percentile"),
        default="raw",
        help="Valores exibidos nas colunas de métrica: raw ou percentile. Padrão: raw.",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=10,
        help="Quantidade de linhas quando --players não for informado.",
    )
    parser.add_argument(
        "--min-90s",
        type=float,
        default=5.0,
        help="Mínimo de 90s para entrar na base de percentis e ranking.",
    )
    parser.add_argument(
        "--stat-types",
        default="standard,shooting,misc",
        help="Tabelas FBref separadas por vírgula. Padrão: standard,shooting,misc.",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Força nova coleta pelo soccerdata, sem usar cache local.",
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Usa uma base fictícia local para validar o pipeline sem internet.",
    )
    parser.add_argument(
        "--title",
        default=None,
        help="Título do card C-06. Se omitido, o script gera um título automaticamente.",
    )
    parser.add_argument(
        "--output",
        default="c06_fbref_table.json",
        help="Nome do arquivo JSON de saída dentro de analytics/outputs.",
    )
    parser.add_argument(
        "--raw-output",
        default="fbref_players_raw.csv",
        help="Nome do CSV bruto normalizado dentro de analytics/data/raw.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config()

    if args.sample:
        df = sample_fbref_player_stats()
        source_label = "Base fictícia local / ADQL Analytics Layer"
    else:
        stat_types = parse_csv_list(args.stat_types) or ["standard", "shooting", "misc"]
        request = FBrefPlayerStatsRequest(
            leagues=args.league,
            seasons=args.season,
            stat_types=stat_types,
            no_cache=args.no_cache,
        )
        df = fetch_fbref_player_stats(request)
        source_label = f"FBref via soccerdata | {args.league} | {args.season}"

    raw_path = config.raw_data_dir / args.raw_output
    write_dataframe(df, raw_path)

    metric_labels = parse_csv_list(args.metrics)
    title = args.title

    if not title:
        if args.players:
            title = "Tabela FBref — jogadores selecionados"
        elif args.sort_metric.lower() in {"score", "adql_score"}:
            title = "Ranking FBref — score ADQL"
        else:
            title = f"Ranking FBref — {args.sort_metric}"

    payload = players_dataframe_to_c06_payload(
        df=df,
        players=args.players,
        title=title,
        subtitle=f"{args.league} | {args.season} | mínimo: {args.min_90s} jogos de 90 minutos",
        metric_labels=metric_labels,
        value_type=args.value_type,
        sort_metric=args.sort_metric,
        sort_mode=args.sort_mode,
        min_90s=args.min_90s,
        max_rows=args.top,
        source=source_label,
    )

    output_path = config.output_dir / args.output
    write_json(payload, output_path)

    print(f"CSV bruto: {raw_path}")
    print(f"JSON C-06: {output_path}")
    print("Importe o JSON no ADQL UI pelo card do C-06 Analytics Layer.")


if __name__ == "__main__":
    main()
