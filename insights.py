"""Deterministic, rule-based insight generation.

Two kinds of output:
  * per-chart **takeaways** — top category, dominance, biggest change, outliers;
  * a survey-wide **future questions** section — flagging questions that are
    skipped a lot, categoricals dominated by one option, and recurring free-text
    themes that lack a structured question.

No randomness, no LLM. Given the same data the output is identical, so the text
can be trusted and lightly edited before export.
"""

from __future__ import annotations

from typing import Optional

import pandas as pd

from cleaning import CATEGORICAL, DATE, EVENT_COL, FREE_TEXT, NUMERIC
from charts import COUNT, MEAN, SUM


def _pct(part: float, whole: float) -> str:
    return f"{(100 * part / whole):.0f}%" if whole else "0%"


def chart_takeaways(
    df: pd.DataFrame,
    *,
    dimension: str,
    measure: Optional[str] = None,
    agg: str = COUNT,
    col_type: str = CATEGORICAL,
) -> list[str]:
    """2–4 deterministic takeaways describing the distribution of a dimension."""
    takeaways: list[str] = []

    if col_type == NUMERIC or (measure and agg in (SUM, MEAN)):
        values = pd.to_numeric(df[measure or dimension], errors="coerce").dropna()
        if values.empty:
            return ["No numeric values were available for this question."]
        takeaways.append(
            f"Average is {values.mean():.1f} (median {values.median():.1f}), "
            f"ranging from {values.min():.0f} to {values.max():.0f}."
        )
        # Outliers via 1.5×IQR.
        q1, q3 = values.quantile(0.25), values.quantile(0.75)
        iqr = q3 - q1
        outliers = values[(values < q1 - 1.5 * iqr) | (values > q3 + 1.5 * iqr)]
        if len(outliers):
            takeaways.append(
                f"{len(outliers)} response(s) are statistical outliers "
                f"(outside {q1 - 1.5 * iqr:.0f}–{q3 + 1.5 * iqr:.0f})."
            )
        return takeaways[:4]

    counts = df[dimension].dropna()
    total = len(counts)
    if total == 0:
        return ["No answers were recorded for this question."]
    vc = counts.value_counts()
    top_label, top_n = vc.index[0], int(vc.iloc[0])
    takeaways.append(
        f"Most common answer is “{top_label}” with {top_n} of {total} responses "
        f"({_pct(top_n, total)})."
    )
    if len(vc) > 1:
        second_label, second_n = vc.index[1], int(vc.iloc[1])
        takeaways.append(
            f"Next is “{second_label}” ({_pct(second_n, total)}); "
            f"{len(vc)} distinct answers in total."
        )
    if top_n / total >= 0.8:
        takeaways.append(
            f"Responses are highly concentrated — {_pct(top_n, total)} chose a single option."
        )
    elif top_n / total <= 0.25 and len(vc) >= 4:
        takeaways.append("Responses are spread fairly evenly across options.")
    # Rare options.
    rare = vc[vc == 1]
    if 0 < len(rare) <= 5:
        takeaways.append(f"{len(rare)} answer(s) appeared only once.")
    return takeaways[:4]


def trend_takeaways(trend_df: pd.DataFrame, value_col: str, label: str) -> list[str]:
    """Takeaways for a cross-event metric over time (expects columns event/value)."""
    if trend_df.empty or value_col not in trend_df:
        return []
    out: list[str] = []
    first, last = trend_df.iloc[0], trend_df.iloc[-1]
    change = last[value_col] - first[value_col]
    direction = "increased" if change > 0 else "decreased" if change < 0 else "held steady"
    out.append(
        f"{label} {direction} from {first[value_col]:.0f} ({first[EVENT_COL]}) "
        f"to {last[value_col]:.0f} ({last[EVENT_COL]})."
    )
    peak = trend_df.loc[trend_df[value_col].idxmax()]
    trough = trend_df.loc[trend_df[value_col].idxmin()]
    out.append(
        f"Peak was {peak[value_col]:.0f} at {peak[EVENT_COL]}; "
        f"lowest was {trough[value_col]:.0f} at {trough[EVENT_COL]}."
    )
    # Biggest event-to-event jump.
    diffs = trend_df[value_col].diff()
    if diffs.notna().any():
        idx = diffs.abs().idxmax()
        jump = diffs.loc[idx]
        out.append(
            f"Largest single change was {jump:+.0f} at {trend_df.loc[idx, EVENT_COL]}."
        )
    return out[:4]


def future_questions(
    df: pd.DataFrame,
    types: dict[str, str],
    free_text_themes: Optional[dict[str, list[tuple[str, int]]]] = None,
    *,
    skip_threshold: float = 0.4,
    dominance_threshold: float = 0.8,
) -> list[str]:
    """Survey-design suggestions for the next round, all rule-based."""
    suggestions: list[str] = []
    n = len(df)
    if n == 0:
        return suggestions
    ignore = {EVENT_COL}

    # 1) High skip-rate questions. Only count respondents at events that actually
    #    asked the question — otherwise event-specific questions look 100% skipped
    #    simply because other events never included them.
    has_events = EVENT_COL in df.columns
    for col, kind in types.items():
        if col in ignore or kind == DATE:
            continue
        if has_events:
            asked_events = df.loc[df[col].notna(), EVENT_COL].unique()
            scope = df[df[EVENT_COL].isin(asked_events)]
        else:
            scope = df
        if len(scope) < 10:
            continue
        skip_rate = scope[col].isna().mean()
        if skip_rate >= skip_threshold:
            suggestions.append(
                f"“{col}” was skipped by {skip_rate * 100:.0f}% of respondents "
                f"(at events where it was asked) — consider rewording, making it "
                f"optional, or dropping it."
            )

    # 2) Categoricals dominated by one option.
    for col, kind in types.items():
        if kind != CATEGORICAL or col in ignore:
            continue
        non_null = df[col].dropna()
        if len(non_null) < 10:
            continue
        share = non_null.value_counts(normalize=True).iloc[0]
        if share >= dominance_threshold:
            top = non_null.value_counts().index[0]
            suggestions.append(
                f"“{col}” is dominated by one answer (“{top}”, {share * 100:.0f}%) — "
                f"it may no longer be discriminating; consider replacing it."
            )

    # 3) Frequent free-text themes lacking a structured question.
    if free_text_themes:
        for col, themes in free_text_themes.items():
            strong = [w for w, c in themes[:3] if c >= max(5, 0.1 * n)]
            if strong:
                suggestions.append(
                    f"Free-text answers to “{col}” frequently mention "
                    f"{', '.join(strong)} — consider adding a structured "
                    f"multiple-choice question covering these."
                )

    if not suggestions:
        suggestions.append(
            "No obvious survey-design issues detected: skip rates are healthy and "
            "no categorical question is dominated by a single option."
        )
    return suggestions
