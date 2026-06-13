"""CSV ingestion, cleaning and type detection for the CUIGG reporting tool.

Everything here is deterministic and local — no network, no LLM calls. The
guiding rule is *never silently drop data*: every transformation is recorded in
a :class:`CleaningReport` so it can be shown to the client and written into the
DOCX data-quality appendix.

CUIGG exports survey data in a *long / tidy* shape::

    Date, Event, Bundle, Question, Answer

where each row is a single answer. For per-question reporting we pivot that into
a *wide* table (one row per survey submission, one column per question). The
module also works on already-wide CSVs, so it degrades gracefully.
"""

from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field
from typing import Optional, Union

import pandas as pd

# Column kinds used throughout the app.
CATEGORICAL = "categorical"
NUMERIC = "numeric"
DATE = "date"
FREE_TEXT = "free_text"

# Internal, namespaced column names added during pivoting so they never collide
# with a real survey question.
EVENT_COL = "__event__"
DATE_COL = "__date__"
SOURCE_COL = "__source_file__"

# The Unicode replacement character. The sample export already contains baked-in
# runs of these where apostrophes were lost upstream, e.g. "didn��t".
_REPLACEMENT = "�"

_ENCODINGS = ("utf-8-sig", "utf-8", "cp1252", "latin-1")


def _text_cols(df: pd.DataFrame) -> list[str]:
    """Columns holding text, robust to object vs the newer pandas 'str' dtype."""
    return [
        c
        for c in df.columns
        if pd.api.types.is_object_dtype(df[c]) or pd.api.types.is_string_dtype(df[c])
    ]


class CSVReadError(Exception):
    """Raised when a file cannot be parsed as CSV. The message is user-facing."""


@dataclass
class CleaningReport:
    """A human-readable log of every action taken while cleaning."""

    actions: list[str] = field(default_factory=list)
    encoding: Optional[str] = None
    delimiter: Optional[str] = None
    rows_in: int = 0
    rows_out: int = 0
    was_pivoted: bool = False
    submissions: Optional[int] = None

    def add(self, message: str) -> None:
        self.actions.append(message)

    def as_markdown(self) -> str:
        lines = [f"- {a}" for a in self.actions] or ["- No changes were needed."]
        return "\n".join(lines)


# --------------------------------------------------------------------------- #
# Reading
# --------------------------------------------------------------------------- #
def _sniff_delimiter(sample: str) -> str:
    """Pick a delimiter from a text sample, preferring csv.Sniffer."""
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        return dialect.delimiter
    except csv.Error:
        # Fall back to "whichever common delimiter is most frequent" on line 1.
        first_line = sample.splitlines()[0] if sample.splitlines() else ""
        counts = {d: first_line.count(d) for d in (",", ";", "\t", "|")}
        best = max(counts, key=counts.get)
        return best if counts[best] > 0 else ","


def _decode(raw: bytes, report: CleaningReport) -> str:
    """Decode bytes trying a sequence of encodings; record which one worked."""
    for enc in _ENCODINGS:
        try:
            text = raw.decode(enc)
            report.encoding = enc
            if enc not in ("utf-8", "utf-8-sig"):
                report.add(f"Decoded file as **{enc}** (not valid UTF-8).")
            return text
        except UnicodeDecodeError:
            continue
    # Last resort: lossy decode rather than crash.
    report.encoding = "utf-8 (lossy)"
    report.add("File was not valid in any known encoding; decoded with replacement characters.")
    return raw.decode("utf-8", errors="replace")


def read_csv(
    source: Union[str, bytes, io.BytesIO], filename: str = "uploaded.csv"
) -> tuple[pd.DataFrame, CleaningReport]:
    """Read a CSV robustly, handling encoding and delimiter detection.

    Raises :class:`CSVReadError` with a friendly message on malformed input —
    never a raw stack trace.
    """
    report = CleaningReport()
    try:
        if isinstance(source, str):
            with open(source, "rb") as fh:
                raw = fh.read()
        elif isinstance(source, bytes):
            raw = source
        else:  # file-like (e.g. Streamlit UploadedFile)
            raw = source.read()
    except OSError as exc:
        raise CSVReadError(f"Could not open '{filename}': {exc}") from exc

    if not raw.strip():
        raise CSVReadError(f"'{filename}' is empty.")

    text = _decode(raw, report)
    delimiter = _sniff_delimiter(text[:8192])
    report.delimiter = {",": "comma", ";": "semicolon", "\t": "tab", "|": "pipe"}.get(
        delimiter, repr(delimiter)
    )

    try:
        df = pd.read_csv(io.StringIO(text), sep=delimiter, dtype=str, keep_default_na=False)
    except (pd.errors.ParserError, pd.errors.EmptyDataError) as exc:
        raise CSVReadError(
            f"'{filename}' could not be parsed as CSV ({delimiter!r} delimiter). "
            f"Please check it is a valid CSV file. Details: {exc}"
        ) from exc

    if df.shape[1] == 0:
        raise CSVReadError(f"'{filename}' has no columns.")

    # Normalise to plain object dtype so the `== object` checks below are reliable
    # across pandas versions (dtype=str can yield the newer "str" StringDtype).
    df = df.astype(object)
    # Treat blank strings as missing from here on.
    df = df.replace(r"^\s*$", pd.NA, regex=True)
    report.rows_in = len(df)
    report.add(
        f"Read **{len(df):,} rows** × {df.shape[1]} columns "
        f"({report.encoding}, {report.delimiter}-separated)."
    )
    return df, report


# --------------------------------------------------------------------------- #
# Cleaning
# --------------------------------------------------------------------------- #
def _strip_whitespace(df: pd.DataFrame, report: CleaningReport) -> pd.DataFrame:
    new_cols = {c: re.sub(r"\s+", " ", str(c)).strip() for c in df.columns}
    if any(k != v for k, v in new_cols.items()):
        report.add("Trimmed whitespace from column headers.")
    df = df.rename(columns=new_cols)

    obj_cols = _text_cols(df)
    stripped = 0
    for col in obj_cols:
        before = df[col]
        after = before.map(lambda v: re.sub(r"\s+", " ", v).strip() if isinstance(v, str) else v)
        stripped += int((before.fillna("") != after.fillna("")).sum())
        df[col] = after
    if stripped:
        report.add(f"Trimmed leading/trailing/repeated whitespace in {stripped:,} cells.")
    return df


def _fix_mojibake(df: pd.DataFrame, report: CleaningReport) -> pd.DataFrame:
    pattern = re.compile(_REPLACEMENT + "+")
    total = 0
    for col in _text_cols(df):
        mask = df[col].fillna("").str.contains(_REPLACEMENT)
        n = int(mask.sum())
        if n:
            total += n
            df[col] = df[col].map(
                lambda v: pattern.sub("'", v) if isinstance(v, str) else v
            )
    # Headers too.
    df = df.rename(columns=lambda c: pattern.sub("'", str(c)))
    if total:
        report.add(
            f"Replaced corrupted characters (lost in the original export) in "
            f"{total:,} cells with an apostrophe."
        )
    return df


def _drop_empty(df: pd.DataFrame, report: CleaningReport) -> pd.DataFrame:
    empty_cols = [c for c in df.columns if df[c].isna().all()]
    if empty_cols:
        df = df.drop(columns=empty_cols)
        report.add(f"Removed {len(empty_cols)} fully empty column(s): {', '.join(empty_cols)}.")
    before = len(df)
    df = df.dropna(how="all")
    if before - len(df):
        report.add(f"Removed {before - len(df):,} fully empty row(s).")
    return df


def _drop_duplicates(df: pd.DataFrame, report: CleaningReport) -> pd.DataFrame:
    before = len(df)
    df = df.drop_duplicates()
    removed = before - len(df)
    if removed:
        report.add(f"Removed {removed:,} exact duplicate row(s).")
    return df


def _normalise_casing(df: pd.DataFrame, report: CleaningReport) -> pd.DataFrame:
    """Merge values that differ only by case/whitespace onto their most common form.

    e.g. {"yes": 10, "Yes": 3, "YES": 1} all become "yes". This is conservative:
    only values that are case-insensitively identical are merged, so meaning is
    preserved.
    """
    fixed_cols = 0
    for col in _text_cols(df):
        non_null = df[col].dropna()
        if non_null.empty:
            continue
        nunique = non_null.nunique()
        # Only treat as categorical-ish; skip free text / id-like columns.
        if nunique > 60 or nunique / len(non_null) > 0.5:
            continue
        canonical: dict[str, str] = {}
        counts = non_null.value_counts()
        for value in counts.index:
            key = value.lower().strip()
            if key not in canonical:
                canonical[key] = value  # first = most frequent (value_counts is sorted)
        mapping = {v: canonical[v.lower().strip()] for v in counts.index}
        if any(k != v for k, v in mapping.items()):
            df[col] = df[col].map(lambda v: mapping.get(v, v) if isinstance(v, str) else v)
            fixed_cols += 1
    if fixed_cols:
        report.add(
            f"Standardised inconsistent capitalisation in {fixed_cols} column(s) "
            f"(merged onto the most common spelling)."
        )
    return df


def clean_dataframe(df: pd.DataFrame) -> tuple[pd.DataFrame, CleaningReport]:
    """Apply the full deterministic cleaning pipeline to a raw dataframe."""
    report = CleaningReport()
    report.rows_in = len(df)
    df = df.copy()
    df = _strip_whitespace(df, report)
    df = _fix_mojibake(df, report)
    df = _drop_empty(df, report)
    df = _drop_duplicates(df, report)
    df = _normalise_casing(df, report)
    df = df.reset_index(drop=True)
    report.rows_out = len(df)
    return df, report


# --------------------------------------------------------------------------- #
# Long → wide pivot (CUIGG survey shape)
# --------------------------------------------------------------------------- #
def _find_col(df: pd.DataFrame, *names: str) -> Optional[str]:
    lower = {c.lower(): c for c in df.columns}
    for name in names:
        if name.lower() in lower:
            return lower[name.lower()]
    return None


def detect_long_survey(df: pd.DataFrame) -> Optional[dict[str, Optional[str]]]:
    """Return column roles if ``df`` looks like CUIGG long survey data, else None."""
    question = _find_col(df, "Question", "question_text", "prompt")
    answer = _find_col(df, "Answer", "response", "value")
    if question and answer:
        return {
            "question": question,
            "answer": answer,
            "event": _find_col(df, "Event", "event_name"),
            "date": _find_col(df, "Date", "timestamp", "submitted_at", "created_at"),
            "bundle": _find_col(df, "Bundle", "session", "survey_id"),
        }
    return None


def pivot_long_to_wide(
    df: pd.DataFrame, roles: dict[str, Optional[str]], report: CleaningReport
) -> pd.DataFrame:
    """Pivot long survey rows into one row per submission, one column per question.

    Submissions are grouped by (event, bundle, timestamp-to-the-second) because
    a single submission emits its answers with microsecond-apart timestamps.
    """
    q, a = roles["question"], roles["answer"]
    event, date, bundle = roles["event"], roles["date"], roles["bundle"]
    work = df.copy()

    if date:
        ts = pd.to_datetime(work[date], errors="coerce", utc=True, format="mixed")
        sec = ts.dt.floor("s").astype("string")
    else:
        ts = pd.Series(pd.NaT, index=work.index)
        sec = pd.Series("", index=work.index)

    key_parts = [
        work[event].fillna("") if event else pd.Series("", index=work.index),
        work[bundle].fillna("") if bundle else pd.Series("", index=work.index),
        sec.fillna(""),
    ]
    submission_id = pd.Series(list(zip(*key_parts)), index=work.index)
    work["__sid__"] = pd.factorize(submission_id)[0]
    work["__ts__"] = ts

    # One answer per (submission, question): keep the first if a question repeats.
    wide = work.pivot_table(
        index="__sid__", columns=q, values=a, aggfunc="first"
    )
    wide.columns.name = None

    meta = work.groupby("__sid__").agg(
        **{
            EVENT_COL: (event, "first") if event else ("__sid__", lambda s: "Event"),
            DATE_COL: ("__ts__", "min"),
        }
    )
    out = meta.join(wide).reset_index(drop=True)

    report.was_pivoted = True
    report.submissions = len(out)
    report.add(
        f"Detected CUIGG long survey format and pivoted {len(df):,} answer rows into "
        f"**{len(out):,} survey submissions** × {wide.shape[1]} questions "
        f"(grouped by event + bundle + timestamp)."
    )
    return out


# --------------------------------------------------------------------------- #
# Column type detection
# --------------------------------------------------------------------------- #
def _looks_numeric(s: pd.Series) -> bool:
    non_null = s.dropna()
    if non_null.empty:
        return False
    coerced = pd.to_numeric(non_null, errors="coerce")
    return coerced.notna().mean() >= 0.9


def _looks_date(s: pd.Series) -> bool:
    non_null = s.dropna()
    if non_null.empty:
        return False
    # Avoid treating plain integers/years as dates.
    if _looks_numeric(non_null):
        return False
    parsed = pd.to_datetime(non_null, errors="coerce", dayfirst=True, utc=True, format="mixed")
    return parsed.notna().mean() >= 0.8


def detect_column_types(df: pd.DataFrame) -> dict[str, str]:
    """Classify each column as categorical / numeric / date / free_text."""
    types: dict[str, str] = {}
    for col in df.columns:
        if col == DATE_COL:
            types[col] = DATE
            continue
        if col in (EVENT_COL, SOURCE_COL):
            types[col] = CATEGORICAL
            continue
        s = df[col]
        non_null = s.dropna().astype(str)
        if non_null.empty:
            types[col] = CATEGORICAL
            continue
        if _looks_numeric(s):
            types[col] = NUMERIC
        elif _looks_date(s):
            types[col] = DATE
        else:
            nunique = non_null.nunique()
            avg_len = non_null.str.len().mean()
            uniq_ratio = nunique / len(non_null)
            if avg_len >= 25 or (uniq_ratio > 0.6 and nunique > 20):
                types[col] = FREE_TEXT
            else:
                types[col] = CATEGORICAL
    return types


def normalise_dates(df: pd.DataFrame, types: dict[str, str], report: CleaningReport) -> pd.DataFrame:
    """Normalise detected date columns to ISO-8601 (day-first parsing)."""
    df = df.copy()
    changed = []
    for col, kind in types.items():
        if kind != DATE:
            continue
        parsed = pd.to_datetime(df[col], errors="coerce", dayfirst=True, utc=True, format="mixed")
        if parsed.notna().any():
            df[col] = parsed
            changed.append(col)
    if changed:
        report.add(
            f"Normalised date column(s) to ISO-8601 (day-first): {', '.join(changed)}."
        )
    return df


# --------------------------------------------------------------------------- #
# Top-level convenience
# --------------------------------------------------------------------------- #
@dataclass
class PreparedData:
    """The fully-cleaned, analysis-ready table plus its metadata."""

    df: pd.DataFrame
    types: dict[str, str]
    report: CleaningReport


def prepare(
    source: Union[str, bytes, io.BytesIO],
    filename: str = "uploaded.csv",
    *,
    fallback_event: Optional[str] = None,
    fallback_date: Optional[str] = None,
) -> PreparedData:
    """Full pipeline for a single file: read → clean → (pivot) → type → dates."""
    raw, read_report = read_csv(source, filename)
    df, clean_report = clean_dataframe(raw)

    report = CleaningReport(encoding=read_report.encoding, delimiter=read_report.delimiter)
    report.actions = read_report.actions + clean_report.actions
    report.rows_in = read_report.rows_in
    report.rows_out = len(df)

    roles = detect_long_survey(df)
    if roles:
        df = pivot_long_to_wide(df, roles, report)
        report.was_pivoted = True
        report.submissions = len(df)

    # Ensure an event column exists for downstream multi-event logic.
    if EVENT_COL not in df.columns:
        df.insert(0, EVENT_COL, fallback_event or "Event")
        report.add(f"Tagged all rows with event '{fallback_event or 'Event'}'.")
    elif df[EVENT_COL].isna().any() and fallback_event:
        df[EVENT_COL] = df[EVENT_COL].fillna(fallback_event)

    if DATE_COL not in df.columns and fallback_date:
        df.insert(1, DATE_COL, pd.to_datetime(fallback_date, errors="coerce", utc=True))

    df[SOURCE_COL] = filename

    types = detect_column_types(df)
    df = normalise_dates(df, types, report)
    types = detect_column_types(df)  # refresh after date coercion
    return PreparedData(df=df, types=types, report=report)
