#!/usr/bin/env python3
"""
RepoSense local health checker.
Run AFTER starting the server:  python server.py
Then in another terminal:        python check_local.py
"""

import json
import sys
import time
import urllib.request
import urllib.error

BASE = "http://localhost:8000"
PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
WARN = "\033[93m~\033[0m"

failures = 0

def check(label, url, method="GET", body=None, expect_status=200, critical=True):
    global failures
    try:
        data = json.dumps(body).encode() if body else None
        req = urllib.request.Request(url, data=data,
              headers={"Content-Type": "application/json"} if data else {},
              method=method)
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            content = resp.read().decode()
        ok = status == expect_status
        icon = PASS if ok else FAIL
        print(f"  {icon}  [{status}] {label}")
        if not ok and critical:
            failures += 1
        return content
    except urllib.error.HTTPError as e:
        ok = e.code == expect_status
        icon = PASS if ok else FAIL
        print(f"  {icon}  [{e.code}] {label}")
        if not ok and critical:
            failures += 1
        return ""
    except Exception as exc:
        print(f"  {FAIL}  [ERR] {label}  →  {exc}")
        if critical:
            failures += 1
        return ""

print("\n🔍 RepoSense Local Health Check")
print(f"   Target: {BASE}\n")

print("── Core routes ──")
check("GET /              (frontend HTML)",   f"{BASE}/")
resp = check("GET /health          (service ok)",   f"{BASE}/health")
if resp:
    h = json.loads(resp)
    print(f"       gemini={h.get('gemini')} openai={h.get('openai')} anthropic={h.get('anthropic')} github_token={h.get('github_token')}")

print("\n── Session management ──")
check("GET /sessions      (list sessions)",  f"{BASE}/sessions")

print("\n── Analysis trigger ──")
resp = check("POST /analyze      (bad url → 400)", f"{BASE}/analyze",
             method="POST", body={"repo_url": "https://notgithub.com/x"}, expect_status=400)
resp = check("POST /analyze      (missing url → 400)", f"{BASE}/analyze",
             method="POST", body={}, expect_status=400)
resp = check("POST /analyze      (valid url → 202)", f"{BASE}/analyze",
             method="POST",
             body={"repo_url": "https://github.com/pallets/flask"},
             expect_status=202)

session_id = ""
if resp:
    try:
        session_id = json.loads(resp).get("session_id", "")
        print(f"       session_id={session_id}")
    except Exception:
        pass

print("\n── Session endpoints ──")
if session_id:
    check(f"GET /session/<sid>  (session state)",   f"{BASE}/session/{session_id}")
    check(f"GET /cve/<sid>      (cve findings)",     f"{BASE}/cve/{session_id}")
    print(f"  {WARN}  Waiting 3s before checking stream...")
    time.sleep(3)
    check(f"GET /export/<sid>   (report download)",  f"{BASE}/export/{session_id}")
else:
    print(f"  {WARN}  Skipping session-dependent checks (no session_id)")

check("GET /session/fakeid  (404 expected)",  f"{BASE}/session/fakeid000", expect_status=404)
check("GET /export/fakeid   (404 expected)",  f"{BASE}/export/fakeid000",  expect_status=404)

print("\n── Chat / query ──")
check("POST /query  (missing query → 400)", f"{BASE}/query",
      method="POST", body={"session_id": "x"}, expect_status=400)

print("\n── Compare endpoint ──")
check("POST /compare (wrong count → 400)", f"{BASE}/compare",
      method="POST", body={"repos": ["https://github.com/pallets/flask"]}, expect_status=400)

print("\n── Static assets ──")
check("GET /style.css",   f"{BASE}/style.css")
check("GET /app.js",      f"{BASE}/app.js")

print("\n── Rate limiting ──")
print(f"  {WARN}  Sending 11 rapid /analyze requests to test rate limit...")
last_status = None
for i in range(11):
    try:
        req = urllib.request.Request(f"{BASE}/analyze",
              data=json.dumps({"repo_url": "https://github.com/pallets/flask"}).encode(),
              headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=5) as r:
            last_status = r.status
    except urllib.error.HTTPError as e:
        last_status = e.code
rate_ok = last_status == 429
print(f"  {'✓' if rate_ok else '~'}  Rate limit hit on request 11: {last_status} {'(expected 429)' if rate_ok else '(not enforced yet — ok)'}")

print(f"\n{'─'*40}")
if failures == 0:
    print(f"✅  All critical checks passed. RepoSense is running correctly.\n")
    sys.exit(0)
else:
    print(f"❌  {failures} critical check(s) failed. See output above.\n")
    sys.exit(1)
