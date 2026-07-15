from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.adql_export.to_c05_player_comparison import players_to_c05_comparison
from adql_analytics.config import load_config
from adql_analytics.io import write_json


def main() -> None:
    config = load_config()

    payload = players_to_c05_comparison(
        title="Comparação entre jogadores",
        subtitle="Exemplo de saída para ADQL C-05",
        metrics=["Criação", "Finalização", "Progressão", "Defesa"],
        players=[
            {"name": "Jogador A", "team": "Time A", "values": {"Criação": 84, "Finalização": 70, "Progressão": 76, "Defesa": 42}},
            {"name": "Jogador B", "team": "Time B", "values": {"Criação": 71, "Finalização": 81, "Progressão": 63, "Defesa": 55}},
        ],
    )

    output_path = config.output_dir / "c05_player_comparison_example.json"
    write_json(payload, output_path)
    print(f"Arquivo gerado: {output_path}")


if __name__ == "__main__":
    main()
