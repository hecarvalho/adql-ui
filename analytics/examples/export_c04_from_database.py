from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.config import load_config
from adql_analytics.database import AnalyticsRepository, initialize_database
from adql_analytics.io import write_json
from adql_analytics.transforms.database_exports import (
    database_player_to_c04_payload,
    load_database_player_metric_table,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Exporta C-04 Radar Profile a partir do banco SQLite ADQL Analytics.")
    parser.add_argument("--player", default=None, help='Jogador para gerar o radar. Ex.: --player "Lamine Yamal"')
    parser.add_argument("--source", default=None, help="Filtra a fonte. Ex.: fbref, understat, api_football.")
    parser.add_argument("--season", default=None, help='Filtra temporada. Ex.: "2025-2026" ou "2025".')
    parser.add_argument("--competition", default=None, help="Filtra competição por nome parcial.")
    parser.add_argument("--min-minutes", type=float, default=450, help="Mínimo de minutos para a base de percentis.")
    parser.add_argument("--title", default=None, help="Título do card C-04.")
    parser.add_argument("--output", default="c04_database_radar_profile.json", help="Arquivo de saída em analytics/outputs.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config()
    db_path = initialize_database()

    with AnalyticsRepository(db_path) as repo:
        table = load_database_player_metric_table(
            repo,
            source=args.source,
            season=args.season,
            competition=args.competition,
            min_minutes=args.min_minutes,
        )
        if table.empty:
            raise SystemExit("Nenhum dado encontrado em player_stats para os filtros informados.")

        payload = database_player_to_c04_payload(
            table,
            player=args.player,
            title=args.title,
            subtitle="Radar gerado a partir do banco SQLite ADQL Analytics",
        )
        output_path = config.output_dir / args.output
        write_json(payload, output_path)
        repo.insert_generated_export(
            component="C-04",
            source_id="database",
            title=payload.get("title", "C-04 Database"),
            output_path=str(output_path),
            source_payload={
                "player": args.player,
                "source": args.source,
                "season": args.season,
                "competition": args.competition,
                "min_minutes": args.min_minutes,
            },
        )

    print(f"JSON C-04 gerado: {output_path}")
    print("Importe o arquivo no ADQL UI pelo card Analytics do C-04.")


if __name__ == "__main__":
    main()
