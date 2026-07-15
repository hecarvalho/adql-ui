from __future__ import annotations

from pathlib import Path
from typing import Iterable


def create_basic_radar_png(
    labels: Iterable[str],
    values: Iterable[float],
    output_path: str | Path,
    title: str = "Radar",
    min_range: float = 0,
    max_range: float = 100,
) -> Path:
    """Gera um radar simples com mplsoccer.

    Esta função é opcional: o ADQL UI já tem radar editável. Use apenas para análises Python ou prévia.
    """
    from mplsoccer import Radar
    import matplotlib.pyplot as plt

    label_list = list(labels)
    value_list = [float(value) for value in values]
    low = [min_range] * len(label_list)
    high = [max_range] * len(label_list)

    radar = Radar(label_list, low, high)
    fig, ax = radar.setup_axis()
    radar.draw_circles(ax=ax, facecolor="none", edgecolor="0.7")
    radar.draw_radar(value_list, ax=ax, kwargs_radar={"alpha": 0.6})
    radar.draw_range_labels(ax=ax, fontsize=8)
    radar.draw_param_labels(ax=ax, fontsize=9)
    ax.set_title(title)

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output, dpi=200, bbox_inches="tight")
    plt.close(fig)
    return output
