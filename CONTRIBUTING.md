# Contributing to Argus

Thanks for helping build Argus, the open-source AI repository analyst. Whether you fix a typo, write a test or ship a new analyzer, this guide gets you from "I found an issue" to "my PR is merged".

By taking part you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

**Contents:**
[Nexus Spring of Code](#nexus-spring-of-code-nsoc26) ·
[Ways to contribute](#ways-to-contribute) ·
[Local setup](#local-setup) ·
[Project structure](#project-structure) ·
[Workflow](#development-workflow) ·
[Coding guidelines](#coding-guidelines) ·
[Testing](#testing) ·
[Recipes](#recipes) ·
[PR checklist](#pull-request-checklist) ·
[Getting help](#getting-help)

---

## Nexus Spring of Code (NSoC'26)

Argus is a participating project in **Nexus Spring of Code 2026**. Issues that count for the program carry the `NSoC'26` label plus exactly one difficulty label:

| Label | Difficulty | What it usually means |
|---|---|---|
| `level1` | Beginner | One or two files: docs, lint fixes, small UI tweaks, simple tests. Great first contribution. |
| `level2` | Intermediate | A focused feature or refactor across several files. Needs reading some existing code and adding tests. |
| `level3` | Advanced | A new capability or architectural change touching backend and/or frontend. Share your plan in the issue before coding. |

Points for each level follow the official NSoC scoring rules. Maintainers set the level; if you think an issue is mislabelled, say so in the issue.

### How to pick up an issue

1. **Find an issue** labelled `NSoC'26` that is not assigned to anyone ([open NSoC issues](https://github.com/Atharvchaskar008/Argus/issues?q=is%3Aissue+is%3Aopen+label%3A%22NSoC%2726%22+no%3Aassignee)).
2. **Comment** that you want to work on it, with two or three lines on how you plan to solve it.
3. **Wait to be assigned.** PRs for issues that are not assigned to you may be closed.
4. **Fork, branch, code**, following the [workflow](#development-workflow) below.
5. **Open a PR** that says `Closes #<issue-number>` and fill in the PR template.

### Fair-play rules

- Hold **at most two** assigned issues at a time. Finish one before claiming another.
- If there is **no PR or progress update within 7 days**, the issue may be reassigned.
- Have an idea that isn't in the tracker? Open an issue with a template first. Maintainers will triage it and add a level, and then it counts.
- PRs must be your own work and must actually address the issue. Bulk cosmetic changes, auto-generated filler or splitting one change into many PRs to farm points will be closed.
- Be patient with reviews and kind in discussions. Maintainers are volunteers.

---

## Ways to contribute

- **Code:** analyzers, agents, API endpoints, UI components.
- **Tests:** the backend has a small smoke suite; analyzer unit tests are very welcome.
- **Docs:** setup guides, architecture docs, API reference, code comments.
- **Design and UX:** accessibility, responsive layout, dark mode.
- **Bug reports and triage:** reproduce reported bugs and add details.

---

## Local setup

### Prerequisites

- Python **3.10+**
- Node.js **20.19+** (Node 22 LTS recommended) and npm
- Git (Argus shells out to git to clone the repositories it analyses)

### 1. Fork and clone

```bash
git clone https://github.com/<your-username>/Argus.git
cd Argus
git remote add upstream https://github.com/Atharvchaskar008/Argus.git
```

### 2. Backend (Flask API on port 8000)

```bash
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows (PowerShell):
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env        # every key is optional for local development
python -m backend.server    # http://localhost:8000/health -> {"status": "ok"}
```

> **No API keys? No problem.** Without an LLM key Argus switches to heuristics-only mode automatically. Cloning, AST parsing, the dependency graph, blast-radius analysis, heuristic security rules and OSV CVE lookups all still work. LLM-backed features (architecture narrative, repository Q&A, AI fix suggestions) need an `OPENROUTER_API_KEY` in `.env`. For zero-cost development, set `OPENROUTER_DEFAULT_MODEL` to an OpenRouter model whose id ends in `:free`.

### 3. Frontend (Vite dev server on port 5173)

```bash
cd frontend
npm ci
npm run dev                 # http://localhost:5173 (talks to the API on :8000)
```

### 4. Or run everything in Docker

```bash
docker build -t argus .
docker run --rm -p 8000:8000 --env-file .env argus   # UI + API on http://localhost:8000
```

---

## Project structure

```text
Argus/
├── backend/
│   ├── server.py            # Flask app: REST + SSE endpoints, serves frontend/dist
│   ├── orchestrator.py      # Runs an analysis session end to end
│   ├── config.py            # All env-driven settings
│   ├── agents/              # LangGraph workflow, mission engine, graph memory
│   ├── analyzers/           # Parser, security scanner, architecture, quality, README analysis
│   ├── core/                # Dependency graph, recommendations, session snapshots, rate limiter
│   ├── github/              # URL validation, cloning, GitHub API, OSV lookups
│   └── llm/                 # Provider client (OpenRouter and others), fixer, guardrails
├── frontend/
│   └── src/
│       ├── components/      # Landing page, workspace, diagrams, Q&A, activity feed
│       ├── context/         # RepoContext (analysis session), AuthContext (GitHub OAuth)
│       └── lib/api.js       # API base URL; use apiUrl('/path') for every request
├── tests/                   # pytest suite and a local health checker
├── docs/                    # API reference, agent flow, LLM setup
├── Dockerfile, render.yaml  # Deployment
└── .env.example             # Every supported environment variable
```

**Where should my change go?**

| I want to… | Look at |
|---|---|
| Detect a new insecure code pattern | `backend/analyzers/security_scanner.py` |
| Parse a new language or extract more symbols | `backend/analyzers/parser.py`, `backend/core/graph_builder.py` |
| Change the analysis pipeline or agent order | `backend/agents/workflow.py`, `backend/orchestrator.py` |
| Add or change an endpoint | `backend/server.py` (and `docs/API_REFERENCE.md`) |
| Tune LLM prompts or providers | `backend/llm/client.py`, `backend/llm/provider_registry.py` |
| Change the UI | `frontend/src/components/*` |

---

## Development workflow

1. **Sync your fork** before starting:
   ```bash
   git checkout main
   git fetch upstream
   git merge --ff-only upstream/main
   git push origin main
   ```
2. **Create a branch** named after the issue:
   `feat/42-gitlab-support`, `fix/17-mermaid-render`, `docs/8-api-reference`, `test/23-scanner-tests`.
3. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```text
   feat(scanner): detect yaml.load without SafeLoader
   fix(ui): keep navbar usable below 768px
   docs: document /models endpoint
   ```
   Types we use: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `style`, `ci`, `chore`.
4. **Push** and open a PR against `Atharvchaskar008/Argus:main`. Keep PRs focused on one issue.
5. **Respond to review.** Push follow-up commits to the same branch; there's no need to open a new PR.

---

## Coding guidelines

### Python (backend)

- Follow PEP 8 with 4-space indentation and use type hints on new functions.
- Log with `logging.getLogger("argus.<module>")`, not `print`.
- Keep analyzers **pure**: take a path or data in and return JSON-serialisable dicts or lists. Agents and the orchestrator own the state.
- Read every setting from `backend/config.py`. Never read `os.environ` directly in feature code, and never hard-code secrets.
- New dependencies need a short justification in the PR description.

### JavaScript/React (frontend)

- Use function components and hooks.
- Call the backend only through `apiUrl()` from `src/lib/api.js`. Never hard-code `http://localhost:8000`.
- Match the existing visual language: black and white, 1px borders, generous spacing, `lucide-react` icons.
- Run `npx eslint .` and don't add new warnings. The existing ones are tracked as issues.

---

## Testing

```bash
# Backend
python -m pytest tests/ -q

# Frontend
cd frontend
npm run build
npx eslint .
```

- Backend logic changes need a test in `tests/`. Use the Flask test client (see `tests/test_backend.py`) for endpoints and small fixture files for analyzers.
- For UI changes, add before/after screenshots to the PR.
- For a manual end-to-end check, analyse a small public repository such as `https://github.com/pallets/itsdangerous`.

CI runs all of the above on every pull request.

---

## Recipes

### Add a security rule

Rules live in the `PATTERNS` list in `backend/analyzers/security_scanner.py`. Each rule is a tuple:

```python
(
    "yaml_unsafe_load",                          # rule id (snake_case, unique)
    "medium",                                    # severity: low | medium | high
    re.compile(r"yaml\.load\s*\((?![^)]*SafeLoader)"),
    "yaml.load without SafeLoader",              # title shown in the UI
    "Use yaml.safe_load() or pass Loader=yaml.SafeLoader.",  # recommendation
),
```

Optionally add a diff-style hint to `FIX_TEMPLATES[rule_id]`. Add a test with one snippet that **should** match and one that **should not**, to guard against false positives.

### Add an API endpoint

1. Add the route to `backend/server.py` and return `jsonify(...)` with the correct status codes.
2. Add a test with the Flask test client in `tests/test_backend.py`.
3. Document it in `docs/API_REFERENCE.md`.
4. Call it from the UI with `fetch(apiUrl('/your-endpoint'))`.

---

## Pull request checklist

- [ ] The PR links its issue (`Closes #123`) and the issue is assigned to me
- [ ] `python -m pytest tests/ -q` passes
- [ ] `npm run build` passes and `npx eslint .` reports no new problems
- [ ] Tests are added or updated for backend changes
- [ ] Screenshots are attached for UI changes
- [ ] Docs are updated if behaviour, configuration or endpoints changed
- [ ] No secrets, `.env` files, `node_modules` or build output are committed

---

## Getting help

- Ask in the issue you're working on. That's the fastest way to reach a maintainer.
- Found a bug? Open a [bug report](https://github.com/Atharvchaskar008/Argus/issues/new/choose).
- Security issue? Follow [SECURITY.md](SECURITY.md) and don't post it publicly.

Maintainers: [@Atharvchaskar008](https://github.com/Atharvchaskar008) · [@prathamesh-lang](https://github.com/prathamesh-lang)
