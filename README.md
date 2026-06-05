# RepoSense

RepoSense is an autonomous, graph-native engineering mission control platform built on Python and Flask. It deploys a swarm of specialized agents to deeply analyze public GitHub repositories, rendering a live dependency graph and exposing real-time events via an SSE (Server-Sent Events) live stream. The platform goes beyond static syntax checks by performing heuristic security scanning (alongside OSV CVE dependency scanning) and leveraging powerful LLMs (Gemini, OpenAI, Anthropic, or local Ollama) to generate architectural insights, blast radius impact analysis, and automated fix patches that await human approval—all seamlessly integrated with no frontend changes needed.

## Features

- **Dependency Graph Map:** Dynamically parses and renders Python repository module imports into a spatial graph memory.
- **Security Scanning:** Detects 9 critical security patterns heuristics.
- **OSV CVE Scanning:** Analyzes `requirements.txt` and `package.json` for known vulnerabilities via the OSV API.
- **Blast Radius Impact Analysis:** Calculates downstream impact of files and vulnerabilities using graph traversal.
- **LLM Summary:** Multi-provider LLM support (Gemini, OpenAI, Anthropic) with a local heuristic fallback for deep architectural insights.
- **Fix Patch Generation:** Generates actionable code fixes for vulnerabilities.
- **Human Approval Mode:** Fixes pause workflow execution and await supervisor approval before finalizing.
- **Live SSE Stream:** Watch agents traverse and analyze the codebase in real-time.
- **Session Export:** Download full analysis reports in JSON format.
- **Dual-Repo Comparison:** Compare two repositories side-by-side using the `/compare` endpoints.
- **Rate Limiting:** Protects the analysis endpoints from abuse.
- **Session Cleanup:** Automatically deletes stale sessions and artifacts from disk.

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, Flask 3.x, flask-cors |
| **LLM** | Gemini 2.0 Flash, GPT-4o-mini, Claude Haiku (any one optional) |
| **Graph** | NetworkX, `graph/memory.py` (GraphMemory) |
| **Parsing** | Python `ast` module, GitPython |
| **Transport** | Server-Sent Events (SSE) |
| **Deployment** | Procfile (`web: python server.py`), runtime.txt (`python-3.11.9`) |

## Project Structure

```text
├── .env.example             # Example environment variable configuration
├── API_REFERENCE.md         # Detailed API route documentation
├── check_local.py           # Local startup health verification script
├── config.py                # Global application configuration and environment loader
├── orchestrator.py          # Core pipeline managing analysis and agent coordination
├── Procfile                 # Deployment instructions for PaaS (e.g. Heroku)
├── README.md                # Project documentation (this file)
├── requirements.txt         # Python dependency definitions
├── runtime.txt              # Specifies Python version for deployment
├── server.py                # Main Flask application and API route definitions
├── agents/                  # Specialized LLM-powered analysis agents
├── bridge/                  # JacLang interoperability bindings
├── frontend/                # Static assets (HTML, CSS, JS) for the Mission Control UI
│   ├── app.js               # Frontend logic for SSE consuming and graph rendering
│   ├── index.html           # Main dashboard markup
│   └── style.css            # Dashboard styling
├── graph/                   # Graph-native memory management
│   ├── memory.py            # GraphMemory class for spatial node/edge storage
│   └── mission_engine.py    # Mission controller driving graph traversal
├── nodes/                   # Definitions for graph node types (FileNode, TaskNode, etc)
├── tests/                   # Pytest test suite for the backend
│   └── test_backend.py      # E2E health and integration tests for the API
└── utils/                   # Helper modules for parsing, security, and LLM access
    ├── code_quality.py      # AST-based complexity and maintainability metrics
    ├── github_api.py        # GitHub API helpers (e.g., contributor fetching)
    ├── github_tools.py      # OSV CVE scanning and dependency helpers
    ├── graph_builder.py     # AST dependency graph parser
    ├── llm_client.py        # Unified interface for Gemini, OpenAI, and Anthropic
    ├── rate_limiter.py      # In-memory IP-based rate limiting
    ├── repo_cloner.py       # Git repository cloning logic
    ├── repo_validate.py     # Input validation and SSRF protection for URLs
    ├── security_scanner.py  # Regex-based vulnerability heuristic scanner
    └── snapshot.py          # Session state persistence and JSON management
```

## Prerequisites

- Python 3.11+ (3.10 minimum)
- Git
- At least one API key (or none — heuristic mode works with zero keys)
- pip

## Local Setup

**Step 1 — Clone**
```bash
git clone <your-repo-url>
cd reposense
```

**Step 2 — Virtual environment**
```bash
# Mac/Linux
python3 -m venv .venv
source .venv/bin/activate

# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Step 3 — Install dependencies**
```bash
pip install -r requirements.txt
```

**Step 4 — Create .env**
Copy `.env.example` to `.env`:
```bash
cp .env.example .env   # Mac/Linux
copy .env.example .env # Windows
```
Edit `.env` and fill in at least `GITHUB_TOKEN` (free, needed for GitHub metadata). All LLM keys are optional — the system works without them using heuristic mode.

**Step 5 — Run**
```bash
python server.py
# Server starts at http://localhost:8000
```

**Step 6 — Verify**
In a new terminal (while the server is running), execute the health checker:
```bash
python check_local.py
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_TOKEN` | Yes (for metadata) | None | Authenticates with GitHub API. |
| `GEMINI_API_KEY` | Optional | None | API key for Google Gemini models. |
| `OPENAI_API_KEY` | Optional | None | API key for OpenAI models. |
| `ANTHROPIC_API_KEY` | Optional | None | API key for Anthropic models. |
| `PORT` | No | 8000 | The port on which the Flask server runs. |
| `LOW_COST_MODE` | No | false | When `true`, avoids heavy LLM usage in favor of heuristics. |
| `MAX_REPO_FILES` | No | 8000 | Maximum number of files to process per repository. |
| `CLONE_TIMEOUT_SEC` | No | 120 | Timeout duration for repository cloning. |
| `SESSION_MAX_AGE_HOURS` | No | 24 | Number of hours before sessions are purged. |
| `USE_LOCAL_MODELS` | No | false | Set to `true` to use local Ollama models. |
| `LOCAL_MODEL` | No | None | Local Ollama model identifier. |
| `OLLAMA_BASE_URL` | No | None | Base URL for the Ollama instance. |
| `FIX_AGENT_MODEL` | No | None | Specific model name for the FixAgent. |
| `EXPLANATION_AGENT_MODEL` | No | None | Specific model name for the ExplanationAgent. |
| `OPENAI_MODEL` | No | None | Override for OpenAI default model. |
| `GEMINI_MODEL` | No | None | Override for Gemini default model. |

## Running Without API Keys

RepoSense features a robust **Heuristic Mode** for cost-free operation. 

**What works:** repository cloning, dependency graph generation, regex security scanning, OSV CVE scanning, blast radius impact analysis, heuristic fallback summaries, template fix patches, SSE streaming, and all backend endpoints.

**What needs a key:** richer AI architectural summaries, and LLM-generated code diffs.

To enforce this mode, set `LOW_COST_MODE=true` in your `.env`.

## API Reference

| Method | Endpoint | Description | Request Body | Response |
|---|---|---|---|---|
| GET | `/health` | Live service health check | N/A | `{"status": "ok", ...}` |
| POST | `/analyze` | Starts repository analysis | `{"repo_url": "url"}` | `{"session_id": "sid", ...}` |
| GET | `/stream/<sid>` | SSE stream for real-time progress | N/A | Stream |
| GET | `/session/<sid>` | Gets full session state details | N/A | `{"status": "...", ...}` |
| GET | `/sessions` | Lists lightweight session metadata | N/A | `[{...}, ...]` |
| DELETE | `/session/<sid>` | Deletes session and artifacts | N/A | `{"deleted": true}` |
| POST | `/approve_fix` | Approves or rejects a suggested fix | `{"session_id": "sid", ...}`| `{"success": true}` |
| POST | `/query` / `/chat` | Conversational query over session | `{"session_id": "sid", ...}`| `{"answer": "..."}` |
| GET | `/export/<sid>` | Downloads JSON analysis report | N/A | JSON File Download |
| GET | `/report/<sid>` | Retrieves analysis as JSON payload| N/A | JSON Payload |
| GET | `/cve/<sid>` | Retrieves known CVEs in graph | N/A | `[{...}]` |
| POST | `/compare` | Starts parallel dual-repo analysis | `{"repos": ["url1", "url2"]}`| `{"comparison_id": "...", ...}` |
| GET | `/compare/result?a=&b=` | Side-by-side comparison summary| N/A | `{"a": {...}, "b": {...}}` |

## Example: Analyze a Repository (curl)

**a) Start analysis:**
```bash
curl -X POST http://localhost:8000/analyze \
     -H "Content-Type: application/json" \
     -d '{"repo_url": "https://github.com/pallets/flask"}'
```

**b) Poll session status:**
```bash
curl http://localhost:8000/session/<session_id>
```

**c) Stream live events (terminal):**
```bash
curl -N http://localhost:8000/stream/<session_id>
```

**d) Export report:**
```bash
curl http://localhost:8000/export/<session_id> -o report.json
```

## Agents

| Agent | Role | Uses LLM? | Key needed |
|---|---|---|---|
| **DependencyAgent** | Maps modules and builds the spatial dependency graph. | No | No |
| **SecurityAgent** | Scans for vulnerabilities (regex + OSV API) and marks Graph nodes. | No | No |
| **ImpactAgent** | Calculates graph propagation and blast radius. | No | No |
| **FixAgent** | Proposes code patches for detected vulnerabilities. | Yes | Yes (Optional) |
| **MonitorAgent** | Intercepts requests for human-in-the-loop approval. | No | No |
| **ExplanationAgent** | Synthesizes all findings into plain English architectural insights. | Yes | Yes (Optional) |

## Security Patterns Detected

The `security_scanner.py` applies heuristics to detect the following 9 critical risks:
- `hardcoded_secret`
- `eval_usage`
- `exec_usage`
- `subprocess_shell`
- `sql_injection`
- `pickle_load`
- `dangerous_import`
- `xss_risk`
- `open_redirect`
- `debug_mode`

## Troubleshooting

| Symptom | Fix |
|---|---|
| **"python not found"** | Use `python3` or `py -3.11`. |
| **"No module named flask"** | Activate venv, run `pip install -r requirements.txt`. |
| **"Clone failed"** | Repo must be public; check `GITHUB_TOKEN`. |
| **"No AI summaries"** | Set `GEMINI_API_KEY` or set `LOW_COST_MODE=true`. |
| **"Port already in use"** | Set `PORT=8001` in `.env`. |
| **SSE not streaming** | Access via `http://localhost:8000`, NOT `file://`. |
| **jaclang import error** | Run `pip install jaclang>=0.15` or set `USE_LOCAL_MODELS=false`. |

## Running Tests

```bash
pytest tests/test_backend.py -v
```

## Contributing

We follow conventional commit style (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`). Make one commit per logical change and ensure absolutely no secrets are committed in `.env`.

## License

MIT
