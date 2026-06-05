"""Unified LLM client - Strict single-model mode with robust error handling."""

from __future__ import annotations
import json
import logging
import urllib.error
import urllib.request
import os

from config import (
    ANTHROPIC_API_KEY,
    DEEPSEEK_API_KEY,
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_TIMEOUT_SEC,
    GROK_API_KEY,
    GROQ_API_KEY,
    OPENROUTER_API_KEY,
    OPENAI_API_KEY,
    OPENAI_MODEL,
    OPENAI_TIMEOUT_SEC,
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

def _heuristic(prompt: str) -> str:
    return (
        "Analysis based on repository structure and static scans. "
        "Enable GEMINI_API_KEY or OPENAI_API_KEY for richer AI insights."
    )

def generate(prompt: str, system: str = "", model_provider: str = "gemini") -> tuple[str, str]:
    """
    Generate text from prompt. Strict single-provider execution.
    Raises LLMProviderError on any failure.
    """
    full_prompt = f"{system}\n\n{prompt}".strip() if system else prompt
    provider = (model_provider or "gemini").lower()

    if provider == "gemini":
        if not GEMINI_API_KEY:
            raise LLMProviderError("Gemini", "API key missing.", "Add GEMINI_API_KEY to .env file.")
        return _gemini(full_prompt), "gemini"
    elif provider in ("openai", "gpt"):
        if not OPENAI_API_KEY:
            raise LLMProviderError("OpenAI", "API key missing.", "Add OPENAI_API_KEY to .env file.")
        return _openai(full_prompt, system), "openai"
    elif provider in ("anthropic", "claude"):
        if not ANTHROPIC_API_KEY:
            raise LLMProviderError("Anthropic", "API key missing.", "Add ANTHROPIC_API_KEY to .env file.")
        return _anthropic(full_prompt, system), "anthropic"
    elif provider == "deepseek":
        if not DEEPSEEK_API_KEY:
            raise LLMProviderError("DeepSeek", "API key missing.", "Add DEEPSEEK_API_KEY to .env file.")
        return _deepseek(full_prompt, system), "deepseek"
    elif provider == "grok":
        if not GROK_API_KEY:
            raise LLMProviderError("Grok", "API key missing.", "Add GROK_API_KEY to .env file.")
        return _grok(full_prompt, system), "grok"
    elif provider == "groq":
        if not GROQ_API_KEY:
            raise LLMProviderError("Groq", "API key missing.", "Add GROQ_API_KEY to .env file.")
        return _groq(full_prompt, system), "groq"
    elif provider == "openrouter":
        if not OPENROUTER_API_KEY:
            raise LLMProviderError("OpenRouter", "API key missing.", "Add OPENROUTER_API_KEY to .env file.")
        return _openrouter(full_prompt, system), "openrouter"
    else:
        raise LLMProviderError("System", f"Unknown provider: {provider}", "Select a valid provider.")

def complete(
    prompt: str,
    system: str = "",
    max_tokens: int = 2048,
    temperature: float = 0.3,
    force_llm: bool = False,
    model_provider: str = "gemini",
) -> dict:
    try:
        text, provider = generate(prompt, system=system, model_provider=model_provider)
        return {"text": text, "source": provider}
    except LLMProviderError as e:
        return {"text": f"Error: {e.reason}\nSuggested Fix: {e.fix}", "source": e.provider, "error": e.to_dict()}
    except Exception as e:
        return {"text": f"Unexpected error: {str(e)}", "source": "system"}

def chat(session_context: str, question: str, model_provider: str = "gemini") -> tuple[str, str]:
    prompt = (
        f"You are RepoSense, an expert repository intelligence assistant.\n"
        f"Use ONLY the analysis context below. Be concise and specific.\n\n"
        f"CONTEXT:\n{session_context[:12000]}\n\n"
        f"QUESTION: {question}"
    )
    return generate(prompt, system="Answer in 2-5 sentences.", model_provider=model_provider)

def _gemini(prompt: str) -> str:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(prompt, request_options={"timeout": GEMINI_TIMEOUT_SEC})
        if response and response.text:
            return response.text.strip()
        raise Exception("Empty response from Gemini")
    except Exception as exc:
        log.error("Gemini failed: %s", exc)
        raise LLMProviderError("Gemini", str(exc), "Check if your GEMINI_API_KEY is valid and has quota.")

def _openai(prompt: str, system: str) -> str:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY, timeout=OPENAI_TIMEOUT_SEC, max_retries=1)
        messages = [{"role": "system", "content": system}] if system else []
        messages.append({"role": "user", "content": prompt})
        resp = client.chat.completions.create(model=OPENAI_MODEL, messages=messages, max_tokens=2048, temperature=0.3)
        content = resp.choices[0].message.content
        if not content: raise Exception("Empty response from OpenAI")
        return content.strip()
    except Exception as exc:
        log.error("OpenAI failed: %s", exc)
        raise LLMProviderError("OpenAI", str(exc), "Check your OPENAI_API_KEY and billing status.")

def _anthropic(prompt: str, system: str = "") -> str:
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        messages = [{"role": "user", "content": prompt}]
        kwargs = {"model": "claude-3-haiku-20240307", "max_tokens": 2048, "messages": messages}
        if system: kwargs["system"] = system
        resp = client.messages.create(**kwargs)
        if not resp.content: raise Exception("Empty response from Anthropic")
        return resp.content[0].text.strip()
    except Exception as exc:
        log.error("Anthropic failed: %s", exc)
        raise LLMProviderError("Anthropic", str(exc), "Verify ANTHROPIC_API_KEY and account credits.")

def _deepseek(prompt: str, system: str) -> str:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com/v1", timeout=OPENAI_TIMEOUT_SEC)
        messages = [{"role": "system", "content": system}] if system else []
        messages.append({"role": "user", "content": prompt})
        resp = client.chat.completions.create(model="deepseek-chat", messages=messages, max_tokens=2048, temperature=0.3)
        content = resp.choices[0].message.content
        if not content: raise Exception("Empty response from DeepSeek")
        return content.strip()
    except Exception as exc:
        raise LLMProviderError("DeepSeek", str(exc), "Check DEEPSEEK_API_KEY.")

def _grok(prompt: str, system: str) -> str:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=GROK_API_KEY, base_url="https://api.x.ai/v1", timeout=OPENAI_TIMEOUT_SEC)
        messages = [{"role": "system", "content": system}] if system else []
        messages.append({"role": "user", "content": prompt})
        resp = client.chat.completions.create(model="grok-beta", messages=messages, max_tokens=2048, temperature=0.3)
        content = resp.choices[0].message.content
        if not content: raise Exception("Empty response from Grok")
        return content.strip()
    except Exception as exc:
        raise LLMProviderError("Grok", str(exc), "Check GROK_API_KEY.")

def _groq(prompt: str, system: str) -> str:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1", timeout=OPENAI_TIMEOUT_SEC)
        messages = [{"role": "system", "content": system}] if system else []
        messages.append({"role": "user", "content": prompt})
        resp = client.chat.completions.create(model="llama3-70b-8192", messages=messages, max_tokens=2048, temperature=0.3)
        content = resp.choices[0].message.content
        if not content: raise Exception("Empty response from Groq")
        return content.strip()
    except Exception as exc:
        raise LLMProviderError("Groq", str(exc), "Check GROQ_API_KEY.")

def _openrouter(prompt: str, system: str) -> str:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1", timeout=OPENAI_TIMEOUT_SEC)
        messages = [{"role": "system", "content": system}] if system else []
        messages.append({"role": "user", "content": prompt})
        resp = client.chat.completions.create(model="meta-llama/llama-3-70b-instruct", messages=messages, max_tokens=2048, temperature=0.3)
        content = resp.choices[0].message.content
        if not content: raise Exception("Empty response from OpenRouter")
        return content.strip()
    except Exception as exc:
        raise LLMProviderError("OpenRouter", str(exc), "Check OPENROUTER_API_KEY.")
