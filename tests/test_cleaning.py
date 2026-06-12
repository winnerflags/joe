"""Tests for the cleaning / ingestion pipeline."""

from __future__ import annotations

import io
import os
import sys

import pandas as pd
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cleaning as C  # noqa: E402


def _read(text: str, name: str = "t.csv"):
    return C.read_csv(io.BytesIO(text.encode("utf-8")), name)


def test_read_detects_semicolon_delimiter():
    df, report = _read("a;b;c\n1;2;3\n4;5;6")
    assert list(df.columns) == ["a", "b", "c"]
    assert report.delimiter == "semicolon"
    assert len(df) == 2


def test_read_cp1252_encoding():
    raw = "name,note\nx,café".encode("cp1252")
    df, report = C.read_csv(io.BytesIO(raw), "w.csv")
    assert "café" in df["note"].tolist()
    assert report.encoding in ("cp1252", "latin-1")


def test_empty_file_raises_friendly_error():
    with pytest.raises(C.CSVReadError):
        C.read_csv(io.BytesIO(b"   "), "empty.csv")


def test_blank_cells_become_na():
    df, _ = _read("a,b\n1,\n2,x")
    assert df["b"].isna().sum() == 1


def test_clean_strips_whitespace_and_dedups():
    raw = pd.DataFrame({"name": ["  Alice ", "Alice", "Bob  "], "v": ["1", "1", "2"]})
    cleaned, report = C.clean_dataframe(raw)
    # "  Alice " and "Alice" collapse to a duplicate row and one is dropped.
    assert (cleaned["name"] == "Alice").sum() == 1
    assert any("duplicate" in a.lower() for a in report.actions)
    assert any("whitespace" in a.lower() for a in report.actions)


def test_clean_removes_empty_rows_and_columns():
    raw = pd.DataFrame({"keep": ["1", "2"], "empty": [pd.NA, pd.NA]})
    raw.loc[2] = [pd.NA, pd.NA]
    cleaned, report = C.clean_dataframe(raw)
    assert "empty" not in cleaned.columns
    assert len(cleaned) == 2
    assert any("empty column" in a.lower() for a in report.actions)


def test_clean_fixes_mojibake():
    raw = pd.DataFrame({"q": ["didn��t work", "fine"]})
    cleaned, report = C.clean_dataframe(raw)
    assert "didn't work" in cleaned["q"].tolist()
    assert any("corrupted" in a.lower() for a in report.actions)


def test_normalise_casing_merges_variants():
    # A second column keeps the rows distinct (so they aren't dropped as exact
    # duplicates) and gives a low uniqueness ratio, mirroring real survey data.
    raw = pd.DataFrame(
        {
            "ans": ["yes", "Yes", "YES", "no", "yes", "yes", "no", "yes", "no", "no"],
            "id": [str(i) for i in range(10)],
        }
    )
    cleaned, report = C.clean_dataframe(raw)
    assert set(cleaned["ans"].unique()) == {"yes", "no"}
    assert any("capitalisation" in a.lower() for a in report.actions)


def test_detect_long_survey_and_pivot():
    raw = pd.DataFrame(
        {
            "Date": ["2025-07-30T11:14:29.100Z", "2025-07-30T11:14:29.200Z", "2025-08-01T09:00:00.000Z"],
            "Event": ["E1", "E1", "E1"],
            "Bundle": ["b", "b", "b"],
            "Question": ["Q1", "Q2", "Q1"],
            "Answer": ["a1", "a2", "a3"],
        }
    )
    roles = C.detect_long_survey(raw)
    assert roles and roles["question"] == "Question"
    rep = C.CleaningReport()
    wide = C.pivot_long_to_wide(raw, roles, rep)
    # Two submissions (two distinct seconds), questions become columns.
    assert len(wide) == 2
    assert "Q1" in wide.columns and "Q2" in wide.columns
    assert C.EVENT_COL in wide.columns


def test_detect_column_types():
    df = pd.DataFrame(
        {
            "cat": ["a", "b", "a", "b", "a"],
            "num": ["1", "2", "3", "4", "5"],
            "dt": ["2025-01-01", "2025-02-01", "2025-03-01", "2025-04-01", "2025-05-01"],
            "txt": [
                "this is a long free text response about the event and the city",
                "another fairly long opinion that varies a lot between people here",
                "yet another distinct lengthy comment from a different respondent now",
                "more unique long form feedback that should be free text not category",
                "final long unique answer that is clearly free text in nature today",
            ],
        }
    )
    types = C.detect_column_types(df)
    assert types["cat"] == C.CATEGORICAL
    assert types["num"] == C.NUMERIC
    assert types["dt"] == C.DATE
    assert types["txt"] == C.FREE_TEXT


def test_prepare_end_to_end_tags_event():
    raw = "col\nhello\nworld\n"
    prepared = C.prepare(io.BytesIO(raw.encode()), "f.csv", fallback_event="My Event")
    assert C.EVENT_COL in prepared.df.columns
    assert (prepared.df[C.EVENT_COL] == "My Event").all()
    assert prepared.report.rows_in == 2
