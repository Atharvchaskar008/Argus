"""GitHub URL validation and repository safety checks."""

import re
from pathlib import Path

BLOCKED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "internal", "169.254.169.254"}

def validate_github_url(url: str) -> tuple[bool, str, str]:
    """Returns (is_valid, error_message, normalized_url)."""
    if not url:
        return False, "repo_url is required", ""
    url = url.strip().rstrip("/")
    # Must be github.com
    if "github.com" not in url.lower():
        return False, "Only GitHub repositories are supported", ""
    # Block SSRF-prone patterns
    for host in BLOCKED_HOSTS:
        if host in url.lower():
            return False, "Invalid repository URL", ""
    # Normalize: strip trailing .git
    url = re.sub(r"\.git$", "", url, flags=re.IGNORECASE)
    # Must match github.com/owner/repo
    m = re.search(r"github\.com/([a-zA-Z0-9_.\-]+)/([a-zA-Z0-9_.\-]+)", url)
    if not m:
        return False, "URL must be in format: https://github.com/owner/repo", ""
    normalized = f"https://github.com/{m.group(1)}/{m.group(2)}"
    return True, "", normalized


def check_repo_size(repo_path: str, max_files: int) -> tuple[bool, str]:
    """Prevent analyzing extremely large trees."""
    root = Path(repo_path).resolve()
    count = 0
    skip = {".git", "__pycache__", "node_modules", ".venv", "venv"}
    for p in root.rglob("*"):
        if any(part in skip for part in p.parts):
            continue
        if p.is_file():
            count += 1
            if count > max_files:
                return False, f"Repository exceeds {max_files} files limit"
    return True, ""
