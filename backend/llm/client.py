"""Unified LLM client - All routes through OpenRouter gateway.

Every model available on OpenRouter (GPT-4o, Claude, Gemini, Llama, Mistral,
DeepSeek, etc.) is accessible via a single API key and code path.
"""

from __future__ import annotations
import logging
from backend.llm.guardrails import sanitize_prompt, enforce_max_length, moderate_content, rate_limit
import os

from backend.config import (
    OPENROUTER_API_KEY,
    OPENROUTER_DEFAULT_MODEL,
    OPENROUTER_TIMEOUT_SEC,
    # Legacy keys kept for backward compat detection
    GEMINI_API_KEY,
    OPENAI_API_KEY,
    ANTHROPIC_API_KEY,
)

log = logging.getLogger("reposense.llm")


class LLMProviderError(Exception):
    def __init__(self, provider: str, reason: str, fix: str):
        self.provider = provider
        self.reason = reason
        self.fix = fix
        super().__init__(f"[{provider}] {reason}")

    def to_dict(self):
        return {
            "provider": self.provider,
            "reason": self.reason,
            "suggested_fix": self.fix,
            "status": "Failed"
        }


# ---------------------------------------------------------------------------
# Model slug helpers
# ---------------------------------------------------------------------------

# Map short aliases to full OpenRouter slugs for convenience
_MODEL_ALIASES: dict[str, str] = {
    "gemini": "google/gemini-2.5-flash",
    "gemini-flash": "google/gemini-2.5-flash",
    "gemini-pro": "google/gemini-2.5-pro",
    "gpt": "openai/gpt-4o-mini",
    "gpt-4o": "openai/gpt-4o",
    "gpt-4o-mini": "openai/gpt-4o-mini",
    "claude": "anthropic/claude-3-haiku",
    "claude-haiku": "anthropic/claude-3-haiku",
    "claude-sonnet": "anthropic/claude-3.5-sonnet",
    "llama": "meta-llama/llama-3.3-70b-instruct",
    "llama-70b": "meta-llama/llama-3.3-70b-instruct",
    "mistral": "mistralai/mistral-small-24b-instruct-2501",
    "deepseek": "deepseek/deepseek-chat",
    "deepseek-coder": "deepseek/deepseek-chat",
    "qwen": "qwen/qwen-2.5-coder-32b-instruct",
}


def resolve_model(model: str | None) -> str:
    """Resolve a model name/alias to a full OpenRouter slug."""
    if not model:
        return OPENROUTER_DEFAULT_MODEL
    model_lower = model.strip().lower()
    return _MODEL_ALIASES.get(model_lower, model)


# ---------------------------------------------------------------------------
# Heuristic fallback (no API key)
# ---------------------------------------------------------------------------

def _heuristic(prompt: str) -> str:
    return (
        "Analysis based on repository structure and static scans. "
        "Enable OPENROUTER_API_KEY for richer AI insights across 200+ models."
    )


# ---------------------------------------------------------------------------
# OpenRouter gateway (single provider for everything)
# ---------------------------------------------------------------------------

def _openrouter(prompt: str, system: str = "", model: str = "", max_tokens: int = 8192) -> str:
    """Call any model via OpenRouter's OpenAI-compatible API."""
    try:
        from openai import OpenAI

        client = OpenAI(
            api_key=OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
            timeout=OPENROUTER_TIMEOUT_SEC,
            max_retries=1,
        )

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        resolved = resolve_model(model) if model else OPENROUTER_DEFAULT_MODEL

        resp = client.chat.completions.create(
            model=resolved,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.3,
            extra_headers={
                "HTTP-Referer": "https://reposense.dev",
                "X-Title": "RepoSense",
            },
        )

        content = resp.choices[0].message.content
        if not content:
            raise Exception(f"Empty response from OpenRouter ({resolved})")
        return content.strip()

    except Exception as exc:
        log.error("OpenRouter failed (model=%s): %s", model, exc)
        raise LLMProviderError(
            "OpenRouter",
            str(exc),
            "Check your OPENROUTER_API_KEY at https://openrouter.ai/keys and ensure you have credits."
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate(
    prompt: str,
    system: str = "",
    model: str = "",
    max_input_tokens: int = 8192,
    max_output_tokens: int = 8192,
) -> tuple[str, str]:
    """Generate text using any model via OpenRouter.

    Args:
        prompt: The user prompt.
        system: Optional system instruction.
        model: OpenRouter model slug (e.g. 'openai/gpt-4o') or short alias
               (e.g. 'gemini', 'claude'). Defaults to OPENROUTER_DEFAULT_MODEL.
        max_input_tokens: Maximum tokens allowed in the input prompt (default 8192).
        max_output_tokens: Maximum tokens allowed in the LLM response (default 8192).

    Returns:
        Tuple of (generated_text, provider_string).
    """
    if not OPENROUTER_API_KEY:
        log.warning("No OPENROUTER_API_KEY set — falling back to heuristic.")
        return _heuristic(prompt), "heuristic"

    full_prompt = f"{system}\n\n{prompt}".strip() if system else prompt
    # ---------- Guardrails ----------
    # 1️⃣ Sanitize
    safe_prompt = sanitize_prompt(full_prompt)
    # 2️⃣ Enforce max length
    safe_prompt = enforce_max_length(safe_prompt, max_tokens=max_input_tokens)
    # 3️⃣ Moderate (simple profanity filter; raise if blocked)
    if not moderate_content(safe_prompt):
        raise ValueError("Prompt failed moderation – contains disallowed content")
    # 4️⃣ Rate‑limit
    rate_limit()

    resolved = resolve_model(model)
    result = _openrouter(safe_prompt, system, resolved, max_tokens=max_output_tokens)
    return result, f"openrouter:{resolved}"





def complete(
    prompt: str,
    system: str = "",
    max_tokens: int = 2048,
    temperature: float = 0.3,
    force_llm: bool = False,
    model: str = "",
) -> dict:
    """Generate with structured return. Used by llm_fixer and other utils."""
    try:
        text, provider = generate(prompt, system=system, model=model)
        return {"text": text, "source": provider}
    except LLMProviderError as e:
        return {"text": f"Error: {e.reason}\nSuggested Fix: {e.fix}", "source": e.provider, "error": e.to_dict()}
    except Exception as e:
        return {"text": f"Unexpected error: {str(e)}", "source": "system"}


def chat(session_context: str, question: str, model: str | None = None) -> tuple[str, str]:
    """Chat about a repository analysis session."""
    prompt = (
        f"You are RepoSense, an expert repository intelligence assistant.\n"
        f"Use ONLY the analysis context below. Be concise and specific.\n\n"
        f"CONTEXT:\n{session_context[:12000]}\n\n"
        f"QUESTION: {question}"
    )
    return generate(prompt, system="Answer in 2-5 sentences.", model=model or "")


# ---------------------------------------------------------------------------
# Model listing (for /models endpoint)
# ---------------------------------------------------------------------------

def list_available_models() -> list[dict]:
    """Fetch available models from OpenRouter API."""
    if not OPENROUTER_API_KEY:
        return []

    try:
        import urllib.request
        import json

        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/models",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://reposense.dev",
            },
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())

        # Curated popular models for the UI
        POPULAR = {
            "google/gemini-2.0-flash-001",
            "google/gemini-flash-1.5",
            "anthropic/claude-3.5-sonnet",
            "anthropic/claude-3-haiku",
            "openai/gpt-4o",
            "openai/gpt-4o-mini",
            "meta-llama/llama-3.1-70b-instruct",
            "mistralai/mistral-7b-instruct",
            "deepseek/deepseek-chat",
            "qwen/qwen-2.5-72b-instruct",
        }

        models = []
        for m in data.get("data", []):
            mid = m["id"]
            # Extract provider prefix (e.g. "google" from "google/gemini-...")
            parts = mid.split("/")
            provider_raw = parts[0] if len(parts) > 1 else ""
            provider = provider_raw.replace("-", " ").title()

            models.append({
                "id": mid,
                "name": m.get("name", mid),
                "provider": provider,
                "context_length": m.get("context_length", 0),
                "popular": mid in POPULAR,
            })

        # Sort: popular first, then alphabetically
        models.sort(key=lambda x: (not x["popular"], x["name"].lower()))
        return models

    except Exception as exc:
        log.error("Failed to fetch OpenRouter models: %s", exc)
        return []
