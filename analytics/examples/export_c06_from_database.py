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


def build_players_table(repo: AnalyticsRepository):
    df = repo.query_dataframe(
        """
        SELECT
          p.name AS Jogador,
          t.name AS Equipe,
          s.name AS Fonte,
          ROUND(ps.minutes, 0) AS Min,
          ROUND((COALESCE(ps.goals, 0) * 90.0) / NULLIF(ps.minutes, 0), 2) AS "Gols/90",
          ROUND((COALESCE(ps.assists, 0) * 90.0) / NULLIF(ps.minutes, 0), 2) AS "Assist/90",
          ROUND((COALESCE(ps.xg, 0) * 90.0) / NULLIF(ps.minutes, 0), 2) AS "xG/90",
          ROUND((COALESCE(ps.xa, 0) * 90.0) / NULLIF(ps.minutes, 0), 2) AS "xA/90",
          ROUND((COALESCE(ps.shots, 0) * 90.0) / NULLIF(ps.minutes, 0), 2) AS "Chutes/90"
        FROM player_stats ps
        JOIN players p ON p.player_id = ps.player_id
        LEFT JOIN teams t ON t.team_id = ps.team_id
        LEFT JOIN sources s ON s.source_id = ps.source_id
        ORDER BY ps.source_id, "xG/90" DESC
        LIMIT 12
        """
    )
    return df


def build_clubelo_table(repo: AnalyticsRepository):
    df = repo.query_dataframe(
        """
        SELECT
          cr.rating_date AS Data,
          t.name AS Equipe,
          cr.country AS País,
          cr.rank AS Ranking,
          ROUND(cr.elo, 1) AS Elo
        FROM clubelo_ratings cr
        JOIN teams t ON t.team_id = cr.team_id
        ORDER BY cr.rating_date DESC, cr.elo DESC
        LIMIT 12
        """
    )
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description="Exporta tabelas C-06 a partir do SQLite ADQL Analytics.")
    parser.add_argument("--mode", choices=["players", "clubelo"], default="players")
    args = parser.parse_args()

    config = load_config()
    db_path = initialize_database()

    with AnalyticsRepository(db_path) as repo:
        if args.mode == "clubelo":
            df = build_clubelo_table(repo)
            output_path = config.output_dir / "c06_database_clubelo.json"
            title = "ClubElo no banco ADQL"
            subtitle = "Tabela gerada a partir do SQLite local"
        else:
            df = build_players_table(repo)
            output_path = config.output_dir / "c06_database_players.json"
            title = "Jogadores no banco ADQL"
            subtitle = "Métricas por 90 geradas a partir do SQLite local"

        if df.empty:
            raise SystemExit(
                "Nenhum dado encontrado. Rode antes: python examples\\update_database_from_sample.py"
            )

        payload = dataframe_to_c06_table(
            df,
            title=title,
            subtitle=subtitle,
            max_rows=12,
        )
        write_json(payload, output_path)
        repo.insert_generated_export(
            component="C-06",
            source_id="database",
            title=title,
            output_path=str(output_path),
            source_payload={"mode": args.mode},
        )

    print(f"Arquivo gerado: {output_path}")


if __name__ == "__main__":
    main()
