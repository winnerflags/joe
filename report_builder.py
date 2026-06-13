"""Headless report assembly — build the branded DOCX from CSV(s) without Streamlit.

This mirrors the orchestration in ``app.py`` (`_build_report_bytes`) so the same
branded report can be produced from a script or the CSV→Google Docs CLI. All
processing stays local and deterministic; this module adds no new analysis
logic, it just wires the existing cleaning / charts / sentiment / insights /
trends / report modules together.
"""

from __future__ import annotations

import io
from datetime import date
from typing import Optional

import pandas as pd

import charts
import insights
import report as report_mod
import sentiment as sent
import trends
from cleaning import (
    CATEGORICAL,
    DATE_COL,
    EVENT_COL,
    FREE_TEXT,
    SOURCE_COL,
    CleaningReport,
    detect_column_types,
    prepare,
)

# Columns that are infrastructure, not survey questions (matches app.py).
META_COLS = {EVENT_COL, DATE_COL, SOURCE_COL}


def question_columns(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if c not in META_COLS]


def load_csvs(
    paths: list[str],
    *,
    events: Optional[dict[str, str]] = None,
    dates: Optional[dict[str, str]] = None,
) -> tuple[pd.DataFrame, dict[str, str], list[tuple[str, CleaningReport]]]:
    """Read and clean one or more CSV files, returning the combined frame.

    Each file is cleaned independently (with an optional fallback event name and
    date), then concatenated and re-typed on the combined frame — exactly as the
    Streamlit app does. Raises the first :class:`cleaning.CSVReadError` it hits.
    """
    events = events or {}
    dates = dates or {}
    frames: list[pd.DataFrame] = []
    reports: list[tuple[str, CleaningReport]] = []
    for path in paths:
        name = path.rsplit("/", 1)[-1]
        with open(path, "rb") as fh:
            data = fh.read()
        prepared = prepare(
            io.BytesIO(data),
            name,
            fallback_event=events.get(name, name.rsplit(".", 1)[0]),
            fallback_date=dates.get(name),
        )
        frames.append(prepared.df)
        reports.append((name, prepared.report))

    if not frames:
        raise ValueError("No CSV files were provided.")

    combined = pd.concat(frames, ignore_index=True)
    types = detect_column_types(combined)
    return combined, types, reports


def build_report_docx(
    df: pd.DataFrame,
    types: dict[str, str],
    reports: list[tuple[str, CleaningReport]],
    profile: report_mod.ClientProfile,
    *,
    selected: Optional[list[str]] = None,
    takeaways: Optional[dict[str, str]] = None,
    future_text: Optional[str] = None,
    title: str = "Survey Insights Report",
) -> bytes:
    """Assemble the full branded report as DOCX bytes (Streamlit-free)."""
    palette = charts.brand_palette(profile.primary, profile.secondary)
    takeaways = takeaways or {}
    if selected is None:
        selected = question_columns(df)

    sections: list[report_mod.ChartSection] = []
    for q in selected:
        col_type = types.get(q, CATEGORICAL)
        chart_type = charts.default_chart_for(col_type)
        section = report_mod.ChartSection(title=q)
        try:
            fig = charts.build_chart(df, chart_type=chart_type, dimension=q, palette=palette, title=q)
            section.png = charts.fig_to_png_bytes(fig)
        except Exception:  # noqa: BLE001 - a bad chart shouldn't break the report
            section.png = None
        default_tk = insights.chart_takeaways(df, dimension=q, col_type=col_type)
        edited = takeaways.get(q)
        section.takeaways = [t for t in (edited.splitlines() if edited else default_tk) if t.strip()]

        if col_type == FREE_TEXT:
            res = sent.analyse_question(q, df[q])
            if res:
                dist_df = pd.DataFrame(
                    {"Sentiment": list(res.distribution.keys()), "Count": list(res.distribution.values())}
                )
                sfig = charts.build_chart(
                    dist_df, chart_type=charts.BAR, dimension="Sentiment", measure="Count",
                    agg=charts.SUM, palette=["#2E8B57", "#9E9E9E", "#C0392B"], title="Indicative sentiment",
                )
                section.sentiment = report_mod.SentimentBlock(
                    distribution=res.distribution, quotes=res.quotes, keywords=res.keywords,
                    dist_png=charts.fig_to_png_bytes(sfig),
                )
        sections.append(section)

    trend_sections: list[report_mod.ChartSection] = []
    if trends.is_multi_event(df):
        vol = trends.response_volume(df)
        trend_sections.append(
            report_mod.ChartSection(
                title="Response volume per event",
                png=charts.fig_to_png_bytes(trends.volume_chart(df, palette)),
                takeaways=insights.trend_takeaways(vol, "value", "Response volume"),
            )
        )

    ft_themes = {
        q: sent.analyse_question(q, df[q]).keywords
        for q in question_columns(df)
        if types.get(q) == FREE_TEXT and sent.analyse_question(q, df[q])
    }
    future = [
        f for f in (future_text or "").splitlines() if f.strip()
    ] or insights.future_questions(df, types, ft_themes)

    n_events = df[EVENT_COL].nunique() if EVENT_COL in df.columns else 1
    spec = report_mod.ReportSpec(
        title=title,
        subtitle=f"{n_events} event(s) · {len(df):,} responses · {date.today():%d %B %Y}",
        sections=sections,
        trend_sections=trend_sections,
        future_questions=future,
        data_quality=[line for _, rep in reports for line in rep.actions],
        event_summary=[
            f"{n_events} event(s) analysed",
            f"{len(df):,} survey submissions after cleaning & filtering",
            f"{len([c for c in question_columns(df) if df[c].notna().any()])} questions with responses",
        ],
    )
    return report_mod.generate_docx(profile, spec)
