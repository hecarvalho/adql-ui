from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.adql_export.to_c03_scene import simple_c03_scene
from adql_analytics.config import load_config
from adql_analytics.io import write_json


def main() -> None:
    config = load_config()

    payload = simple_c03_scene(
        title="Circulação pelo lado e ataque ao espaço",
        subtitle="Exemplo de cena tática para ADQL C-03",
        description=(
            "A equipe atrai pressão no corredor direito, conecta por dentro "
            "e acelera no espaço entre lateral e zagueiro."
        ),
        source="ADQL Analytics Layer • exemplo local",
        players=[
            {"id": "p1", "label": "2", "type": "team", "x": 18, "y": 70, "role": "lateral"},
            {"id": "p2", "label": "8", "type": "team", "x": 35, "y": 61, "role": "meio"},
            {"id": "p3", "label": "10", "type": "highlight", "x": 51, "y": 51, "role": "meia"},
            {"id": "p4", "label": "7", "type": "team", "x": 68, "y": 40, "role": "ponta"},
            {"id": "p5", "label": "9", "type": "team", "x": 83, "y": 26, "role": "atacante"},
            {"id": "o1", "label": "4", "type": "opponent", "x": 27, "y": 42, "role": "defensor"},
            {"id": "o2", "label": "6", "type": "opponent", "x": 44, "y": 39, "role": "volante"},
            {"id": "o3", "label": "3", "type": "opponent", "x": 62, "y": 52, "role": "zagueiro"},
            {"id": "o4", "label": "5", "type": "opponent", "x": 78, "y": 58, "role": "lateral"},
        ],
        actions=[
            {"type": "pass", "from": "p1", "to": "p2", "bend": 0.08},
            {"type": "pass", "from": "p2", "to": "p3", "bend": 0.12},
            {"type": "carry", "from": "p3", "to": "p4"},
            {"type": "run", "from": "p4", "to": "p5", "bend": -0.2},
            {"type": "pressure", "playerId": "o1", "radius": 31},
            {"type": "pressure", "playerId": "o2", "radius": 29},
        ],
        zones=[
            {"x": 58, "y": 17, "w": 28, "h": 42},
        ],
        gates=[
            {"x1": 48, "y1": 35, "x2": 53, "y2": 65},
        ],
        step_copy=[
            {
                "title": "Atrair",
                "text": "Fixar a primeira pressão no corredor lateral.",
            },
            {
                "title": "Conectar",
                "text": "Usar o apoio interior para girar a orientação da defesa.",
            },
            {
                "title": "Acelerar",
                "text": "Atacar o espaço antes da recomposição do bloco.",
            },
        ],
    )

    output_path = config.output_dir / "c03_scene_example.json"
    write_json(payload, output_path)
    print(f"Arquivo gerado: {output_path}")


if __name__ == "__main__":
    main()
