import json
import logging
import re
from pathlib import Path
from backend.llm.client import generate as llm_generate

log = logging.getLogger("reposense.architecture")

ARCHITECTURE_PROMPT = """You are an expert software architect.
Analyze the provided GitHub repository details and reverse engineer the software architecture.
Your task is to generate a professional Structurizr C4 Model (using Mermaid C4 notation) that accurately represents the current implementation instead of making assumptions.

Requirements:
1. Detect the application's entry points.
2. Identify all services, controllers, routes, middleware, repositories, models, utilities, workers, schedulers, and background jobs.
3. Detect databases, caches, queues, object storage, external APIs, authentication providers, and third-party integrations.
4. Determine the communication between every component.
5. Follow the actual source code instead of inferred architecture.

For every diagram:
- Use Mermaid C4 notation (C4Context, C4Container, C4Component for C4 models, and standard Mermaid flowcharts/sequence diagrams for flow diagrams).
- Keep layouts clean and readable.
- Label every relationship and include technology names.
- Do NOT wrap mermaid code in markdown code blocks inside the JSON string values. Just the raw mermaid code.

You MUST return your analysis STRICTLY as a valid JSON object with the following schema (no markdown, no explanation outside the JSON):
{
  "c4_models": {
    "level_1_context": "<mermaid code>",
    "level_2_container": "<mermaid code>",
    "level_3_component": "<mermaid code>"
  },
  "flow_diagrams": {
    "request_lifecycle": "<mermaid code>",
    "authentication_flow": "<mermaid code>",
    "database_interaction": "<mermaid code>",
    "external_api_interaction": "<mermaid code>",
    "data_flow_diagram": "<mermaid code>",
    "deployment_diagram": "<mermaid code>"
  },
  "markdown_summary": "<Architecture summary in markdown>"
}

IMPORTANT: Return ONLY the JSON object. No markdown code fences. No explanation before or after. Just valid JSON.

Repository Context:
{context}
"""


def generate_architecture_analysis(repo_path: str, files: list) -> dict:
    """Analyze the repository architecture using LLM and Mermaid C4."""
    try:
        root = Path(repo_path)

        # Build directory tree
        tree = []
        for p in root.rglob("*"):
            if any(skip in p.parts for skip in (".git", "node_modules", "__pycache__", "venv", ".venv", "dist")):
                continue
            tree.append(str(p.relative_to(root)).replace("\\", "/"))

        # Read config files
        configs = {}
        for name in ("package.json", "requirements.txt", "docker-compose.yml", "go.mod",
                      "pyproject.toml", "Cargo.toml", "pom.xml", "build.gradle", "Dockerfile"):
            p = root / name
            if p.exists():
                content = p.read_text(encoding="utf-8", errors="ignore")
                configs[name] = content[:2000]  # Limit per config

        # Build file summaries
        file_summaries = []
        for f in files[:100]:
            imports = ", ".join(f.get("imports", [])[:10])
            file_summaries.append(f"{f['path']} - Imports: {imports}")

        context_str = (
            f"Directory Tree:\n{chr(10).join(tree[:200])}\n\n"
            f"Key Configurations:\n{json.dumps(configs, indent=2)}\n\n"
            f"Key Files and Imports:\n{chr(10).join(file_summaries)}"
        )

        prompt = ARCHITECTURE_PROMPT.replace("{context}", context_str)

        # Call LLM - generate() returns (text, provider)
        response_text, provider = llm_generate(
            prompt,
            max_input_tokens=16000,   # Allow large repo tree in prompt
            max_output_tokens=8192,   # Need detailed JSON response
        )
        log.info("Architecture LLM response received from %s (%d chars)", provider, len(response_text))

        if not response_text or provider == "heuristic":
            log.warning("Architecture analysis got heuristic fallback - returning empty")
            return _fallback_architecture(files)

        # Parse JSON from response
        return _parse_architecture_json(response_text)

    except Exception as e:
        log.error("Failed to generate architecture analysis: %s", e, exc_info=True)
        return _fallback_architecture(files)


def _parse_architecture_json(response_text: str) -> dict:
    """Try multiple strategies to extract valid JSON from the LLM response."""
    # Strategy 1: Direct JSON parse
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass

    # Strategy 2: Extract from ```json ... ``` blocks
    json_match = re.search(r'```(?:json)?\s*\n(.*?)\n```', response_text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Strategy 3: Find first { to last }
    first_brace = response_text.find("{")
    last_brace = response_text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(response_text[first_brace:last_brace + 1])
        except json.JSONDecodeError:
            pass

    log.warning("Could not parse architecture JSON from LLM response")
    return {}


def _fallback_architecture(files: list) -> dict:
    """Generate a basic static architecture when LLM is unavailable."""
    file_list = [f.get("path", "unknown") for f in files[:20]]
    nodes = "\\n".join(f"  {f}" for f in file_list)

    return {
        "c4_models": {
            "level_1_context": f"graph TD\\n  User[User] -->|Uses| App[Application]\\n  App -->|Reads| Repo[Repository Files]",
            "level_2_container": f"graph TD\\n  Frontend[Frontend] -->|HTTP| Backend[Backend API]\\n  Backend -->|Reads| FS[File System]",
            "level_3_component": f"graph TD\\n  API[API Routes] --> Analyzers[Analyzers]\\n  Analyzers --> LLM[LLM Client]",
        },
        "flow_diagrams": {},
        "markdown_summary": (
            "## Architecture Summary (Heuristic Fallback)\n\n"
            "LLM analysis was unavailable. This is a basic structural overview.\n\n"
            f"### Files Analyzed\n{chr(10).join('- ' + f for f in file_list)}\n\n"
            "**Tip:** Set `OPENROUTER_API_KEY` for detailed AI-powered architecture analysis."
        ),
    }
