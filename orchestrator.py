"""
RepoSense analysis orchestrator.

Coordinates real repository analysis, GitHub API, and LLM insights.
Delegates heavy lifting to stateless utils; persists state via snapshot.
"""

from __future__ import annotations

import json
import uuid
import threading

from config import AGENT_IDS, MAX_REPO_FILES
from utils import snapshot
from utils.code_quality import analyze_code_quality
from utils.github_api import fetch_contributors, fetch_full_github_intel
from utils.graph_builder import build_dependency_graph, impact_analysis
from utils.llm_client import chat as llm_chat
from utils.llm_client import generate as llm_generate
from utils.llm_fixer import generate_fix
from utils.maintainability import analyze_folder_structure, analyze_maintainability
from utils.parser import scan_repo
from utils.readme_analyzer import analyze_readme
from utils.recommendations import build_recommendations
from utils.repo_cloner import clone_repo
from utils.repo_validate import check_repo_size, validate_github_url
from utils.security_scanner import scan_repository
from graph.workflow import app as workflow_app


def run_analysis(session_id: str, repo_url: str, execution_mode: str = "autonomous") -> None:
    """Full analysis pipeline with lifecycle statuses, powered by LangGraph."""
    try:
        ok, err, normalized = validate_github_url(repo_url)
        if not ok:
            snapshot.emit_log(session_id, err, "error", "MonitorAgent")
            snapshot.finalize_session(session_id, "failed")
            return
        repo_url = normalized or repo_url

        # Initial Agent States setup in snapshot
        for name in AGENT_IDS:
            snapshot.emit_agent(session_id, name, "IDLE", "Standing by")
        snapshot.emit_log(session_id, "Mission control online - analysis queued", agent="MonitorAgent")
        snapshot.emit_agent(session_id, "MonitorAgent", "RUNNING", "Orchestrating pipeline")
        snapshot.set_lifecycle(session_id, "analyzing", 8)

        # Initial AgentState for LangGraph
        initial_state = {
            "session_id": session_id,
            "repo_url": repo_url,
            "execution_mode": execution_mode,
            "repo_path": "",
            "files": [],
            "findings": [],
            "cve_findings": [],
            "impact": {},
            "summary": {},
            "readme": {},
            "code_quality": {},
            "maintainability": {},
            "structure": {},
            "fixes": [],
            "approvals": [],
            "agent_states": {},
            "progress": 8,
            "status": "analyzing",
            "graph_nodes": [],
            "graph_edges": [],
            "github": {},
            "contributors": [],
            "error": "",
        }

        config = {"configurable": {"thread_id": session_id}}
        
        # Invoke LangGraph workflow
        final_state = workflow_app.invoke(initial_state, config)
        
        # If in autonomous mode (or no pending approvals), resume to finalize
        if execution_mode != "approval" or not any(a.get("status") == "pending" for a in final_state.get("approvals", [])):
            final_state = workflow_app.invoke(None, config)

        if final_state.get("status") == "failed":
            snapshot.finalize_session(session_id, "failed")

    except Exception as exc:
        import traceback
        snapshot.emit_log(session_id, f"Fatal orchestration error: {exc}", "error", "MonitorAgent")
        snapshot.emit_log(session_id, traceback.format_exc()[-500:], "error", "MonitorAgent")
        snapshot.finalize_session(session_id, "failed")


def answer_query(session_id: str, query: str, model: str | None = None) -> str:
    session = snapshot.get_session(session_id)
    if not session:
        return "No active analysis session."
    ctx = json.dumps(
        {
            "repo": session.get("github", {}).get("full_name"),
            "summary": session.get("summary", {}),
            "findings": session.get("findings", [])[:5],
            "impact": session.get("impact", {}),
            "recommendations": session.get("recommendations", []),
        }
    )
    text, _ = llm_chat(ctx, query, model=model)
    return text


def resolve_approval(session_id: str, approval_id: str, approved: bool) -> dict:
    config = {"configurable": {"thread_id": session_id}}
    state = workflow_app.get_state(config)
    if state and state.values:
        approvals = list(state.values.get("approvals", []))
        found_approval = None
        for approval in approvals:
            if approval.get("id") == approval_id:
                approval["approved"] = approved
                approval["status"] = "approved" if approved else "rejected"
                found_approval = approval
                break
        
        if found_approval:
            # Update state in LangGraph
            workflow_app.update_state(config, {"approvals": approvals}, as_node="fix_agent")
            
            # Log approval updates to snapshot JSON file immediately for the frontend
            snapshot.merge_session(session_id, {"approvals": approvals})
            snapshot.emit_log(
                session_id,
                f"Supervisor {'approved' if approved else 'rejected'} fix for {found_approval.get('file')}",
                "approval" if approved else "warn",
                "FixAgent",
            )
            snapshot.emit_agent(session_id, "FixAgent", "COMPLETED", "Patch approved" if approved else "Rejected")
            
            # Resume LangGraph thread to run the finalize_node in background
            threading.Thread(
                target=workflow_app.invoke,
                args=(None, config),
                daemon=True
            ).start()
            
            return {"success": True, "approval": found_approval}
            
    # Fallback in case LangGraph session state isn't found/initialized
    session = snapshot.get_session(session_id)
    if not session:
        return {"error": "session not found"}
    for approval in session.get("approvals", []):
        if approval.get("id") == approval_id:
            approval["approved"] = approved
            approval["status"] = "approved" if approved else "rejected"
            snapshot.merge_session(session_id, {"approvals": session["approvals"]})
            snapshot.emit_log(
                session_id,
                f"Supervisor {'approved' if approved else 'rejected'} fix for {approval.get('file')}",
                "approval" if approved else "warn",
                "FixAgent",
            )
            snapshot.emit_agent(session_id, "FixAgent", "COMPLETED", "Patch approved" if approved else "Rejected")
            return {"success": True, "approval": approval}
    return {"error": "approval not found"}

