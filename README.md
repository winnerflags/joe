# CUIGG Reporting Tool

A local, deterministic reporting tool for council survey exports from the CUIGG
platform. Upload one or more CSV exports and get cleaned data, interactive
filters and charts, plain-language takeaways, indicative sentiment on free-text
answers, cross-event trends, and a **branded DOCX report** — replacing the
manual screenshot-into-Word workflow.

Everything runs **locally**. No external APIs, no LLM calls. Given the same
input the output is identical.

## Quick start

```bash
pip install -r requirements.txt
streamlit run app.py
```

Then open the URL Streamlit prints (default http://localhost:8501) and upload a
CSV in the sidebar. A sample is provided at `sample_data/sample_event.csv`.

> This repository is a **standalone deployment** of the Report Maker — the tool
> is fully independent and needs no other service to run. It can optionally link
> back to the "WinnerFlags × CUIGG" app-store hub: set `HUB_URL` (default
> `http://localhost:3000`) to control where the "← WinnerFlags × CUIGG hub" link
> in the sidebar points.

## Deployment

The tool ships with a `Dockerfile` for container deployment. The image pins
`kaleido==0.2.1`, which bundles its own Chromium, so offline PNG/DOCX export
works without a system Chrome install.

```bash
docker build -t cuigg-reporting .
docker run -p 8501:8501 cuigg-reporting
```

Then open http://localhost:8501. Server settings (headless mode, port, upload
limits) live in `.streamlit/config.toml`.

## Configuration

Copy `.env.example` to `.env` and fill in. The Report Maker links **two ways**
with the WinnerFlags × CUIGG app hub:

| Variable | Set on | Purpose | Default |
|----------|--------|---------|---------|
| `HUB_URL` | this app | Where the sidebar "← WinnerFlags × CUIGG hub" link points. | `http://localhost:3000` |
| `NEXT_PUBLIC_REPORT_MAKER_URL` | the hub (Next.js app) | The app URL the hub's "Report Maker" card opens. **Point this at this app's deployed Streamlit URL.** | `http://localhost:8501` |

So to wire the hub to this deployed tool, set `NEXT_PUBLIC_REPORT_MAKER_URL`
on the hub to this app's URL (e.g. `https://reporting.councils.example`), and
set `HUB_URL` here back to the hub. With Docker, pass it through:
`docker run -p 8501:8501 -e HUB_URL=https://your-hub.example cuigg-reporting`.

## What it does

1. **Upload & cleaning** — one or many CSVs. Handles UTF-8 / Windows-1252,
   comma/semicolon/tab delimiters. Auto-cleans duplicates, empty rows/columns,
   whitespace, inconsistent casing, corrupted characters, and normalises dates
   to ISO-8601 (day-first). **Every action is listed; nothing is dropped
   silently.** CUIGG's long `Date, Event, Bundle, Question, Answer` exports are
   automatically pivoted into one row per submission.
2. **Filtering** — auto-generated sidebar filters by column type (multiselect,
   range slider, date range, event selector), live row count, and a reset
   button.
3. **Charts** — bar, line, pie, stacked bar, histogram with a count/sum/mean
   measure and a sensible default per column type. Every chart is downloadable
   as PNG.
4. **Indicative sentiment** — VADER classification (positive/neutral/negative)
   per free-text question, with a distribution chart, representative verbatim
   quotes (emails/phone numbers stripped), and top keyword themes. Labelled
   everywhere as *“Indicative sentiment (automated)”*.
5. **Trends** (multi-event) — events are aligned on **exact** column names.
   Response volume per event, any metric over time, and sentiment trends.
6. **Takeaways & future questions** — 2–4 deterministic, rule-based insights per
   chart, plus a survey-design section flagging high skip rates, dominated
   categoricals, and recurring free-text themes lacking a structured question.
   Both are editable before export.
7. **Branded DOCX export** — upload a logo, set brand hex colours, client name
   and footer (saved as reusable JSON profiles). Brand colours drive the chart
   palettes. The report has a branded cover, per-question sections, a trends
   section, future questions, and a data-quality appendix. Cleaned CSV export is
   also provided.

## Project structure

| File | Responsibility |
|------|----------------|
| `app.py` | Streamlit UI and orchestration |
| `cleaning.py` | Robust CSV reading, cleaning, long→wide pivot, type detection |
| `charts.py` | Plotly charts, brand palettes, PNG export |
| `sentiment.py` | VADER sentiment, PII scrubbing, keyword themes |
| `trends.py` | Cross-event alignment and trend charts |
| `insights.py` | Rule-based takeaways and future-question suggestions |
| `report.py` | Branded DOCX generation and client-profile persistence |
| `tests/` | Tests for cleaning and sentiment |

## Testing

```bash
cd reporting
pip install pytest
pytest tests/ -q
```

## Notes

- `kaleido==0.2.1` is pinned because it bundles its own Chromium, so static PNG
  export (for downloads and the DOCX) works fully offline. Newer Kaleido
  versions require a system Chrome install.
- `vaderSentiment` ships its lexicon in the package, so sentiment needs no
  downloads or network access.
- Client profiles and uploaded logos are stored under `reporting/profiles/`
  (git-ignored).
- Malformed CSVs produce a clear, user-facing error message — never a stack
  trace.
