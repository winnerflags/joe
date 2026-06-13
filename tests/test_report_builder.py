"""Tests for the headless report builder and the Google Docs helper's guard rails.

These stay fully offline: we build the branded DOCX from the bundled sample and
assert the Google helper fails with a clear, typed error rather than a traceback
when it can't proceed. No network or Google credentials are required.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import gdocs
import report as report_mod
import report_builder

SAMPLE = os.path.join(os.path.dirname(__file__), "..", "sample_data", "sample_event.csv")


def test_load_csvs_combines_and_types():
    df, types, reports = report_builder.load_csvs([SAMPLE])
    assert len(df) > 0
    assert reports and reports[0][0] == "sample_event.csv"
    # Meta columns are excluded from the question list.
    qs = report_builder.question_columns(df)
    assert qs and all(c not in report_builder.META_COLS for c in qs)
    assert set(qs).issubset(set(types) | set(df.columns))


def test_build_report_docx_produces_valid_docx():
    df, types, reports = report_builder.load_csvs([SAMPLE])
    profile = report_mod.ClientProfile(client_name="Example Council")
    docx = report_builder.build_report_docx(df, types, reports, profile)
    # A .docx is a zip archive — check the magic bytes and a sane size.
    assert docx[:2] == b"PK"
    assert len(docx) > 10_000


def test_build_respects_selected_subset():
    df, types, reports = report_builder.load_csvs([SAMPLE])
    one = report_builder.question_columns(df)[:1]
    docx = report_builder.build_report_docx(
        df, types, reports, report_mod.ClientProfile(), selected=one
    )
    assert docx[:2] == b"PK"


def test_gdocs_constants():
    assert gdocs.GOOGLE_DOC_MIME == "application/vnd.google-apps.document"
    assert "drive.file" in gdocs.SCOPES[0]


def test_get_drive_service_raises_clean_error_without_setup(tmp_path):
    # No libs and/or no credentials file -> a typed, user-facing error (never a
    # raw ImportError/FileNotFound traceback).
    with pytest.raises(gdocs.GoogleAuthError):
        gdocs.get_drive_service(
            credentials_file=str(tmp_path / "missing.json"),
            token_file=str(tmp_path / "token.json"),
        )
