import json
import logging
import re
from pathlib import Path
from backend.llm.client import generate as llm_generate

log = logging.getLogger("reposense.architecture")

ARCHITECTURE_PROMPT = """You are an expert software architect.
Analyze the provided GitHub repository and generate Mermaid flowchart diagrams that accurately
represent the actual source code architecture. Use ONLY what you can see in the file tree and configs.

CRITICAL MERMAID RULES (follow exactly):
1. Use ONLY standard Mermaid flowchart syntax: flowchart TD
2. Node IDs must be alphanumeric + underscores only (e.g. Flask_App, NOT Flask App)
3. Labels with spaces go in quotes: Flask_App["Flask App"]
4. Arrows: --> for simple, -->|label| for labeled
5. DO NOT use C4Context, C4Container or any C4 notation - use flowchart TD only
6. DO NOT use parentheses () in node IDs
7. Each diagram must start with: flowchart TD
8. Keep diagrams concise - max 15 nodes per diagram
9. Use \\n for newlines inside JSON string values

You MUST return ONLY a valid JSON object (no markdown fences, no explanation):
{
  "c4_models": {
    "level_1_context": "flowchart TD\\n  User[\"User\"] -->|Uses| System[\"Application\"]",
    "level_2_container": "flowchart TD\\n  Frontend[\"Frontend\"] -->|HTTP/REST| Backend[\"Backend API\"]",
    "level_3_component": "flowchart TD\\n  Router[\"API Router\"] --> Handler[\"Request Handler\"]"
  },
  "flow_diagrams": {
    "request_lifecycle": "flowchart TD\\n  Client[\"Client\"] --> Server[\"Server\"]",
    "data_flow_diagram": "flowchart TD\\n  Input[\"Input\"] --> Process[\"Process\"] --> Output[\"Output\"]",
    "deployment_diagram": "flowchart TD\\n  Dev[\"Developer\"] --> Repo[\"Git Repo\"] --> Deploy[\"Deployment\"]"
  },
  "markdown_summary": "## Architecture Summary\\n\\nBrief description here."
}

IMPORTANT:
- Return ONLY the JSON object. Nothing before or after it.
- All mermaid code goes inside JSON string values - escape newlines as \\n
- If a flow type does not apply (e.g. no auth), use a simple placeholder diagram
- Follow the ACTUAL code structure, not generic assumptions

Repository Context:
{context}
"""


def generate_architecture_analysis(repo_path: str, files: list) -> dict:
    """Analyze the repository architecture using LLM and Mermaid flowcharts."""
    try:
        root = Path(repo_path)

        # Build directory tree (exclude common noise)
        tree = []
        for p in root.rglob("*"):
            if any(skip in p.parts for skip in (
                ".git", "node_modules", "__pycache__", "venv", ".venv",
                "dist", "build", ".next", "coverage", ".pytest_cache"
            )):
                continue
            tree.append(str(p.relative_to(root)).replace("\\", "/"))
        tree.sort()

        # Read config files for stack detection
        configs = {}
        for name in (
            "package.json", "requirements.txt", "docker-compose.yml", "go.mod",
            "pyproject.toml", "Cargo.toml", "pom.xml", "build.gradle",
            "Dockerfile", ".env.example", "vercel.json", "netlify.toml",
        ):
            p = root / name
            if p.exists():
                content = p.read_text(encoding="utf-8", errors="ignore")
                configs[name] = content[:1500]

        # Build file summaries with imports
        file_summaries = []
        for f in files[:80]:
            imports = ", ".join(f.get("imports", [])[:8])
            path = f.get("path", "")
            if imports:
                file_summaries.append(f"{path} → imports: {imports}")
            else:
                file_summaries.append(path)

        context_str = (
            f"Directory Tree (first 150 entries):\n{chr(10).join(tree[:150])}\n\n"
            f"Key Configurations:\n{json.dumps(configs, indent=2)}\n\n"
            f"Key Files and Dependencies:\n{chr(10).join(file_summaries)}"
        )

        prompt = ARCHITECTURE_PROMPT.replace("{context}", context_str)
        log.info("Architecture prompt length: %d chars", len(prompt))

        # Call LLM
        response_text, provider = llm_generate(
            prompt,
            max_input_tokens=16000,
            max_output_tokens=8192,
        )
        log.info("Architecture LLM response from %s (%d chars)", provider, len(response_text))

        if not response_text or provider == "heuristic":
            log.warning("Architecture analysis got heuristic fallback")
            return _fallback_architecture(files)

        result = _parse_architecture_json(response_text)
        if not result:
            log.warning("Could not parse architecture JSON — using fallback")
            return _fallback_architecture(files)

        # Sanitize all mermaid strings in the result
        result = _sanitize_mermaid_in_dict(result)
        return result

    except Exception as e:
        log.error("Failed to generate architecture analysis: %s", e, exc_info=True)
        return _fallback_architecture(files)


def _sanitize_mermaid_in_dict(data: dict) -> dict:
    """Recursively sanitize mermaid diagram strings in the architecture dict."""
    if isinstance(data, dict):
        return {k: _sanitize_mermaid_in_dict(v) for k, v in data.items()}
    elif isinstance(data, str) and ("flowchart" in data or "graph" in data or "sequenceDiagram" in data):
        return _sanitize_mermaid(data)
    return data


def _sanitize_mermaid(code: str) -> str:
    """Clean up common LLM mermaid generation mistakes."""
    # Strip markdown code fences if LLM added them
    code = re.sub(r'^```[a-z]*\s*\n?', '', code, flags=re.IGNORECASE)
    code = re.sub(r'\n?```\s*$', '', code, flags=re.IGNORECASE)

    # Replace literal \n with real newlines if they exist
    if '\\n' in code and '\n' not in code:
        code = code.replace('\\n', '\n')

    # Remove problematic characters from node IDs (keep alphanumeric, underscore, brackets, quotes, arrows, spaces, pipe)
    # Fix common: nodes with special chars in IDs without quoting
    # e.g. Flask(App) -> Flask_App["Flask App"]
    code = re.sub(r'\(([^)]+)\)', lambda m: '[' + m.group(1) + ']', code)

    return code.strip()


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

    # Strategy 3: Find outermost { ... }
    first_brace = response_text.find("{")
    last_brace = response_text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        candidate = response_text[first_brace:last_brace + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            # Strategy 4: Try to fix common JSON issues (trailing commas, etc.)
            fixed = re.sub(r',\s*([}\]])', r'\1', candidate)  # remove trailing commas
            try:
                return json.loads(fixed)
            except json.JSONDecodeError:
                pass

    return {}


def _fallback_architecture(files: list) -> dict:
    """Generate a valid static architecture when LLM is unavailable."""
    file_list = [f.get("path", "unknown") for f in files[:15]]

    # Build a simple but valid flowchart from actual files
    file_nodes = "\n".join(
        f"  F{i}[\"{p.split('/')[-1]}\"]" for i, p in enumerate(file_list[:10])
    )

    return {
        "c4_models": {
            "level_1_context": (
                "flowchart TD\n"
                "  User[\"Developer\"]\n"
                "  App[\"Application\"]\n"
                "  GitHub[\"GitHub\"]\n"
                "  User -->|Pushes code| GitHub\n"
                "  User -->|Runs| App\n"
                "  App -->|Clones from| GitHub"
            ),
            "level_2_container": (
                "flowchart TD\n"
                "  Frontend[\"Frontend UI\"]\n"
                "  Backend[\"Backend API\"]\n"
                "  LLM[\"LLM Provider\"]\n"
                "  FS[\"File System\"]\n"
                "  Frontend -->|HTTP REST| Backend\n"
                "  Backend -->|Analyzes| FS\n"
                "  Backend -->|AI Requests| LLM"
            ),
            "level_3_component": (
                "flowchart TD\n"
                f"{file_nodes}\n"
                "  Main[\"Entry Point\"] --> Core[\"Core Logic\"]"
            ) if file_nodes else (
                "flowchart TD\n"
                "  Entry[\"Entry Point\"] --> Core[\"Core Logic\"]\n"
                "  Core --> Utils[\"Utilities\"]"
            ),
        },
        "flow_diagrams": {
            "data_flow_diagram": (
                "flowchart TD\n"
                "  Input[\"Repository URL\"]\n"
                "  Clone[\"Clone Repo\"]\n"
                "  Analyze[\"Analyze Files\"]\n"
                "  Report[\"Generate Report\"]\n"
                "  Input --> Clone --> Analyze --> Report"
            ),
        },
        "markdown_summary": (
            "## Architecture Summary\n\n"
            "> **Note:** This is a heuristic fallback. Set `OPENROUTER_API_KEY` for AI-powered analysis.\n\n"
            "### Files Detected\n"
            + "\n".join(f"- `{f}`" for f in file_list)
        ),
    }
