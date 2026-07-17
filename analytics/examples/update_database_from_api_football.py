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
    fetch_fixture_full_bundle,
    fetch_fixture_full_bundles,
    sample_api_football_fixture_bundle,
)


def _split_values(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.replace(";", ",").split(",") if item.strip()]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Atualiza o banco ADQL com fixtures/estatísticas da API-Football."
    )
    parser.add_argument("--sample", action="store_true", help="Usa fixture fictício local, sem consumir API.")
    parser.add_argument("--fixture-id", help="ID único de uma partida na API-Football.")
    parser.add_argument(
        "--fixture-ids",
        nargs="*",
        help="Lista de IDs de partidas. Também aceita valores separados por vírgula.",
    )
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
        "--full",
        action="store_true",
        help="Usa /fixtures?id=... por padrão para buscar fixture enriquecido. Compatível com plano Free.",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=20,
        help="Quantidade de fixture IDs por chamada quando --use-ids-param estiver ativo.",
    )
    parser.add_argument(
        "--use-ids-param",
        action="store_true",
        help=(
            "Usa /fixtures?ids=ID1-ID2 no modo --full. Não use no plano gratuito: "
            "a API pode bloquear esse parâmetro. O padrão é /fixtures?id=ID, compatível com Free."
        ),
    )
    parser.add_argument(
        "--include",
        default="statistics,events,lineups,players",
        help=(
            "Blocos extras para o modo legado: statistics,events,lineups,players. "
            "Cada bloco custa chamadas adicionais. Ignorado no modo --full."
        ),
    )
    parser.add_argument("--raw-output", default="api_football_fixture_bundles.json")
    return parser.parse_args()


def _fixture_ids_from_args(args: argparse.Namespace) -> list[str]:
    ids: list[str] = []
    if args.fixture_id:
        ids.append(str(args.fixture_id).strip())
    for item in args.fixture_ids or []:
        ids.extend(_split_values(item))
    seen: set[str] = set()
    unique: list[str] = []
    for item in ids:
        if item and item not in seen:
            unique.append(item)
            seen.add(item)
    return unique


def _fixture_ids_from_filter(args: argparse.Namespace, client: APIFootballClient) -> list[str]:
    if not args.league or not args.season:
        raise SystemExit(
            "Use --fixture-id/--fixture-ids ou informe --league e --season. Ex.: --league 39 --season 2025 --last 3"
        )

    fixture_rows = client.fixtures(
        league=args.league,
        season=args.season,
        team=args.team,
        date=args.date,
        **{"from": args.from_date, "to": args.to_date, "last": args.last, "next": args.next_},
    )
    max_fixtures = max(1, int(args.max_fixtures or 1))
    ids: list[str] = []
    for row in fixture_rows[:max_fixtures]:
        fixture_id = ((row.get("fixture") or {}).get("id"))
        if fixture_id is not None:
            ids.append(str(fixture_id))
    return ids


def main() -> None:
    args = parse_args()
    config = load_config()
    db_path = initialize_database()
    include = [item.strip() for item in args.include.split(",") if item.strip()]

    if args.sample:
        bundles = [sample_api_football_fixture_bundle()]
    else:
        client = APIFootballClient()
        explicit_ids = _fixture_ids_from_args(args)

        if args.full:
            fixture_ids = explicit_ids or _fixture_ids_from_filter(args, client)
            if not fixture_ids:
                raise SystemExit("Nenhum fixture encontrado para o modo --full.")
            bundles = fetch_fixture_full_bundles(
                fixture_ids,
                client=client,
                chunk_size=args.chunk_size,
                use_ids_param=args.use_ids_param,
            )
        elif explicit_ids:
            if len(explicit_ids) == 1:
                bundles = [fetch_fixture_bundle(explicit_ids[0], client=client, include=include)]
            else:
                bundles = [fetch_fixture_bundle(item, client=client, include=include) for item in explicit_ids]
        else:
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
            dataset_name="fixture_bundles_full" if args.full else "fixture_bundles",
            path=str(raw_path),
            content_hash=content_hash,
            row_count=len(bundles),
        )

    print(f"Banco: {db_path}")
    print(f"Snapshot bruto: {raw_path}")
    if args.full and not args.sample:
        if args.use_ids_param:
            print("Modo: full bundle via /fixtures?ids=... (somente se seu plano permitir)")
        else:
            print("Modo: full bundle via /fixtures?id=... (compatível com plano Free)")
    print_summary("API-Football → banco", summary)


if __name__ == "__main__":
    main()
