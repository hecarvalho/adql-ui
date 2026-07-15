from __future__ import annotations

from pathlib import Path

import pandas as pd


def create_shot_map_png(
    shots: pd.DataFrame,
    output_path: str | Path,
    title: str = "Mapa de finalizações",
    x_column: str = "x",
    y_column: str = "y",
) -> Path:
    """Gera um mapa de chutes básico com mplsoccer.

    O DataFrame deve conter coordenadas já normalizadas para o tipo de campo escolhido.
    """
    from mplsoccer import Pitch
    import matplotlib.pyplot as plt

    if x_column not in shots.columns or y_column not in shots.columns:
        raise ValueError(f"Colunas de coordenadas não encontradas: {x_column}, {y_column}")

    pitch = Pitch(pitch_type="statsbomb", line_zorder=2)
    fig, ax = pitch.draw(figsize=(10, 7))
    pitch.scatter(shots[x_column], shots[y_column], ax=ax, s=80, alpha=0.75)
    ax.set_title(title)

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output, dpi=200, bbox_inches="tight")
    plt.close(fig)
    return output
