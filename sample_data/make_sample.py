"""Generate a small synthetic sample in CUIGG long-export format.

Mirrors the real export's structure (Date, Event, Bundle, Question, Answer) with
two events and a mix of categorical and free-text questions — including a couple
of deliberately messy values (trailing whitespace, mixed casing, a stray email)
so the cleaning and PII-scrubbing steps have something to do. No real data.
"""

from __future__ import annotations

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)

EVENTS = [
    ("Spring Night Market", datetime(2025, 4, 30, 18, 0)),
    ("Summer Late Fest", datetime(2025, 7, 31, 18, 0)),
]

CATEGORICAL = {
    "What is your gender?": ["Female", "Male", "Prefer not to say"],
    "How did you travel into the city this evening?": ["Walked", "Bus", "Car", "Cycled"],
    "Are you from the area or visiting?": ["From the area", "Visiting", "from the area"],
}
FREE_TEXT = {
    "What did you enjoy most this evening?": [
        "Brilliant atmosphere, loved the live music!",
        "Great food stalls and friendly crowd",
        "The lights were amazing, fantastic night out",
        "Loved it, will definitely come again",
        "Wonderful family event, kids had a blast",
    ],
    "What could we improve?": [
        "Too crowded near the main stage",
        "Queues for food were far too long",
        "Not enough seating, my feet were sore",
        "Could be better organised, signage was poor",
        "Parking was a nightmare and expensive",
    ],
}
EMAIL_Q = "What's your email to enter the draw?"


def rows():
    out = []
    for ei, (event, start) in enumerate(EVENTS):
        ts = start
        for sub in range(60):
            ts += timedelta(minutes=random.randint(2, 40))
            bundle = f"{200 + ei}:0{1 + sub % 2}:00"
            base = ts
            for q, opts in CATEGORICAL.items():
                base += timedelta(microseconds=2)
                out.append((base.isoformat() + "Z", event, bundle, q, random.choice(opts)))
            for q, opts in FREE_TEXT.items():
                base += timedelta(microseconds=2)
                val = random.choice(opts)
                if random.random() < 0.15:  # some messy whitespace
                    val = "  " + val + "  "
                out.append((base.isoformat() + "Z", event, bundle, q, val))
            if random.random() < 0.3:  # a stray email to exercise PII scrubbing
                base += timedelta(microseconds=2)
                out.append(
                    (base.isoformat() + "Z", event, bundle, EMAIL_Q, "winner@example.com")
                )
    return out


def main():
    path = Path(__file__).with_name("sample_event.csv")
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["Date", "Event", "Bundle", "Question", "Answer"])
        writer.writerows(rows())
    print(f"Wrote {path}")


if __name__ == "__main__":
    main()
