# Security Policy

Argus clones and analyses third-party code and handles GitHub OAuth tokens and LLM API keys, so we take security reports seriously.

## Supported versions

Security fixes land on the latest `main` branch and the hosted demo. Older commits are not patched.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through GitHub: **Security → Report a vulnerability**
(<https://github.com/Atharvchaskar008/Argus/security/advisories/new>).

A useful report includes:

- the affected component or endpoint (for example `POST /analyze`, the OAuth callback, the Docker image);
- step-by-step reproduction, ideally with a minimal repository URL or request payload;
- the impact you were able to demonstrate;
- a suggested fix, if you have one.

The maintainers will acknowledge the report, keep you updated while a fix is prepared, and credit you in the advisory unless you ask to stay anonymous.

## Scope

**In scope**

- Server-side request forgery or local file access through repository URLs (`backend/github/repo_validate.py`, `backend/github/repo_cloner.py`)
- Path traversal or code execution while cloning or parsing analysed repositories
- Leakage of GitHub OAuth tokens, session secrets or LLM API keys
- Cross-site scripting through rendered Markdown, Mermaid diagrams or repository content
- Prompt injection from an analysed repository that makes Argus produce harmful fix suggestions without the approval step
- Insecure defaults in `Dockerfile` or `render.yaml`

**Out of scope**

- Vulnerabilities inside repositories that Argus analyses (finding those is Argus' job)
- Denial of service or rate-limit exhaustion against the free demo instance
- Missing security headers or best-practice findings without a demonstrated impact

## Secrets hygiene for contributors

- Never commit `.env`; copy `.env.example` and keep real keys local.
- If a key is pushed by accident, revoke it immediately at the provider, then tell a maintainer. Rewriting git history alone does not make a leaked key safe.
