# syntax=docker/dockerfile:1
# Argus — one image that serves the React UI and the Flask API from the same origin.

# ---- Stage 1: build the React frontend ----
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Python runtime ----
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

# git is required by GitPython to clone the repositories Argus analyses
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY backend/ backend/
COPY data/ data/
COPY --from=frontend /app/frontend/dist frontend/dist

RUN useradd --create-home --uid 10001 argus && chown -R argus:argus /app
USER argus

EXPOSE 8000
# One worker: analysis sessions live in-process; threads serve concurrent SSE streams.
CMD gunicorn --bind 0.0.0.0:${PORT} --workers 1 --threads 16 --timeout 0 backend.server:app
