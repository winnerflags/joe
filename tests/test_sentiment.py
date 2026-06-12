"""Tests for the indicative sentiment module."""

from __future__ import annotations

import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sentiment as S  # noqa: E402


def test_classify_positive_negative_neutral():
    assert S.classify("This was absolutely brilliant, I loved it!")[0] == S.POSITIVE
    assert S.classify("Terrible, awful, a complete waste of time")[0] == S.NEGATIVE
    assert S.classify("It happened on Thursday")[0] == S.NEUTRAL


def test_classify_is_deterministic():
    text = "Great event but the queues were too long"
    assert S.classify(text) == S.classify(text)


def test_scrub_pii_removes_email_and_phone():
    text = "Contact me at john.doe@example.com or 086 123 4567 please"
    cleaned = S.scrub_pii(text)
    assert "@" not in cleaned
    assert "[email removed]" in cleaned
    assert "[phone removed]" in cleaned
    assert "123 4567" not in cleaned


def test_top_keywords_removes_stopwords():
    texts = ["The music was great music", "more music and food", "food food music"]
    kw = dict(S.top_keywords(texts))
    assert "music" in kw
    assert "the" not in kw  # stopword
    assert kw["music"] >= 3


def test_classify_series_skips_blanks():
    s = pd.Series(["Wonderful experience", None, "  ", "Hated it"])
    rows = S.classify_series(s)
    assert len(rows) == 2


def test_analyse_question_structure_and_pii():
    s = pd.Series(
        [
            "Loved the festival, brilliant atmosphere! mail me at a@b.com",
            "Fantastic night, would come again",
            "Amazing vibes and great music",
            "It was on at the venue",
            "Awful, cold and disorganised",
            "Hated the queues, terrible",
        ]
    )
    result = S.analyse_question("How was it?", s)
    assert result is not None
    assert result.n_responses == 6
    assert sum(result.distribution.values()) == 6
    # Representative quotes must not leak the email address.
    for quotes in result.quotes.values():
        for q in quotes:
            assert "@b.com" not in q
    assert result.distribution[S.POSITIVE] >= 1
    assert result.distribution[S.NEGATIVE] >= 1


def test_analyse_question_empty_returns_none():
    assert S.analyse_question("q", pd.Series([None, "", "  "])) is None
