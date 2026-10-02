"""Clone GitHub repositories for analysis."""

import re
import subprocess
from pathlib import Path

from backend.config import CLONE_TIMEOUT_SEC, REPOS_DIR


def _repo_slug(url: str) -> str:
    url = url.rstrip("/").replace(".git", "")
    match = re.search(r"github\.com[:/]+([^/]+)/([^/]+)", url)
    if match:
        return f"{match.group(1)}_{match.group(2)}"
    return re.sub(r"[^\w\-]", "_", url)[-80:]


def clone_repo(repo_url: str, token: str | None = None) -> dict:
    """Clone repository into repos/ and return metadata."""
    slug = _repo_slug(repo_url)
    target = REPOS_DIR / slug

    if (target / ".git").exists():
        return {
            "success": True,
            "path": str(target),
            "slug": slug,
            "cached": True,
        }

    target.mkdir(parents=True, exist_ok=True)
    
    clone_url = repo_url
    if token:
        clean_url = repo_url.rstrip("/").removesuffix(".git")
        match = re.search(r"github\.com[:/]+([^/]+)/([^/]+)", clean_url)
        if match:
            owner, repo = match.group(1), match.group(2)
            clone_url = f"https://x-access-token:{token}@github.com/{owner}/{repo}.git"

    cmd = ["git", "clone", "--depth", "1", clone_url, str(target)]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=CLONE_TIMEOUT_SEC)

    if result.returncode != 0:
        err = result.stderr or result.stdout
        if token:
            err = err.replace(token, "[REDACTED]")
        return {
            "success": False,
            "error": err,
            "path": "",
            "slug": slug,
        }

    return {
        "success": True,
        "path": str(target),
        "slug": slug,
        "cached": False,
    }
