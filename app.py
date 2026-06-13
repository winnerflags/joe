"""CUIGG Reporting Tool — Streamlit front-end.

Run with::

    streamlit run app.py

End-to-end flow: upload one or more CSV exports → automatic cleaning → filter →
explore charts → indicative sentiment → cross-event trends → branded DOCX report.
All processing is local and deterministic; no external APIs or LLM calls.
"""

from __future__ import annotations

import io
import os
from datetime import date

import pandas as pd
import streamlit as st

import charts
import insights
import report as report_mod
import sentiment as sent
import trends
from cleaning import (
    CATEGORICAL,
    DATE,
    DATE_COL,
    EVENT_COL,
    FREE_TEXT,
    NUMERIC,
    SOURCE_COL,
    CSVReadError,
    prepare,
)

st.set_page_config(page_title="CUIGG Reporting", layout="wide", page_icon="📊")

# Link back to the WinnerFlags × CUIGG app hub (the Next.js front door). The
# Report Maker stays a fully separate app; this is just a convenience link.
HUB_URL = os.getenv("HUB_URL", "http://localhost:3000")

# Columns that are infrastructure, not survey questions.
META_COLS = {EVENT_COL, DATE_COL, SOURCE_COL}


# --------------------------------------------------------------------------- #
# Session state helpers
# --------------------------------------------------------------------------- #
def _init_state() -> None:
    st.session_state.setdefault("data", None)  # combined cleaned DataFrame
    st.session_state.setdefault("types", {})
    st.session_state.setdefault("reports", [])  # list[(filename, CleaningReport)]
    st.session_state.setdefault("takeaways", {})  # question -> edited text
    st.session_state.setdefault("future_text", None)
    st.session_state.setdefault("profile", report_mod.ClientProfile())


def _question_columns(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if c not in META_COLS]


def _palette() -> list[str]:
    p = st.session_state.profile
    return charts.brand_palette(p.primary, p.secondary)


# --------------------------------------------------------------------------- #
# Upload & cleaning
# --------------------------------------------------------------------------- #
def upload_section() -> None:
    st.sidebar.header("1 · Upload data")
    files = st.sidebar.file_uploader(
        "CSV export(s) — one or more events",
        type=["csv"],
        accept_multiple_files=True,
        help="Each file may contain its own 'Event' column (multiple events), or "
        "you can name it below.",
    )

    meta: dict[str, dict] = {}
    if files:
        with st.sidebar.expander("Event names & dates (fallbacks)", expanded=False):
            st.caption(
                "Used only if a file has no Event/Date column of its own."
            )
            for f in files:
                meta[f.name] = {
                    "event": st.text_input(
                        f"Event name — {f.name}", value=f.name.rsplit(".", 1)[0], key=f"ev_{f.name}"
                    ),
                    "date": st.date_input(
                        f"Event date — {f.name}", value=date.today(), key=f"dt_{f.name}"
                    ),
                }

    if files and st.sidebar.button("Process files", type="primary"):
        frames, reports, all_types = [], [], {}
        errors = []
        for f in files:
            try:
                prepared = prepare(
                    io.BytesIO(f.getvalue()),
                    f.name,
                    fallback_event=meta.get(f.name, {}).get("event"),
                    fallback_date=str(meta.get(f.name, {}).get("date", "")),
                )
                frames.append(prepared.df)
                reports.append((f.name, prepared.report))
                all_types.update(prepared.types)
            except CSVReadError as exc:
                errors.append(str(exc))
            except Exception as exc:  # noqa: BLE001 - never show a stack trace
                errors.append(f"'{f.name}' could not be processed: {exc}")

        for e in errors:
            st.sidebar.error(e)

        if frames:
            combined = pd.concat(frames, ignore_index=True)
            # Re-detect types on the combined frame for consistency.
            from cleaning import detect_column_types

            st.session_state.data = combined
            st.session_state.types = detect_column_types(combined)
            st.session_state.reports = reports
            st.session_state.takeaways = {}
            st.session_state.future_text = None
            st.sidebar.success(
                f"Processed {len(frames)} file(s): {len(combined):,} rows, "
                f"{len(_question_columns(combined))} questions."
            )


# --------------------------------------------------------------------------- #
# Filters
# --------------------------------------------------------------------------- #
def build_filters(df: pd.DataFrame, types: dict[str, str]) -> pd.Series:
    st.sidebar.header("2 · Filters")
    if st.sidebar.button("Reset filters"):
        for key in list(st.session_state.keys()):
            if key.startswith("flt_"):
                del st.session_state[key]
        st.rerun()

    mask = pd.Series(True, index=df.index)

    # Event selector first.
    if EVENT_COL in df.columns and df[EVENT_COL].nunique() > 1:
        opts = sorted(df[EVENT_COL].dropna().unique(), key=str)
        chosen = st.sidebar.multiselect("Event", opts, default=opts, key="flt_event")
        if chosen:
            mask &= df[EVENT_COL].isin(chosen)

    # Date range.
    if DATE_COL in df.columns and df[DATE_COL].notna().any():
        dates = pd.to_datetime(df[DATE_COL], errors="coerce")
        lo, hi = dates.min(), dates.max()
        if pd.notna(lo) and pd.notna(hi) and lo != hi:
            rng = st.sidebar.date_input(
                "Date range", value=(lo.date(), hi.date()),
                min_value=lo.date(), max_value=hi.date(), key="flt_dates",
            )
            if isinstance(rng, (list, tuple)) and len(rng) == 2:
                start, end = pd.Timestamp(rng[0], tz=dates.dt.tz), pd.Timestamp(rng[1], tz=dates.dt.tz)
                mask &= dates.isna() | ((dates >= start) & (dates <= end + pd.Timedelta(days=1)))

    with st.sidebar.expander("More filters"):
        for col, kind in types.items():
            if col in META_COLS:
                continue
            if kind == NUMERIC:
                series = pd.to_numeric(df[col], errors="coerce")
                if series.notna().sum() < 2:
                    continue
                lo, hi = float(series.min()), float(series.max())
                if lo == hi:
                    continue
                sel = st.slider(col[:40], lo, hi, (lo, hi), key=f"flt_num_{col}")
                mask &= series.isna() | series.between(*sel)
            elif kind == CATEGORICAL:
                non_null = df[col].dropna()
                nunique = non_null.nunique()
                if not (2 <= nunique <= 15):
                    continue
                opts = sorted(non_null.unique(), key=str)
                sel = st.multiselect(col[:40], opts, default=opts, key=f"flt_cat_{col}")
                if sel and len(sel) < len(opts):
                    mask &= df[col].isin(sel) | df[col].isna()

    st.sidebar.metric("Rows after filters", f"{int(mask.sum()):,}", f"of {len(df):,}")
    return mask


# --------------------------------------------------------------------------- #
# Tabs
# --------------------------------------------------------------------------- #
def tab_data(df: pd.DataFrame, types: dict[str, str]) -> None:
    st.subheader("Cleaning summary")
    st.caption("Every automated action is listed. No data is ever silently dropped.")
    for name, rep in st.session_state.reports:
        with st.expander(f"📄 {name}", expanded=len(st.session_state.reports) == 1):
            st.markdown(rep.as_markdown())

    st.subheader("Detected column types")
    type_df = pd.DataFrame(
        [(c, types[c]) for c in df.columns], columns=["Column", "Type"]
    )
    st.dataframe(type_df, use_container_width=True, hide_index=True)

    st.subheader("Cleaned data preview")
    st.dataframe(df.head(200), use_container_width=True)


def tab_charts(df: pd.DataFrame, types: dict[str, str]) -> None:
    questions = _question_columns(df)
    if not questions:
        st.info("No question columns available.")
        return

    c1, c2, c3, c4 = st.columns(4)
    dimension = c1.selectbox("Question / dimension", questions, key="chart_dim")
    col_type = types.get(dimension, CATEGORICAL)
    default_ct = charts.default_chart_for(col_type)
    chart_type = c2.selectbox(
        "Chart type", charts.CHART_TYPES, index=charts.CHART_TYPES.index(default_ct), key="chart_type"
    )

    numeric_cols = [c for c in questions if types.get(c) == NUMERIC]
    measure = c3.selectbox("Measure (optional)", ["(count)"] + numeric_cols, key="chart_measure")
    measure = None if measure == "(count)" else measure
    agg = c4.selectbox("Aggregation", [charts.COUNT, charts.SUM, charts.MEAN], key="chart_agg")

    series = None
    if chart_type == charts.STACKED_BAR:
        cat_cols = [c for c in questions if types.get(c) == CATEGORICAL and c != dimension]
        series = st.selectbox("Stack by", ["(none)"] + cat_cols, key="chart_series")
        series = None if series == "(none)" else series

    try:
        fig = charts.build_chart(
            df, chart_type=chart_type, dimension=dimension, measure=measure,
            agg=agg, series=series, palette=_palette(), title=dimension,
        )
        st.plotly_chart(fig, use_container_width=True)
        png = charts.fig_to_png_bytes(fig)
        st.download_button(
            "⬇ Download PNG", png, file_name=f"{dimension[:30]}.png", mime="image/png"
        )
    except Exception as exc:  # noqa: BLE001
        st.error(f"Could not build this chart: {exc}")
        return

    st.markdown("**Key takeaways** *(editable, used in the report)*")
    default_tk = "\n".join(
        insights.chart_takeaways(df, dimension=dimension, measure=measure, agg=agg, col_type=col_type)
    )
    st.session_state.takeaways[dimension] = st.text_area(
        "Takeaways", value=st.session_state.takeaways.get(dimension, default_tk),
        key=f"tk_{dimension}", label_visibility="collapsed",
    )


def tab_sentiment(df: pd.DataFrame, types: dict[str, str]) -> None:
    st.caption(f"All sentiment below is **{sent.DISCLAIMER}** using the VADER lexicon.")
    free_text = [c for c in _question_columns(df) if types.get(c) == FREE_TEXT]
    if not free_text:
        st.info("No free-text questions were detected in this data.")
        return
    question = st.selectbox("Free-text question", free_text, key="sent_q")
    result = sent.analyse_question(question, df[question])
    if result is None:
        st.info("No responses to analyse for this question.")
        return

    left, right = st.columns([1, 1])
    dist_df = pd.DataFrame(
        {"Sentiment": list(result.distribution.keys()), "Count": list(result.distribution.values())}
    )
    fig = charts.build_chart(
        dist_df, chart_type=charts.BAR, dimension="Sentiment", measure="Count",
        agg=charts.SUM, palette=["#2E8B57", "#9E9E9E", "#C0392B"],
        title=f"Indicative sentiment — {question[:40]}",
    )
    left.plotly_chart(fig, use_container_width=True)

    right.markdown("**Top keyword themes**")
    if result.keywords:
        right.dataframe(
            pd.DataFrame(result.keywords, columns=["Theme", "Frequency"]),
            hide_index=True, use_container_width=True,
        )

    st.markdown(f"**Representative comments** *(PII removed — {sent.DISCLAIMER})*")
    for label in (sent.POSITIVE, sent.NEUTRAL, sent.NEGATIVE):
        quotes = result.quotes.get(label, [])
        if quotes:
            with st.expander(f"{label} ({result.distribution.get(label, 0)})"):
                for q in quotes:
                    st.markdown(f"> {q}")


def tab_trends(df: pd.DataFrame, types: dict[str, str]) -> None:
    if not trends.is_multi_event(df):
        st.info("Upload data from more than one event to see cross-event trends.")
        return

    st.subheader("Response volume per event")
    vol = trends.response_volume(df)
    st.plotly_chart(trends.volume_chart(df, _palette()), use_container_width=True)
    for t in insights.trend_takeaways(vol, "value", "Response volume"):
        st.markdown(f"- {t}")

    st.subheader("Metric over time")
    questions = _question_columns(df)
    q = st.selectbox("Question", questions, key="trend_q")
    qtype = types.get(q)
    if qtype == NUMERIC:
        agg = st.selectbox("Aggregation", [charts.MEAN, charts.SUM], key="trend_agg")
        trend = trends.metric_over_time(df, q, agg=agg)
        title = f"{agg} of {q[:40]} over events"
    else:
        opts = sorted(df[q].dropna().unique(), key=str)
        option = st.selectbox("Answer to track (optional)", ["(all responses)"] + list(opts), key="trend_opt")
        option = None if option == "(all responses)" else option
        trend = trends.metric_over_time(df, q, agg=charts.COUNT, option=option)
        title = f"Responses to '{q[:30]}'" + (f" = '{option}'" if option else "")
    st.plotly_chart(trends.metric_chart(trend, title, "Value", _palette()), use_container_width=True)
    for t in insights.trend_takeaways(trend, "value", title):
        st.markdown(f"- {t}")

    free_text = [c for c in questions if types.get(c) == FREE_TEXT]
    if free_text:
        st.subheader("Indicative sentiment trend")
        st.caption(sent.DISCLAIMER)
        sq = st.selectbox("Free-text question", free_text, key="trend_sent_q")
        strend = trends.sentiment_trend(df, sq)
        if not strend.empty:
            st.plotly_chart(trends.sentiment_trend_chart(strend, sq[:40]), use_container_width=True)
        else:
            st.info("Not enough free-text responses across events for a sentiment trend.")


def _branding_form() -> None:
    st.subheader("Client branding")
    existing = report_mod.list_profiles()
    if existing:
        cols = st.columns([3, 1])
        chosen = cols[0].selectbox("Load saved profile", ["(new)"] + existing, key="load_prof")
        if cols[1].button("Load") and chosen != "(new)":
            loaded = report_mod.load_profile(chosen)
            if loaded:
                st.session_state.profile = loaded
                st.rerun()

    p = st.session_state.profile
    c1, c2 = st.columns(2)
    p.client_name = c1.text_input("Client name", value=p.client_name)
    p.footer = c2.text_input("Footer text", value=p.footer)
    p.primary = c1.color_picker("Primary colour", value=p.primary)
    p.secondary = c2.color_picker("Secondary colour", value=p.secondary)

    logo = st.file_uploader("Client logo (PNG/JPG)", type=["png", "jpg", "jpeg"], key="logo_up")
    if logo is not None:
        report_mod.PROFILE_DIR.mkdir(parents=True, exist_ok=True)
        logo_path = report_mod.PROFILE_DIR / f"{report_mod.ClientProfile(client_name=p.client_name).slug()}_logo.png"
        logo_path.write_bytes(logo.getvalue())
        p.logo_path = str(logo_path)
        st.success("Logo saved.")
    if p.logo_path:
        st.caption(f"Logo: {p.logo_path}")

    if st.button("💾 Save profile"):
        path = report_mod.save_profile(p)
        st.success(f"Saved profile to {path.name}")


def tab_report(df: pd.DataFrame, types: dict[str, str]) -> None:
    _branding_form()
    st.divider()

    st.subheader("Build report")
    questions = _question_columns(df)
    # Only offer questions that actually have answers in the filtered data.
    answerable = [q for q in questions if df[q].notna().any()]
    selected = st.multiselect(
        "Questions to include", answerable, default=answerable[:8],
        help="Each becomes a section with its default chart, takeaways and "
        "(for free-text) sentiment.",
    )

    # Future questions (editable).
    st.markdown("**Future questions** *(rule-based, editable)*")
    ft_themes = {
        q: sent.analyse_question(q, df[q]).keywords
        for q in questions
        if types.get(q) == FREE_TEXT and sent.analyse_question(q, df[q])
    }
    default_future = "\n".join(insights.future_questions(df, types, ft_themes))
    if st.session_state.future_text is None:
        st.session_state.future_text = default_future
    st.session_state.future_text = st.text_area(
        "Future questions", value=st.session_state.future_text, height=160,
        label_visibility="collapsed",
    )

    col1, col2 = st.columns(2)

    # Cleaned CSV export is always available.
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    col2.download_button(
        "⬇ Download cleaned CSV", csv_bytes, file_name="cleaned_data.csv", mime="text/csv"
    )

    if col1.button("📝 Generate DOCX report", type="primary"):
        with st.spinner("Building branded report…"):
            data = _build_report_bytes(df, types, selected)
        st.download_button(
            "⬇ Download report (.docx)", data,
            file_name=f"{st.session_state.profile.slug()}_report.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        st.success("Report ready.")


def _build_report_bytes(df: pd.DataFrame, types: dict[str, str], selected: list[str]) -> bytes:
    palette = _palette()
    sections: list[report_mod.ChartSection] = []
    for q in selected:
        col_type = types.get(q, CATEGORICAL)
        chart_type = charts.default_chart_for(col_type)
        section = report_mod.ChartSection(title=q)
        try:
            fig = charts.build_chart(df, chart_type=chart_type, dimension=q, palette=palette, title=q)
            section.png = charts.fig_to_png_bytes(fig)
        except Exception:  # noqa: BLE001
            section.png = None
        default_tk = insights.chart_takeaways(df, dimension=q, col_type=col_type)
        edited = st.session_state.takeaways.get(q)
        section.takeaways = (edited.splitlines() if edited else default_tk)
        section.takeaways = [t for t in section.takeaways if t.strip()]

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
        for q in _question_columns(df)
        if types.get(q) == FREE_TEXT and sent.analyse_question(q, df[q])
    }
    future = [
        f for f in (st.session_state.future_text or "").splitlines() if f.strip()
    ] or insights.future_questions(df, types, ft_themes)

    n_events = df[EVENT_COL].nunique() if EVENT_COL in df.columns else 1
    spec = report_mod.ReportSpec(
        title="Survey Insights Report",
        subtitle=f"{n_events} event(s) · {len(df):,} responses · {date.today():%d %B %Y}",
        sections=sections,
        trend_sections=trend_sections,
        future_questions=future,
        data_quality=[line for _, rep in st.session_state.reports for line in rep.actions],
        event_summary=[
            f"{n_events} event(s) analysed",
            f"{len(df):,} survey submissions after cleaning & filtering",
            f"{len([c for c in _question_columns(df) if df[c].notna().any()])} questions with responses",
        ],
    )
    return report_mod.generate_docx(st.session_state.profile, spec)


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main() -> None:
    _init_state()
    st.sidebar.markdown(f"[← WinnerFlags × CUIGG hub]({HUB_URL})")
    st.title("📊 CUIGG Reporting Tool")
    st.caption(
        "Upload survey exports → clean, explore, analyse sentiment, spot trends, "
        "and export a branded report. Everything runs locally — no external APIs."
    )

    upload_section()

    if st.session_state.data is None:
        st.info("⬅ Upload one or more CSV exports in the sidebar to begin.")
        with st.expander("Expected format"):
            st.markdown(
                "CUIGG long-format export with columns **Date, Event, Bundle, "
                "Question, Answer** (one answer per row). The tool pivots this into "
                "one row per submission automatically. Ordinary wide CSVs also work."
            )
        return

    df = st.session_state.data
    types = st.session_state.types
    mask = build_filters(df, types)
    filtered = df[mask].reset_index(drop=True)

    if filtered.empty:
        st.warning("No rows match the current filters. Adjust or reset them.")
        return

    tabs = st.tabs(["🧹 Data & Cleaning", "📈 Charts", "💬 Sentiment", "📅 Trends", "📤 Report"])
    with tabs[0]:
        tab_data(filtered, types)
    with tabs[1]:
        tab_charts(filtered, types)
    with tabs[2]:
        tab_sentiment(filtered, types)
    with tabs[3]:
        tab_trends(filtered, types)
    with tabs[4]:
        tab_report(filtered, types)


if __name__ == "__main__":
    main()
