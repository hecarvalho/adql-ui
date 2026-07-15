from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.adql_export.to_c06_table import dataframe_to_c06_table
from adql_analytics.config import load_config
from adql_analytics.io import write_json


def main() -> None:
    config = load_config()

    df = pd.DataFrame(
        [
            ["Brasil", 12.4, 2.1, 58, "Alta"],
            ["Japão", 9.7, 1.4, 51, "Média"],
        ],
        columns=["Equipe", "Finalizações", "xG", "Posse %", "Pressão"],
    )

    payload = dataframe_to_c06_table(
        df,
        title="Comparação estatística",
        subtitle="Exemplo de saída para ADQL C-06",
    )

    output_path = config.output_dir / "c06_table_example.json"
    write_json(payload, output_path)
    print(f"Arquivo gerado: {output_path}")


if __name__ == "__main__":
    main()
