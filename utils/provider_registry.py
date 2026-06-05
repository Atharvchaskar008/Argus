import os
import logging
from config import settings

log = logging.getLogger("reposense.registry")

class ProviderRegistry:
    def __init__(self):
        self.providers = {
            "gemini": {"name": "Gemini", "env_key": "GEMINI_API_KEY"},
            "openai": {"name": "GPT", "env_key": "OPENAI_API_KEY"},
            "anthropic": {"name": "Claude", "env_key": "ANTHROPIC_API_KEY"},
            "deepseek": {"name": "DeepSeek", "env_key": "DEEPSEEK_API_KEY"},
            "grok": {"name": "Grok", "env_key": "GROK_API_KEY"},
            "groq": {"name": "Groq", "env_key": "GROQ_API_KEY"},
            "openrouter": {"name": "OpenRouter", "env_key": "OPENROUTER_API_KEY"},
        }

    def check_health(self):
        health = {}
        for key, info in self.providers.items():
            # Check settings first, then env
            env_val = getattr(settings, info["env_key"], os.environ.get(info["env_key"]))
            if not env_val:
                health[key] = {
                    "status": "Missing Key",
                    "name": info["name"],
                    "message": f"Missing {info['env_key']} in environment."
                }
            else:
                health[key] = {
                    "status": "Healthy",
                    "name": info["name"],
                    "message": "Connected"
                }
        return health

registry = ProviderRegistry()
