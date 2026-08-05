"""Utility guardrails for LLM requests.

This module provides lightweight, extensible guardrails that can be
applied before any request is sent to OpenRouter.  They are deliberately
kept simple so they work with any model without requiring model‑specific
behaviour.

Available functions:
- `sanitize_prompt(prompt: str) -> str`
- `enforce_max_length(prompt: str, max_tokens: int = 2048) -> str`
- `moderate_content(prompt: str) -> bool`
- `rate_limit(user: str | None = None) -> None`

The functions raise `ValueError` when a guardrail fails; the caller can
catch the exception and return a friendly error message to the UI.
"""
import os
import time
import re
import logging
from threading import Lock

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Simple content moderation (placeholder)
# ---------------------------------------------------------------------------
def moderate_content(prompt: str) -> bool:
    """Return ``True`` if the prompt passes a very basic profanity filter.

    The filter is deliberately lightweight – it checks for a short list of
    prohibited words.  For production you would replace this with a call to a
    dedicated moderation API (e.g., OpenAI's moderation endpoint).
    """
    prohibited = {"badword1", "badword2", "illegal"}
    lowered = prompt.lower()
    for word in prohibited:
        if re.search(r"\b" + re.escape(word) + r"\b", lowered):
            log.warning("Prompt blocked by moderation: %s", word)
            return False
    return True

# ---------------------------------------------------------------------------
# Prompt sanitisation – strip control characters, limit length, etc.
# ---------------------------------------------------------------------------
def sanitize_prompt(prompt: str) -> str:
    """Remove non‑printable characters and collapse whitespace.

    This helps avoid injection attacks and keeps the prompt tidy for the LLM.
    """
    # Remove any ANSI escape sequences or control chars
    cleaned = re.sub(r"[\x00-\x1F\x7F]+", " ", prompt)
    # Collapse multiple spaces / newlines into a single space
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned

# ---------------------------------------------------------------------------
# Token limit enforcement (very simple character‑based approximation)
# ---------------------------------------------------------------------------
def enforce_max_length(prompt: str, max_tokens: int = 2048) -> str:
    """Truncate the prompt so it does not exceed *max_tokens*.

    A rough conversion of 1 token ≈ 4 characters is used – sufficient for
    most LLM providers.  The function returns the possibly‑truncated prompt.
    """
    approx_chars = max_tokens * 4
    if len(prompt) > approx_chars:
        log.info("Prompt truncated from %d to %d characters", len(prompt), approx_chars)
        return prompt[:approx_chars]
    return prompt

# ---------------------------------------------------------------------------
# Rate limiting – simple token‑bucket per‑process
# ---------------------------------------------------------------------------
_RATE_LIMIT = int(os.getenv("LLM_RATE_LIMIT_PER_MIN", "60"))  # requests per minute
_RATE_BUCKET = _RATE_LIMIT
_LAST_REFILL = time.time()
_LOCK = Lock()

def _refill_bucket():
    global _RATE_BUCKET, _LAST_REFILL
    now = time.time()
    elapsed = now - _LAST_REFILL
    tokens_to_add = int(elapsed * (_RATE_LIMIT / 60))
    if tokens_to_add > 0:
        _RATE_BUCKET = min(_RATE_LIMIT, _RATE_BUCKET + tokens_to_add)
        _LAST_REFILL = now

def rate_limit(user: str | None = None) -> None:
    """Block until a request token is available.

    This is a coarse‑grained, process‑wide limiter.  ``user`` is accepted for
    future per‑user extensions but is currently unused.
    """
    global _RATE_BUCKET
    with _LOCK:
        _refill_bucket()
        if _RATE_BUCKET <= 0:
            sleep_time = 60.0 / _RATE_LIMIT
            log.debug("Rate limit exceeded – sleeping %.2f s", sleep_time)
            time.sleep(sleep_time)
            _refill_bucket()
        _RATE_BUCKET -= 1
