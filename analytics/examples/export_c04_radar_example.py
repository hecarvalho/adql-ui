from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.adql_export.to_c04_radar import metrics_to_c04_radar
from adql_analytics.config import load_config
from adql_analytics.io import write_json


def main() -> None:
    config = load_config()

    payload = metrics_to_c04_radar(
        title="Perfil de desempenho",
        subtitle="Exemplo de radar para ADQL C-04",
        entity_name="Brasil",
        metrics=[
            {"label": "Criação", "value": 78},
            {"label": "Finalização", "value": 71},
            {"label": "Pressão", "value": 66},
            {"label": "Progressão", "value": 82},
            {"label": "Controle", "value": 74},
        ],
    )

    output_path = config.output_dir / "c04_radar_example.json"
    write_json(payload, output_path)
    print(f"Arquivo gerado: {output_path}")


if __name__ == "__main__":
    main()
