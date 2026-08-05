"""Provider registry — simplified for OpenRouter-only gateway."""

import logging
from config import OPENROUTER_API_KEY, OPENROUTER_DEFAULT_MODEL

log = logging.getLogger("reposense.registry")


class ProviderRegistry:
    """Health check for the unified OpenRouter gateway."""

    def check_health(self):
        health = {}

        if OPENROUTER_API_KEY:
            health["openrouter"] = {
                "status": "Healthy",
                "name": "OpenRouter",
                "message": f"Connected — default model: {OPENROUTER_DEFAULT_MODEL}",
            }
        else:
            health["openrouter"] = {
                "status": "Missing Key",
                "name": "OpenRouter",
                "message": "Missing OPENROUTER_API_KEY in environment. Add it to .env to enable AI features.",
            }

        return health


registry = ProviderRegistry()
