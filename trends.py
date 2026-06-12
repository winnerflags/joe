"""Cross-event trend analysis.

Events share identical headers, so alignment is on **exact column names** — no
fuzzy matching. Events are ordered by their date (falling back to first
appearance) so "over time" is meaningful.
"""

from __future__ import annotations

from typing import Optional

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from charts import COUNT, MEAN, SUM, brand_palette
from cleaning import DATE_COL, EVENT_COL
from sentiment import NEGATIVE, NEUTRAL, POSITIVE, classify_series


def event_order(df: pd.DataFrame) -> list[str]:
    """Return event names ordered by their earliest date (then first appearance)."""
    if EVENT_COL not in df.columns:
        return []
    if DATE_COL in df.columns and df[DATE_COL].notna().any():
        order = (
            df.dropna(subset=[DATE_COL])
            .groupby(EVENT_COL)[DATE_COL]
            .min()
            .sort_values()
        )
        ordered = list(order.index)
        # Append any events that had no date at the end, preserving appearance.
        for ev in df[EVENT_COL].dropna().unique():
            if ev not in ordered:
                ordered.append(ev)
        return ordered
    return list(pd.unique(df[EVENT_COL].dropna()))


def is_multi_event(df: pd.DataFrame) -> bool:
    return EVENT_COL in df.columns and df[EVENT_COL].nunique(dropna=True) > 1


def response_volume(df: pd.DataFrame) -> pd.DataFrame:
    """Submissions (rows) per event, in time order."""
    order = event_order(df)
    vol = df.groupby(EVENT_COL).size().reindex(order).reset_index(name="value")
    vol = vol.rename(columns={"index": EVENT_COL})
    return vol


def metric_over_time(
    df: pd.DataFrame, question: str, *, agg: str = COUNT, option: Optional[str] = None
) -> pd.DataFrame:
    """A metric for one question across events.

    - agg=count with an ``option`` → count of that answer per event.
    - agg=count without option   → number of non-null answers per event.
    - agg=sum/mean               → numeric aggregate of the answer per event.
    """
    order = event_order(df)
    work = df[[EVENT_COL, question]].copy()
    if agg in (SUM, MEAN):
        work[question] = pd.to_numeric(work[question], errors="coerce")
        series = work.groupby(EVENT_COL)[question].agg("mean" if agg == MEAN else "sum")
    elif option is not None:
        series = work[work[question] == option].groupby(EVENT_COL).size()
    else:
        series = work.dropna(subset=[question]).groupby(EVENT_COL).size()
    out = series.reindex(order).fillna(0).reset_index(name="value")
    out = out.rename(columns={"index": EVENT_COL})
    return out


def sentiment_trend(df: pd.DataFrame, question: str) -> pd.DataFrame:
    """Per-event sentiment breakdown (% positive/neutral/negative) for a question."""
    order = event_order(df)
    rows = []
    for ev in order:
        responses = df.loc[df[EVENT_COL] == ev, question]
        classified = classify_series(responses)
        total = len(classified)
        if total == 0:
            continue
        rows.append(
            {
                EVENT_COL: ev,
                POSITIVE: 100 * (classified["label"] == POSITIVE).sum() / total,
                NEUTRAL: 100 * (classified["label"] == NEUTRAL).sum() / total,
                NEGATIVE: 100 * (classified["label"] == NEGATIVE).sum() / total,
                "n": total,
            }
        )
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- #
# Figures
# --------------------------------------------------------------------------- #
def _style(fig: go.Figure, title: str, ytitle: str) -> go.Figure:
    fig.update_layout(
        title=title,
        template="plotly_white",
        margin=dict(l=40, r=20, t=60, b=80),
        font=dict(family="Helvetica, Arial, sans-serif", size=13),
        legend=dict(orientation="h", yanchor="bottom", y=-0.35),
    )
    fig.update_yaxes(title=ytitle)
    fig.update_xaxes(title="", tickangle=-30)
    return fig


def volume_chart(df: pd.DataFrame, palette: Optional[list[str]] = None) -> go.Figure:
    palette = palette or brand_palette()
    vol = response_volume(df)
    fig = px.bar(vol, x=EVENT_COL, y="value", color_discrete_sequence=palette)
    return _style(fig, "Response volume per event", "Submissions")


def metric_chart(
    trend_df: pd.DataFrame, title: str, ytitle: str, palette: Optional[list[str]] = None
) -> go.Figure:
    palette = palette or brand_palette()
    fig = px.line(trend_df, x=EVENT_COL, y="value", markers=True,
                  color_discrete_sequence=palette)
    return _style(fig, title, ytitle)


def sentiment_trend_chart(
    trend_df: pd.DataFrame, question: str, palette: Optional[list[str]] = None
) -> go.Figure:
    # Fixed, intuitive colours for sentiment regardless of brand palette.
    colours = {POSITIVE: "#2E8B57", NEUTRAL: "#9E9E9E", NEGATIVE: "#C0392B"}
    fig = go.Figure()
    for label in (POSITIVE, NEUTRAL, NEGATIVE):
        if label in trend_df:
            fig.add_trace(
                go.Scatter(
                    x=trend_df[EVENT_COL], y=trend_df[label], mode="lines+markers",
                    name=label, line=dict(color=colours[label]),
                )
            )
    return _style(fig, f"Indicative sentiment trend — {question}", "% of responses")
