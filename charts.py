"""Chart construction with plotly, brand-aware palettes, and PNG export.

All charts are built from a dimension (what to group by) and an optional measure
(what to aggregate). Defaults are chosen from the column type so the user gets a
sensible chart with zero configuration.
"""

from __future__ import annotations

from typing import Optional

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from cleaning import CATEGORICAL, DATE, FREE_TEXT, NUMERIC

# Chart kinds the UI offers.
BAR = "bar"
LINE = "line"
PIE = "pie"
STACKED_BAR = "stacked_bar"
HISTOGRAM = "histogram"

CHART_TYPES = [BAR, LINE, PIE, STACKED_BAR, HISTOGRAM]

# Aggregations for a measure.
COUNT = "count"
SUM = "sum"
MEAN = "mean"


def _hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def _mix(c1: str, c2: str, t: float) -> str:
    a, b = _hex_to_rgb(c1), _hex_to_rgb(c2)
    r, g, bl = (round(a[i] + (b[i] - a[i]) * t) for i in range(3))
    return f"#{r:02x}{g:02x}{bl:02x}"


def brand_palette(primary: str = "#1F4E79", secondary: str = "#E8A33D", n: int = 8) -> list[str]:
    """Build an n-colour categorical palette interpolated between brand colours.

    The first two slots are the exact brand colours so single/two-series charts
    are perfectly on-brand; further slots interpolate towards white and black for
    contrast.
    """
    base = [primary, secondary]
    if n <= 2:
        return base[:n]
    extra = []
    # Alternate lighter/darker tints derived from the two brand colours.
    steps = [0.35, 0.7, 0.2, 0.55, 0.85, 0.45]
    for i in range(n - 2):
        src = primary if i % 2 == 0 else secondary
        target = "#ffffff" if (i // 2) % 2 == 0 else "#222222"
        extra.append(_mix(src, target, steps[i % len(steps)]))
    return base + extra


def default_chart_for(col_type: str) -> str:
    """Sensible default chart type for a dimension of the given type."""
    return {
        CATEGORICAL: BAR,
        DATE: LINE,
        NUMERIC: HISTOGRAM,
        FREE_TEXT: BAR,
    }.get(col_type, BAR)


def _aggregate(
    df: pd.DataFrame,
    dimension: str,
    measure: Optional[str],
    agg: str,
    top_n: int = 20,
) -> pd.DataFrame:
    """Return a tidy 2-column frame [dimension, value] ready to plot."""
    work = df[[c for c in {dimension, measure} if c]].copy()
    work = work.dropna(subset=[dimension])

    if agg == COUNT or not measure:
        grouped = work.groupby(dimension).size().reset_index(name="value")
    else:
        work[measure] = pd.to_numeric(work[measure], errors="coerce")
        grouped = (
            work.groupby(dimension)[measure]
            .agg("mean" if agg == MEAN else "sum")
            .reset_index()
            .rename(columns={measure: "value"})
        )
    grouped = grouped.sort_values("value", ascending=False)
    if len(grouped) > top_n:
        grouped = grouped.head(top_n)
    return grouped


def _style(fig: go.Figure, title: str) -> go.Figure:
    fig.update_layout(
        title=title,
        template="plotly_white",
        margin=dict(l=40, r=20, t=60, b=40),
        font=dict(family="Helvetica, Arial, sans-serif", size=13),
        legend=dict(orientation="h", yanchor="bottom", y=-0.25),
    )
    return fig


def build_chart(
    df: pd.DataFrame,
    *,
    chart_type: str,
    dimension: str,
    measure: Optional[str] = None,
    agg: str = COUNT,
    series: Optional[str] = None,
    palette: Optional[list[str]] = None,
    title: Optional[str] = None,
    top_n: int = 20,
) -> go.Figure:
    """Build a styled plotly figure for the requested chart type."""
    palette = palette or brand_palette()
    title = title or f"{dimension}"

    if chart_type == HISTOGRAM:
        values = pd.to_numeric(df[dimension], errors="coerce").dropna()
        fig = px.histogram(values, x=values, nbins=20, color_discrete_sequence=palette)
        fig.update_layout(showlegend=False)
        return _style(fig, title)

    if chart_type == STACKED_BAR and series:
        ct = (
            df.dropna(subset=[dimension, series])
            .groupby([dimension, series])
            .size()
            .reset_index(name="value")
        )
        fig = px.bar(
            ct, x=dimension, y="value", color=series,
            color_discrete_sequence=palette, barmode="stack",
        )
        return _style(fig, title)

    data = _aggregate(df, dimension, measure, agg, top_n)
    label = "count" if (agg == COUNT or not measure) else f"{agg} of {measure}"

    if chart_type == PIE:
        fig = px.pie(
            data, names=dimension, values="value",
            color_discrete_sequence=palette, hole=0.35,
        )
        fig.update_traces(textposition="inside", textinfo="percent+label")
    elif chart_type == LINE:
        data = data.sort_values(dimension)
        fig = px.line(data, x=dimension, y="value", markers=True,
                      color_discrete_sequence=palette)
        fig.update_yaxes(title=label)
    else:  # BAR (and stacked_bar without a series falls back to bar)
        fig = px.bar(data, x=dimension, y="value", color_discrete_sequence=palette)
        fig.update_yaxes(title=label)
    return _style(fig, title)


def fig_to_png_bytes(fig: go.Figure, width: int = 900, height: int = 500, scale: int = 2) -> bytes:
    """Render a figure to PNG bytes via kaleido (offline)."""
    return fig.to_image(format="png", width=width, height=height, scale=scale)
