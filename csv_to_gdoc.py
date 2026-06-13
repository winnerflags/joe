#!/usr/bin/env python3
"""CSV → Google Docs report maker.

Reads one or more council survey CSV exports, builds the branded report (the
same one the Streamlit Report Maker produces), then uploads it to Google Drive
as a native, editable Google Doc.

Examples
--------
Build and upload to Google Docs (opens a browser to sign in the first time)::

    python csv_to_gdoc.py sample_data/sample_event.csv \\
        --client-name "Example Council" --credentials credentials.json

Just build the DOCX locally, no Google upload::

    python csv_to_gdoc.py event1.csv event2.csv --client-name "City Council" \\
        --docx-out report.docx --no-upload

Setup for the Google step (one-off):
    1. In the Google Cloud console, enable the **Google Drive API**.
    2. Create an OAuth 2.0 Client ID of type **Desktop app**; download the JSON.
    3. Pass that file via --credentials (default: credentials.json).
    4. Install the extras: pip install -r requirements-gdocs.txt
"""

from __future__ import annotations

import argparse
import sys

import report as report_mod
import report_builder
from cleaning import CSVReadError


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Turn council survey CSV export(s) into a branded Google Doc report.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("csv", nargs="+", help="One or more CSV export files (each an event).")

    branding = p.add_argument_group("branding")
    branding.add_argument("--client-name", default="Client", help="Client/council name on the cover.")
    branding.add_argument("--primary", default=report_mod.DEFAULT_PRIMARY, help="Primary brand hex colour.")
    branding.add_argument("--secondary", default=report_mod.DEFAULT_SECONDARY, help="Secondary brand hex colour.")
    branding.add_argument("--logo", help="Path to a logo image for the cover.")
    branding.add_argument("--footer", default="", help="Custom footer text.")
    branding.add_argument("--title", default="Survey Insights Report", help="Report title.")
    branding.add_argument("--profile", help="Load saved branding profile by slug (overrides the flags above).")

    out = p.add_argument_group("output")
    out.add_argument("--docx-out", help="Also save the DOCX to this path.")
    out.add_argument("--doc-name", help="Name for the Google Doc (defaults to the report title + client).")
    out.add_argument("--no-upload", action="store_true", help="Build the DOCX only; skip the Google Docs upload.")

    google = p.add_argument_group("google")
    google.add_argument("--credentials", default="credentials.json", help="OAuth client (Desktop app) JSON.")
    google.add_argument("--token", default="token.json", help="Where to cache the OAuth token.")
    google.add_argument("--folder-id", help="Optional Drive folder ID to create the Doc in.")
    google.add_argument("--no-browser", action="store_true", help="Use console OAuth flow (headless hosts).")
    return p.parse_args(argv)


def _resolve_profile(args: argparse.Namespace) -> report_mod.ClientProfile:
    if args.profile:
        loaded = report_mod.load_profile(args.profile)
        if loaded is None:
            print(f"Branding profile '{args.profile}' not found.", file=sys.stderr)
            sys.exit(2)
        return loaded
    return report_mod.ClientProfile(
        client_name=args.client_name,
        primary=args.primary,
        secondary=args.secondary,
        footer=args.footer,
        logo_path=args.logo,
    )


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    profile = _resolve_profile(args)

    # ---- Build the report (fully local) ----
    try:
        df, types, reports = report_builder.load_csvs(args.csv)
    except (CSVReadError, ValueError, FileNotFoundError) as exc:
        print(f"Could not read CSV input: {exc}", file=sys.stderr)
        return 1

    docx_bytes = report_builder.build_report_docx(df, types, reports, profile, title=args.title)
    print(f"Built report: {len(df):,} responses, {len(report_builder.question_columns(df))} questions.")

    if args.docx_out:
        with open(args.docx_out, "wb") as fh:
            fh.write(docx_bytes)
        print(f"Saved DOCX → {args.docx_out}")

    if args.no_upload:
        return 0

    # ---- Upload to Google Docs (network + OAuth) ----
    import gdocs  # lazy: keeps Google deps optional

    doc_name = args.doc_name or f"{args.title} — {profile.client_name}"
    try:
        service = gdocs.get_drive_service(
            credentials_file=args.credentials,
            token_file=args.token,
            open_browser=not args.no_browser,
        )
        doc_id, url = gdocs.upload_docx_as_gdoc(service, docx_bytes, doc_name, folder_id=args.folder_id)
    except gdocs.GoogleAuthError as exc:
        print(f"\nGoogle setup needed:\n{exc}", file=sys.stderr)
        return 2
    except Exception as exc:  # noqa: BLE001 - surface a clean message, not a traceback
        print(f"Google Docs upload failed: {exc}", file=sys.stderr)
        return 1

    print(f"Created Google Doc: {url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
