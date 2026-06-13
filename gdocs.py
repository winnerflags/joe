"""Upload a generated DOCX to Google Drive, converting it to a native Google Doc.

Authentication uses the **OAuth user login** (installed-app) flow: the first run
opens a browser for the user to sign in and consent; the resulting token is
cached to ``token_file`` for subsequent runs. The created document lands in the
signed-in user's own Drive.

Google client libraries are imported lazily so the rest of the reporting tool
(which is fully local/offline) never depends on them. Install the extras with::

    pip install -r requirements-gdocs.txt
"""

from __future__ import annotations

import io
import os
from typing import Optional

# We only need Drive: uploading a .docx with the Google Doc target mime type makes
# Drive convert it server-side into a native, editable Google Doc.
SCOPES = ["https://www.googleapis.com/auth/drive.file"]
GOOGLE_DOC_MIME = "application/vnd.google-apps.document"
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


class GoogleAuthError(RuntimeError):
    """Raised with a clear, user-facing message when Google setup is incomplete."""


def _require_libs():
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaIoBaseUpload
    except ImportError as exc:  # pragma: no cover - exercised only without extras
        raise GoogleAuthError(
            "Google client libraries are not installed. Run:\n"
            "    pip install -r requirements-gdocs.txt"
        ) from exc
    return Request, Credentials, InstalledAppFlow, build, MediaIoBaseUpload


def get_drive_service(
    credentials_file: str = "credentials.json",
    token_file: str = "token.json",
    *,
    open_browser: bool = True,
):
    """Return an authorised Drive API client via the OAuth installed-app flow.

    ``credentials_file`` is the OAuth client (Desktop app) JSON downloaded from the
    Google Cloud console. ``token_file`` caches the user's authorisation so later
    runs are non-interactive until it expires.
    """
    Request, Credentials, InstalledAppFlow, build, _ = _require_libs()

    creds = None
    if os.path.exists(token_file):
        creds = Credentials.from_authorized_user_file(token_file, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(credentials_file):
                raise GoogleAuthError(
                    f"OAuth client file '{credentials_file}' not found.\n"
                    "Create an OAuth 2.0 Client ID of type 'Desktop app' in the "
                    "Google Cloud console, enable the Google Drive API, download the "
                    "JSON, and pass it via --credentials."
                )
            flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
            # port=0 picks a free port; falls back to console flow on headless hosts.
            if open_browser:
                creds = flow.run_local_server(port=0)
            else:
                creds = flow.run_console()
        with open(token_file, "w") as fh:
            fh.write(creds.to_json())

    return build("drive", "v3", credentials=creds, cache_discovery=False)


def upload_docx_as_gdoc(
    service,
    docx_bytes: bytes,
    name: str,
    *,
    folder_id: Optional[str] = None,
) -> tuple[str, str]:
    """Upload DOCX bytes to Drive as a converted Google Doc; return (id, url)."""
    _, _, _, _, MediaIoBaseUpload = _require_libs()

    metadata = {"name": name, "mimeType": GOOGLE_DOC_MIME}
    if folder_id:
        metadata["parents"] = [folder_id]

    media = MediaIoBaseUpload(io.BytesIO(docx_bytes), mimetype=DOCX_MIME, resumable=False)
    created = (
        service.files()
        .create(body=metadata, media_body=media, fields="id, webViewLink", supportsAllDrives=True)
        .execute()
    )
    doc_id = created["id"]
    url = created.get("webViewLink") or f"https://docs.google.com/document/d/{doc_id}/edit"
    return doc_id, url
