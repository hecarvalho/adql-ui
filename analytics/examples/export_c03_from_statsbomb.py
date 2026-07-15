from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.config import load_config
from adql_analytics.io import write_dataframe, write_json
from adql_analytics.sources.statsbomb_events import (
    StatsBombEventsSource,
    filter_events,
    sample_statsbomb_events,
    select_possession_ending_in_shot,
)
from adql_analytics.transforms.tactical_sequence import (
    TacticalSequenceOptions,
    events_to_c03_scene,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Gera um JSON C-03 Tactical Pitch a partir de eventos StatsBomb Open Data."
    )
    parser.add_argument("--sample", action="store_true", help="Usa uma sequência local para testar sem internet.")
    parser.add_argument("--list-competitions", action="store_true", help="Lista competições abertas disponíveis.")
    parser.add_argument("--list-matches", action="store_true", help="Lista partidas de uma competição/temporada.")
    parser.add_argument("--competition-id", type=int, default=None, help="ID da competição StatsBomb.")
    parser.add_argument("--season-id", type=int, default=None, help="ID da temporada StatsBomb.")
    parser.add_argument("--match-id", type=int, default=None, help="ID da partida StatsBomb.")
    parser.add_argument("--team", default=None, help="Equipe da posse/recorte. Ex.: Argentina.")
    parser.add_argument("--possession", type=int, default=None, help="Número da posse StatsBomb a exportar.")
    parser.add_argument("--minute-from", type=int, default=None, help="Minuto inicial do recorte.")
    parser.add_argument("--minute-to", type=int, default=None, help="Minuto final do recorte.")
    parser.add_argument("--auto-shot", action="store_true", help="Seleciona automaticamente a primeira posse com finalização.")
    parser.add_argument("--max-events", type=int, default=10, help="Máximo de eventos usados no C-03.")
    parser.add_argument("--flip-x", action="store_true", help="Inverte o eixo X para orientar a jogada no sentido oposto.")
    parser.add_argument("--title", default="Sequência StatsBomb", help="Título do card C-03.")
    parser.add_argument("--subtitle", default="StatsBomb Open Data → ADQL C-03", help="Subtítulo do card C-03.")
    parser.add_argument("--output", default="c03_statsbomb_sequence.json", help="Arquivo JSON de saída dentro de analytics/outputs.")
    parser.add_argument("--raw-output", default="statsbomb_events_sequence.csv", help="CSV bruto dentro de analytics/data/raw.")
    return parser.parse_args()


def print_competitions(source: StatsBombEventsSource) -> None:
    competitions = source.competitions()
    columns = [
        column
        for column in ["competition_id", "season_id", "competition_name", "season_name", "country_name"]
        if column in competitions.columns
    ]
    print(competitions[columns].to_string(index=False))


def print_matches(source: StatsBombEventsSource, competition_id: int, season_id: int) -> None:
    matches = source.matches(competition_id=competition_id, season_id=season_id)
    columns = [
        column
        for column in ["match_id", "match_date", "home_team", "away_team", "competition", "season"]
        if column in matches.columns
    ]
    print(matches[columns].to_string(index=False))


def main() -> None:
    args = parse_args()
    config = load_config()
    source = StatsBombEventsSource()

    if args.list_competitions:
        print_competitions(source)
        return

    if args.list_matches:
        if args.competition_id is None or args.season_id is None:
            raise SystemExit("Use --competition-id e --season-id junto com --list-matches.")
        print_matches(source, args.competition_id, args.season_id)
        return

    if args.sample:
        events = sample_statsbomb_events()
        source_label = "Base local fictícia / ADQL Analytics Layer"
        attacking_team = args.team or "Brasil"
    else:
        if args.match_id is None:
            raise SystemExit("Informe --match-id ou use --sample. Para descobrir partidas: --list-competitions e --list-matches.")
        events = source.events(args.match_id)
        source_label = f"StatsBomb Open Data via statsbombpy | match_id={args.match_id}"
        attacking_team = args.team

    if args.auto_shot:
        sequence = select_possession_ending_in_shot(
            events,
            team=args.team,
            max_events=args.max_events,
        )
    else:
        sequence = filter_events(
            events,
            team=args.team,
            possession=args.possession,
            minute_from=args.minute_from,
            minute_to=args.minute_to,
            max_events=args.max_events,
        )

    if sequence.empty:
        raise SystemExit("Nenhum evento encontrado com os filtros informados.")

    raw_path = config.raw_data_dir / args.raw_output
    write_dataframe(sequence, raw_path)

    payload = events_to_c03_scene(
        sequence,
        options=TacticalSequenceOptions(
            title=args.title,
            subtitle=args.subtitle,
            source=source_label,
            attacking_team=attacking_team,
            flip_x=args.flip_x,
            max_events=args.max_events,
        ),
    )

    output_path = config.output_dir / args.output
    write_json(payload, output_path)

    print(f"CSV bruto: {raw_path}")
    print(f"JSON C-03: {output_path}")
    print("Importe o JSON no ADQL UI pelo card do C-03 Analytics Layer.")


if __name__ == "__main__":
    main()
