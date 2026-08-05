"""
RepoSense production API - Flask + SSE + static frontend.
JacCloud-ready: PORT env, CORS, real analysis via orchestrator.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
import uuid
from pathlib import Path

from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from backend.config import GITHUB_TOKEN, PORT
from backend.orchestrator import answer_query, resolve_approval, run_analysis
from backend.core import snapshot
from backend.github.repo_validate import validate_github_url
from backend.core.rate_limiter import allow_request
from backend.llm.provider_registry import registry

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("reposense")

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND = BASE_DIR / "frontend" / "dist"

app = Flask(__name__, static_folder=None)
CORS(app, resources={r"/*": {"origins": "*"}})


@app.errorhandler(Exception)
def handle_unexpected_error(exc):
    if isinstance(exc, HTTPException):
        response = exc.get_response()
        response.data = json.dumps({"error": exc.description, "status": exc.code})
        response.content_type = "application/json"
        return response

    log.exception("Unhandled server error")
    return jsonify({"error": "Internal server error", "status": 500}), 500


def _derive_phase(session: dict) -> str:
    status = (session.get("status") or "").lower()
    lifecycle = (session.get("lifecycle") or "").lower()
    progress = session.get("progress", 0) or 0

    if status == "completed":
        return "Finalizing report"
    if status == "failed":
        return "Execution interrupted"
    if lifecycle == "cloning":
        return "Cloning repository"
    if lifecycle == "analyzing" and progress < 55:
        return "Analyzing architecture"
    if lifecycle == "analyzing":
        return "Running AI agents"
    if lifecycle == "generating" and progress < 88:
        return "Generating recommendations"
    if lifecycle == "generating":
        return "Finalizing report"
    return "Preparing analysis"


def _active_agents(session: dict) -> list[dict]:
    active = []
    for name, data in (session.get("agents") or {}).items():
        state = data.get("state", "IDLE")
        if state in ("RUNNING", "THINKING", "WAITING"):
            active.append(
                {
                    "name": name,
                    "state": state,
                    "action": data.get("last_action", ""),
                }
            )
    return active


def _public_state(session: dict) -> dict:
    return {
        "status": session.get("status"),
        "lifecycle": session.get("lifecycle"),
        "progress": session.get("progress", 0),
        "phase": _derive_phase(session),
        "active_agents": _active_agents(session),
        "log_count": len(session.get("logs", [])),
        "agents": session.get("agents"),
        "github": session.get("github"),
        "contributors": session.get("contributors"),
        "summary": session.get("summary"),
        "graph": session.get("graph"),
        "findings": session.get("findings"),
        "fixes": session.get("fixes"),
        "approvals": session.get("approvals"),
        "impact": session.get("impact"),
        "code_quality": session.get("code_quality"),
        "maintainability": session.get("maintainability"),
        "structure": session.get("structure"),
        "architecture_graph": session.get("architecture_graph"),
        "recommendations": session.get("recommendations"),
        "readme": session.get("readme"),
        "created_at": session.get("created_at"),
        "updated_at": session.get("updated_at"),
    }


@app.route("/")
def index():
    return send_from_directory(FRONTEND, "index.html")


@app.route("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(FRONTEND / "assets", filename)


@app.route("/<path:filename>")
def serve_public(filename):
    return send_from_directory(FRONTEND, filename)


@app.route("/sessions")
@app.route("/sessions/")
def get_sessions():
    sessions = []
    for p in snapshot.OUTPUTS_DIR.glob("*_live.json"):
        sid = p.name.replace("_live.json", "")
        summary = snapshot.get_session_summary(sid)
        if summary:
            sessions.append(summary)
    return jsonify(sessions)


@app.route("/health")
def health():
    return jsonify({"status": "ok", "version": "1.0.0"})


@app.route("/health/providers")
def health_providers():
    return jsonify(registry.check_health())


@app.route("/analyze", methods=["POST"])
def analyze():
    allowed, msg = allow_request(request.remote_addr, max_requests=10, window_seconds=60)
    if not allowed:
        return jsonify({"error": msg}), 429

    body = request.get_json(force=True, silent=True) or {}
    repo_url = (body.get("repo_url") or "").strip()
    mode = body.get("execution_mode", "autonomous")

    ok, err, normalized = validate_github_url(repo_url)
    if not ok:
        return jsonify({"error": err}), 400

    session_id = str(uuid.uuid4())[:8]
    snapshot.init_session(session_id, normalized, mode)
    log.info("Analysis started session=%s repo=%s", session_id, normalized)

    threading.Thread(
        target=run_analysis,
        args=(session_id, normalized, mode),
        daemon=True,
    ).start()

    return jsonify({"session_id": session_id, "status": "queued"}), 202


@app.route("/compare", methods=["POST"])
def compare_repos():
    body = request.get_json(force=True, silent=True) or {}
    urls = body.get("repos", [])
    if not isinstance(urls, list) or len(urls) != 2:
        return jsonify({"error": "Provide exactly 2 repo URLs in 'repos' array"}), 400

    results = []
    for url in urls:
        ok, err, normalized = validate_github_url(url)
        if not ok:
            return jsonify({"error": f"Invalid URL '{url}': {err}"}), 400
        results.append(normalized)

    # Start two analysis sessions in parallel
    session_ids = []
    for normalized in results:
        sid = str(uuid.uuid4())[:8]
        snapshot.init_session(sid, normalized, "autonomous")
        threading.Thread(target=run_analysis, args=(sid, normalized, "autonomous"), daemon=True).start()
        session_ids.append(sid)

    return jsonify({
        "comparison_id": str(uuid.uuid4())[:8],
        "session_ids": session_ids,
        "repos": results,
        "status": "both_queued"
    }), 202


@app.route("/compare/result")
def compare_result():
    sid_a = request.args.get("a")
    sid_b = request.args.get("b")
    if not sid_a or not sid_b:
        return jsonify({"error": "Provide ?a=<session_id>&b=<session_id>"}), 400

    def _summary(sid):
        s = snapshot.get_session(sid)
        if not s:
            return {"error": "session not found"}
        return {
            "repo": s.get("github", {}).get("full_name", s.get("repo_url")),
            "status": s.get("status"),
            "findings_count": len(s.get("findings", [])),
            "quality_grade": s.get("code_quality", {}).get("grade"),
            "quality_score": s.get("code_quality", {}).get("score"),
            "maintainability_grade": s.get("maintainability", {}).get("grade"),
            "node_count": (s.get("graph") or {}).get("nodes") and len(s["graph"]["nodes"]),
            "recommendations": (s.get("recommendations") or [])[:3],
        }

    return jsonify({
        "a": _summary(sid_a),
        "b": _summary(sid_b),
    })


@app.route("/session/<session_id>")
def get_session_route(session_id):
    session = snapshot.get_session(session_id)
    if not session:
        return jsonify({"error": "session not found"}), 404
    payload = dict(session)
    payload["phase"] = _derive_phase(session)
    payload["active_agents"] = _active_agents(session)
    payload["log_count"] = len(session.get("logs", []))
    return jsonify(payload)


@app.route("/stream/<session_id>")
def stream(session_id):
    try:
        start_from_log = max(0, int(request.args.get("from_log", "0")))
    except ValueError:
        start_from_log = 0

    def generate():
        last_logs = start_from_log
        idle = 0
        max_idle = 1200

        yield "retry: 2000\n\n"

        try:
            while idle < max_idle:
                session = snapshot.get_session(session_id)
                if not session:
                    yield f"data: {json.dumps({'type': 'error', 'data': {'message': 'session not found'}})}\n\n"
                    return

                logs = session.get("logs", [])
                if len(logs) > last_logs:
                    for entry in logs[last_logs:]:
                        yield f"data: {json.dumps({'type': 'log', 'data': entry})}\n\n"
                    last_logs = len(logs)
                    idle = 0

                yield f"data: {json.dumps({'type': 'state', 'data': _public_state(session)})}\n\n"

                if session.get("status") in ("completed", "failed"):
                    yield f"data: {json.dumps({'type': 'done', 'data': {'status': session['status']}})}\n\n"
                    return

                idle += 1
                yield ": keep-alive\n\n"
                time.sleep(0.5)
        except GeneratorExit:
            pass

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.route("/approve", methods=["POST"])
@app.route("/approve_fix", methods=["POST"])
def approve_fix():
    body = request.get_json(force=True, silent=True) or {}
    sid = body.get("session_id")
    aid = body.get("approval_id")
    approved = bool(body.get("approved", False))
    result = resolve_approval(sid, aid, approved)
    if result.get("error"):
        return jsonify(result), 404
    return jsonify(result)


@app.route("/query", methods=["POST"])
@app.route("/chat", methods=["POST"])
def chat():
    body = request.get_json(force=True, silent=True) or {}
    sid = body.get("session_id")
    q = body.get("query") or body.get("message") or ""
    model = body.get("model") or None
    if not q.strip():
        return jsonify({"error": "query required"}), 400
    answer = answer_query(sid, q.strip(), model)
    return jsonify({"answer": answer})


@app.route("/models")
def models_route():
    """Expose OpenRouter model catalog to the frontend."""
    from backend.llm.client import list_available_models
    return jsonify(list_available_models())


@app.route("/cve/<session_id>")
def get_cve_route(session_id):
    session = snapshot.get_session(session_id)
    if not session:
        return jsonify([])
    return jsonify(session.get("cve_findings", []))


@app.route("/export/<session_id>")
def export_session(session_id):
    session = snapshot.export_report(session_id)
    if not session:
        return jsonify({"error": "session not found"}), 404
    filename = f"reposense_{session_id}.json"
    response = Response(
        json.dumps(session, indent=2),
        mimetype="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
    return response


@app.route("/report/<session_id>")
def report_session(session_id):
    session = snapshot.export_report(session_id)
    if not session:
        return jsonify({"error": "session not found"}), 404
    return jsonify(session)


@app.route("/session/<session_id>", methods=["DELETE"])
def delete_session_route(session_id):
    if not snapshot.get_session(session_id):
        return jsonify({"error": "session not found"}), 404
    snapshot.delete_session(session_id)
    return jsonify({"deleted": True})


import atexit
from backend.core import snapshot as _snap

def _startup_cleanup():
    n = _snap.cleanup_old_sessions()
    if n:
        log.info("Cleaned up %d stale session files", n)

threading.Thread(target=_startup_cleanup, daemon=True).start()


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = PORT
    log.info("RepoSense listening on http://%s:%s", host, port)
    app.run(host=host, port=port, threaded=True, debug=False)
