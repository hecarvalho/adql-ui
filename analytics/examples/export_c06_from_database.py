from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.adql_export.to_c06_table import dataframe_to_c06_table
from adql_analytics.config import load_config
from adql_analytics.database import AnalyticsRepository, initialize_database
from adql_analytics.io import write_json
from adql_analytics.transforms.database_exports import (
    database_clubelo_table,
    database_match_results_table,
    database_players_to_table,
    database_team_stats_table,
    load_database_player_metric_table,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Exporta tabelas C-06 a partir do banco SQLite ADQL Analytics.")
    parser.add_argument(
        "--mode",
        choices=["players", "team-stats", "matches", "clubelo"],
        default="players",
        help="Tipo de tabela a exportar.",
    )
    parser.add_argument("--source", default=None, help="Filtra fonte no modo players. Ex.: fbref, understat.")
    parser.add_argument("--season", default=None, help="Filtra temporada no modo players.")
    parser.add_argument("--competition", default=None, help="Filtra competição no modo players.")
    parser.add_argument("--min-minutes", type=float, default=450, help="Mínimo de minutos no modo players.")
    parser.add_argument("--sort-metric", default="xg_per90", help="Coluna interna para ordenar no modo players.")
    parser.add_argument("--limit", type=int, default=12, help="Número máximo de linhas.")
    parser.add_argument("--output", default=None, help="Nome do arquivo de saída em analytics/outputs.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config()
    db_path = initialize_database()

    with AnalyticsRepository(db_path) as repo:
        if args.mode == "clubelo":
            df = database_clubelo_table(repo, limit=args.limit)
            title = "ClubElo no banco ADQL"
            subtitle = "Ratings de força relativa salvos no SQLite local"
            output_name = args.output or "c06_database_clubelo.json"
        elif args.mode == "matches":
            df = database_match_results_table(repo, limit=args.limit)
            title = "Partidas no banco ADQL"
            subtitle = "Resultados e estatísticas básicas consolidadas no SQLite local"
            output_name = args.output or "c06_database_matches.json"
        elif args.mode == "team-stats":
            df = database_team_stats_table(repo, limit=args.limit)
            title = "Estatísticas de equipes no banco ADQL"
            subtitle = "Dados agregados de equipes salvos no SQLite local"
            output_name = args.output or "c06_database_team_stats.json"
        else:
            metric_table = load_database_player_metric_table(
                repo,
                source=args.source,
                season=args.season,
                competition=args.competition,
                min_minutes=args.min_minutes,
            )
            df = database_players_to_table(metric_table, limit=args.limit, sort_metric=args.sort_metric)
            title = "Jogadores no banco ADQL"
            subtitle = "Métricas por 90 geradas a partir do SQLite local"
            output_name = args.output or "c06_database_players.json"

        if df.empty:
            raise SystemExit("Nenhum dado encontrado para os filtros informados.")

        output_path = config.output_dir / output_name
        payload = dataframe_to_c06_table(
            df,
            title=title,
            subtitle=subtitle,
            max_rows=args.limit,
        )
        write_json(payload, output_path)
        repo.insert_generated_export(
            component="C-06",
            source_id="database",
            title=title,
            output_path=str(output_path),
            source_payload=vars(args),
        )

    print(f"JSON C-06 gerado: {output_path}")
    print("Importe o arquivo no ADQL UI pelo card Analytics do C-06.")


if __name__ == "__main__":
    main()
