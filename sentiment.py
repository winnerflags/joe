"""Indicative sentiment analysis for free-text answers using VADER.

Everything is local and deterministic (VADER is a fixed lexicon, no model
downloads, no network). Results are always labelled as *indicative* because
automated sentiment on short survey answers is approximate.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Optional

import pandas as pd
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

POSITIVE = "Positive"
NEUTRAL = "Neutral"
NEGATIVE = "Negative"

# Label everywhere per the brief.
DISCLAIMER = "Indicative sentiment (automated)"

# Standard VADER thresholds on the compound score.
_POS_THRESHOLD = 0.05
_NEG_THRESHOLD = -0.05

_ANALYZER = SentimentIntensityAnalyzer()

# PII patterns to strip from any verbatim quote we surface or export.
_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_PHONE_RE = re.compile(r"(?:(?:\+|00)\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?){2,5}\d{2,4}")

# Lightweight English stopword list for keyword extraction (no nltk download).
_STOPWORDS = set(
    """a an the and or but if then else of to in on at for with without from by as is are was were
    be been being it its this that these those i you he she we they them us our your my me your yours
    do does did doing have has had having will would should could can may might must not no yes so just
    very more most some any all none can't cant dont don't im i'm there here what when where who why how
    about into over under again than too also up down out off only own same s t re ve ll d m o
    would like get got go going one really thing things lot bit etc city night limerick event events""".split()
)

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z'\-]+")


@dataclass
class QuestionSentiment:
    """Sentiment results for a single free-text question."""

    question: str
    n_responses: int
    distribution: dict[str, int]
    quotes: dict[str, list[str]]  # label -> representative verbatims (PII scrubbed)
    keywords: list[tuple[str, int]] = field(default_factory=list)

    def share(self, label: str) -> float:
        total = sum(self.distribution.values())
        return (self.distribution.get(label, 0) / total) if total else 0.0


def scrub_pii(text: str) -> str:
    """Remove email addresses and phone numbers from a verbatim quote."""
    text = _EMAIL_RE.sub("[email removed]", text)
    text = _PHONE_RE.sub("[phone removed]", text)
    return re.sub(r"\s+", " ", text).strip()


def classify(text: str) -> tuple[str, float]:
    """Return (label, compound_score) for a single piece of text."""
    score = _ANALYZER.polarity_scores(text or "")["compound"]
    if score >= _POS_THRESHOLD:
        return POSITIVE, score
    if score <= _NEG_THRESHOLD:
        return NEGATIVE, score
    return NEUTRAL, score


def classify_series(series: pd.Series) -> pd.DataFrame:
    """Classify each non-empty response; return tidy frame [text, label, score]."""
    texts = series.dropna().astype(str)
    texts = texts[texts.str.strip().str.len() > 0]
    rows = []
    for text in texts:
        label, score = classify(text)
        rows.append({"text": text, "label": label, "score": score})
    return pd.DataFrame(rows, columns=["text", "label", "score"])


def top_keywords(texts: list[str], n: int = 8) -> list[tuple[str, int]]:
    """Top keyword themes by frequency, with stopwords and PII removed."""
    counter: Counter[str] = Counter()
    for text in texts:
        cleaned = scrub_pii(text).lower()
        for word in _WORD_RE.findall(cleaned):
            word = word.strip("'-")
            if len(word) < 3 or word in _STOPWORDS:
                continue
            counter[word] += 1
    return counter.most_common(n)


def _representative_quotes(
    rows: pd.DataFrame, label: str, k: int = 5, min_len: int = 8
) -> list[str]:
    """Pick up to k representative verbatims for a label.

    Representative = strongest sentiment magnitude (most clearly that label),
    de-duplicated, of reasonable length, PII scrubbed.
    """
    subset = rows[rows["label"] == label].copy()
    if subset.empty:
        return []
    subset["scrubbed"] = subset["text"].map(scrub_pii)
    subset = subset[subset["scrubbed"].str.len() >= min_len]
    # Most clearly positive = highest score; most negative = lowest score.
    subset = subset.sort_values("score", ascending=(label == NEGATIVE))
    quotes: list[str] = []
    seen: set[str] = set()
    for q in subset["scrubbed"]:
        key = q.lower()
        if key in seen:
            continue
        seen.add(key)
        quotes.append(q)
        if len(quotes) >= k:
            break
    return quotes


def analyse_question(question: str, series: pd.Series) -> Optional[QuestionSentiment]:
    """Full sentiment analysis for one free-text question column."""
    rows = classify_series(series)
    if rows.empty:
        return None
    distribution = {
        POSITIVE: int((rows["label"] == POSITIVE).sum()),
        NEUTRAL: int((rows["label"] == NEUTRAL).sum()),
        NEGATIVE: int((rows["label"] == NEGATIVE).sum()),
    }
    quotes = {
        label: _representative_quotes(rows, label) for label in (POSITIVE, NEUTRAL, NEGATIVE)
    }
    keywords = top_keywords(rows["text"].tolist())
    return QuestionSentiment(
        question=question,
        n_responses=len(rows),
        distribution=distribution,
        quotes=quotes,
        keywords=keywords,
    )
