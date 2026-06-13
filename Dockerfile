# CUIGG Reporting Tool — standalone Streamlit deployment.
#
# Everything runs locally and deterministically: no external APIs, no LLM calls.
# kaleido==0.2.1 bundles its own Chromium, so static PNG export (chart downloads
# and the branded DOCX) works fully offline — we only need its runtime libs.
FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Shared libraries required by the Chromium that kaleido bundles for PNG export.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libexpat1 \
        libnss3 \
        libnspr4 \
        libgobject-2.0-0 \
        libglib2.0-0 \
        libdbus-1-3 \
        libx11-6 \
        libxcb1 \
        libxext6 \
        libxrender1 \
        fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for better layer caching.
COPY requirements.txt ./
RUN pip install -r requirements.txt

# Application source.
COPY . .

# Runtime data (saved branding profiles, uploaded logos) lives here.
RUN mkdir -p profiles

EXPOSE 8501

# Simple liveness check against Streamlit's health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8501/_stcore/health').status==200 else 1)"

CMD ["streamlit", "run", "app.py"]
