"""Unified LLM client - Gemini primary, OpenAI fallback, heuristic last."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request

from config import (
    ANTHROPIC_API_KEY,
    DEEPSEEK_API_KEY,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_TIMEOUT_SEC,
    GROK_API_KEY,
    LOW_COST_MODE,
    OPENAI_API_KEY,
    OPENAI_MODEL,
    OPENAI_TIMEOUT_SEC,
)

log = logging.getLogger("reposense.llm")


def _heuristic(prompt: str) -> str:
    return (
        "Analysis based on repository structure and static scans. "
        "Enable GEMINI_API_KEY or OPENAI_API_KEY for richer AI insights."
    )


def generate(prompt: str, system: str = "", model_provider: str | None = None) -> tuple[str, str]:
    """
    Generate text from prompt.
    Returns (text, provider) where provider is gemini|openai|anthropic|deepseek|grok|heuristic.
    """
    if LOW_COST_MODE and not any([GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, GROK_API_KEY]):
        return _heuristic(prompt), "heuristic"

    full_prompt = f"{system}\n\n{prompt}".strip() if system else prompt

    if model_provider:
        provider = model_provider.lower()
        if provider == "deepseek" and DEEPSEEK_API_KEY:
            text = _deepseek(full_prompt, system)
            if text: return text, "deepseek"
        elif provider == "grok" and GROK_API_KEY:
            text = _grok(full_prompt, system)
            if text: return text, "grok"
        elif provider == "gemini" and GEMINI_API_KEY:
            text = _gemini(full_prompt)
            if text: return text, "gemini"
        elif provider in ("openai", "gpt") and OPENAI_API_KEY:
            text = _openai(full_prompt, system)
            if text: return text, "openai"
        elif provider in ("anthropic", "claude") and ANTHROPIC_API_KEY:
            text = _anthropic(full_prompt, system)
            if text: return text, "anthropic"

    if GEMINI_API_KEY:
        text = _gemini(full_prompt)
        if text: return text, "gemini"

    if OPENAI_API_KEY:
        text = _openai(full_prompt, system)
        if text: return text, "openai"

    if DEEPSEEK_API_KEY:
        text = _deepseek(full_prompt, system)
        if text: return text, "deepseek"

    if GROK_API_KEY:
        text = _grok(full_prompt, system)
        if text: return text, "grok"

    if ANTHROPIC_API_KEY:
        text = _anthropic(full_prompt, system)
        if text: return text, "anthropic"

    log.warning("LLM providers unavailable or failed; falling back to heuristic output")
    return _heuristic(prompt), "heuristic"


def complete(
    prompt: str,
    system: str = "",
    max_tokens: int = 2048,
    temperature: float = 0.3,
    force_llm: bool = False,
) -> dict:
    """
    Backwards-compatible completion API used by existing helpers.

    The current lightweight client keeps these parameters so older callers
    still work, even though the providers are configured centrally.
    """
    del max_tokens, temperature

    if force_llm:
        full_prompt = f"{system}\n\n{prompt}".strip() if system else prompt

        if GEMINI_API_KEY:
            text = _gemini(full_prompt)
            if text:
                return {"text": text, "source": "gemini"}

        if OPENAI_API_KEY:
            text = _openai(full_prompt, system)
            if text:
                return {"text": text, "source": "openai"}

        if ANTHROPIC_API_KEY:
            text = _anthropic(full_prompt, system)
            if text:
                return {"text": text, "source": "anthropic"}

        log.warning("Forced LLM request failed; returning heuristic fallback")
        return {"text": _heuristic(prompt), "source": "heuristic"}

    text, provider = generate(prompt, system=system)
    return {"text": text, "source": provider}


def chat(session_context: str, question: str, model_provider: str | None = None) -> tuple[str, str]:
    """Session-aware Q&A over analysis context."""
    prompt = (
        f"You are RepoSense, an expert repository intelligence assistant.\n"
        f"Use ONLY the analysis context below. Be concise and specific.\n\n"
        f"CONTEXT:\n{session_context[:12000]}\n\n"
        f"QUESTION: {question}"
    )
    return generate(prompt, system="Answer in 2-5 sentences.", model_provider=model_provider)


def _gemini(prompt: str) -> str | None:
    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            request_options={"timeout": GEMINI_TIMEOUT_SEC},
        )
        if response and response.text:
            return response.text.strip()
    except Exception as exc:
        log.warning("Gemini SDK request failed: %s", exc)

    try:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        )
        body = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode()
        req = urllib.request.Request(
            url, data=body, headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=GEMINI_TIMEOUT_SEC) as resp:
            data = json.loads(resp.read().decode())
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (urllib.error.URLError, TimeoutError, KeyError, IndexError, json.JSONDecodeError) as exc:
        log.warning("Gemini HTTP fallback request failed: %s", exc)
        return None


def _openai(prompt: str, system: str) -> str | None:
    try:
        from openai import OpenAI

        client = OpenAI(
            api_key=OPENAI_API_KEY,
            timeout=OPENAI_TIMEOUT_SEC,
            max_retries=0,
        )
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            max_tokens=2048,
            temperature=0.3,
        )
        content = resp.choices[0].message.content
        return content.strip() if isinstance(content, str) else None
    except Exception as exc:
        log.warning("OpenAI request failed: %s", exc)
        return None


def _anthropic(prompt: str, system: str = "") -> str | None:
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=__import__('config').ANTHROPIC_API_KEY)
        messages = [{"role": "user", "content": prompt}]
        kwargs = {"model": "claude-haiku-4-5-20251001", "max_tokens": 2048, "messages": messages}
        if system:
            kwargs["system"] = system
        resp = client.messages.create(**kwargs)
        return resp.content[0].text.strip() if resp.content else None
    except Exception as exc:
        log.warning("Anthropic request failed: %s", exc)
        return None

def _deepseek(prompt: str, system: str) -> str | None:
    try:
        from openai import OpenAI
        client = OpenAI(
            api_key=__import__('config').DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com/v1",
            timeout=__import__('config').OPENAI_TIMEOUT_SEC,
            max_retries=0,
        )
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        resp = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            max_tokens=2048,
            temperature=0.3,
        )
        content = resp.choices[0].message.content
        return content.strip() if isinstance(content, str) else None
    except Exception as exc:
        log.warning("DeepSeek request failed: %s", exc)
        return None

def _grok(prompt: str, system: str) -> str | None:
    try:
        from openai import OpenAI
        client = OpenAI(
            api_key=__import__('config').GROK_API_KEY,
            base_url="https://api.x.ai/v1",
            timeout=__import__('config').OPENAI_TIMEOUT_SEC,
            max_retries=0,
        )
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        resp = client.chat.completions.create(
            model="grok-beta",
            messages=messages,
            max_tokens=2048,
            temperature=0.3,
        )
        content = resp.choices[0].message.content
        return content.strip() if isinstance(content, str) else None
    except Exception as exc:
        log.warning("Grok request failed: %s", exc)
        return None
