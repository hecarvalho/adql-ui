from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.config import load_config
from adql_analytics.database import AnalyticsRepository, initialize_database
from adql_analytics.database.writers.api_football_writer import write_api_football_fixture_bundles_to_database
from adql_analytics.database.writers.common import print_summary
from adql_analytics.io import write_json
from adql_analytics.sources.api_football import (
    API_FOOTBALL_SOURCE_ID,
    APIFootballClient,
    fetch_fixture_bundle,
    fetch_fixture_bundles,
    sample_api_football_fixture_bundle,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Atualiza o banco ADQL com fixtures/estatísticas da API-Football."
    )
    parser.add_argument("--sample", action="store_true", help="Usa fixture fictício local, sem consumir API.")
    parser.add_argument("--fixture-id", help="ID único de uma partida na API-Football.")
    parser.add_argument("--league", help="ID da liga na API-Football, ex.: 39 para Premier League.")
    parser.add_argument("--season", help="Ano da temporada na API-Football, ex.: 2025.")
    parser.add_argument("--team", help="ID de uma equipe na API-Football.")
    parser.add_argument("--date", help="Data YYYY-MM-DD para buscar partidas.")
    parser.add_argument("--from-date", help="Data inicial YYYY-MM-DD.")
    parser.add_argument("--to-date", help="Data final YYYY-MM-DD.")
    parser.add_argument("--last", type=int, help="Últimas N partidas do filtro.")
    parser.add_argument("--next", dest="next_", type=int, help="Próximas N partidas do filtro.")
    parser.add_argument("--max-fixtures", type=int, default=3, help="Máximo de partidas a hidratar. Use baixo no plano gratuito.")
    parser.add_argument(
        "--include",
        default="statistics,events,lineups,players",
        help="Blocos extras: statistics,events,lineups,players. Cada bloco custa chamadas adicionais.",
    )
    parser.add_argument("--raw-output", default="api_football_fixture_bundles.json")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = load_config()
    db_path = initialize_database()
    include = [item.strip() for item in args.include.split(",") if item.strip()]

    if args.sample:
        bundles = [sample_api_football_fixture_bundle()]
    else:
        client = APIFootballClient()
        if args.fixture_id:
            bundles = [fetch_fixture_bundle(args.fixture_id, client=client, include=include)]
        else:
            if not args.league or not args.season:
                raise SystemExit(
                    "Use --fixture-id ou informe --league e --season. Ex.: --league 39 --season 2025 --last 3"
                )
            bundles = fetch_fixture_bundles(
                league=args.league,
                season=args.season,
                team=args.team,
                date=args.date,
                from_date=args.from_date,
                to_date=args.to_date,
                last=args.last,
                next_=args.next_,
                max_fixtures=args.max_fixtures,
                include=include,
                client=client,
            )

    raw_path = write_json(bundles, config.raw_data_dir / "api_football" / args.raw_output)
    content_hash = hashlib.sha1(json.dumps(bundles, ensure_ascii=False, default=str).encode("utf-8")).hexdigest()

    with AnalyticsRepository(db_path) as repo:
        summary = write_api_football_fixture_bundles_to_database(bundles, repo=repo)
        repo.insert_raw_snapshot(
            source_id=API_FOOTBALL_SOURCE_ID,
            dataset_name="fixture_bundles",
            path=str(raw_path),
            content_hash=content_hash,
            row_count=len(bundles),
        )

    print(f"Banco: {db_path}")
    print(f"Snapshot bruto: {raw_path}")
    print_summary("API-Football → banco", summary)


if __name__ == "__main__":
    main()
