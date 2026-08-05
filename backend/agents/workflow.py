"""
LangGraph agent workflow engine for RepoSense.

Replaces simulated Jac OSP runtime with stateful StateGraph orchestration.
"""

from __future__ import annotations

import uuid
import logging
from typing import TypedDict, Dict, List, Any

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from backend.config import AGENT_IDS, MAX_REPO_FILES
from backend.core import snapshot
from backend.analyzers.code_quality import analyze_code_quality
from backend.github.api import fetch_contributors, fetch_full_github_intel
from backend.core.graph_builder import build_dependency_graph, impact_analysis
from backend.llm.fixer import generate_fix
from backend.analyzers.maintainability import analyze_folder_structure, analyze_maintainability
from backend.analyzers.parser import scan_repo
from backend.analyzers.readme_analyzer import analyze_readme
from backend.core.recommendations import build_recommendations
from backend.github.repo_cloner import clone_repo
from backend.github.repo_validate import check_repo_size, validate_github_url
from backend.analyzers.security_scanner import scan_repository
from backend.github.tools import scan_dependencies_for_cves
from backend.analyzers.summarizer import _detect_stack, heuristic_summary
from backend.llm.client import generate as llm_generate

log = logging.getLogger("reposense.workflow")


class AgentState(TypedDict):
    session_id: str
    repo_url: str
    execution_mode: str
    repo_path: str
    files: List[Dict[str, Any]]
    findings: List[Dict[str, Any]]
    cve_findings: List[Dict[str, Any]]
    impact: Dict[str, Any]
    summary: Dict[str, Any]
    readme: Dict[str, Any]
    code_quality: Dict[str, Any]
    maintainability: Dict[str, Any]
    structure: Dict[str, Any]
    fixes: List[Dict[str, Any]]
    approvals: List[Dict[str, Any]]
    agent_states: Dict[str, Dict[str, str]]
    progress: int
    status: str
    graph_nodes: List[Dict[str, Any]]
    graph_edges: List[Dict[str, Any]]
    github: Dict[str, Any]
    contributors: List[Dict[str, Any]]
    error: str


# Helper functions to log and update snapshot
def _log(state: AgentState, msg: str, level: str = "info", agent: str = "") -> None:
    snapshot.emit_log(state["session_id"], msg, level, agent)


def _agent(state: AgentState, name: str, state_val: str, action: str = "") -> None:
    snapshot.emit_agent(state["session_id"], name, state_val, action)
    state["agent_states"][name] = {"name": name, "state": state_val, "last_action": action}


def _push_snapshot(state: AgentState, extra: Dict[str, Any] | None = None) -> None:
    agents = {
        name: {
            "name": name,
            "state": state["agent_states"].get(name, {}).get("state", "IDLE"),
            "last_action": state["agent_states"].get(name, {}).get("last_action", ""),
        }
        for name in AGENT_IDS
    }
    
    patch: Dict[str, Any] = {
        "agents": agents,
        "graph": {
            "nodes": state["graph_nodes"],
            "edges": state["graph_edges"],
        },
        "progress": state["progress"],
        "status": state["status"],
    }
    if extra:
        patch.update(extra)
    snapshot.merge_session(state["session_id"], patch)


def _ensure_summary_shape(
    summary: dict,
    recommendations: list,
    findings: list,
    maintainability: dict,
    code_quality: dict,
    metrics: dict,
) -> dict:
    safe = dict(summary or {})
    technologies = safe.get("technologies") or ["Unknown"]
    architecture = safe.get("architecture") or "Architecture overview unavailable."
    purpose = safe.get("purpose") or "Repository analysis completed with fallback data."
    complexity = safe.get("complexity") or "Unknown"

    def complexity_score(level: str, count: int) -> int:
        base = {"Low": 35, "Medium": 65, "High": 85}.get(level, 50)
        return min(100, max(10, base + min(count // 10, 10)))

    def security_insights(f_list: list) -> list[str]:
        if not f_list:
            return ["No critical patterns detected by heuristic scan."]
        insights = []
        for finding in f_list[:3]:
            insights.append(
                f"{finding.get('severity', 'info').title()}: {finding.get('title', 'Issue found')} "
                f"at {finding.get('file', 'unknown file')}:{finding.get('line', '?')}"
            )
        return insights

    safe.setdefault("repo_type", "General Software Project")
    safe["technologies"] = technologies
    safe["purpose"] = purpose
    safe["architecture"] = architecture
    safe["complexity"] = complexity
    safe["complexity_score"] = complexity_score(complexity, metrics.get("node_count", 0))
    safe["repository_summary"] = purpose
    safe["tech_stack"] = technologies
    safe["architecture_overview"] = architecture
    safe["security_insights"] = security_insights(findings)
    safe["maintainability_analysis"] = (maintainability.get("insights") or []) or [
        "Maintainability insights unavailable."
    ]
    safe["quality_score"] = code_quality.get("score", 0)
    safe["recommendations_preview"] = recommendations[:3]
    safe.setdefault("risk_level", "Low")
    safe.setdefault("risk_summary", "No critical patterns detected by heuristic scan.")
    safe.setdefault("source", "heuristic")
    return safe


# Node Implementations

def dependency_agent_node(state: AgentState) -> AgentState:
    session_id = state["session_id"]
    repo_url = state["repo_url"]

    _agent(state, "MonitorAgent", "RUNNING", "Orchestrating pipeline")
    _agent(state, "DependencyAgent", "RUNNING", "Fetching GitHub metadata")
    _log(state, "Fetching repository metadata from GitHub API", agent="DependencyAgent")

    # Fetch GitHub Metadata
    github = fetch_full_github_intel(repo_url)
    state["github"] = github
    state["contributors"] = github.get("contributors", [])
    
    contributors = fetch_contributors(repo_url)
    state["contributors"] = contributors
    if contributors:
        _log(state, f"Top contributor: {contributors[0]['login']} ({contributors[0]['contributions']} commits)", agent="DependencyAgent")
    if github.get("error"):
        _log(state, f"GitHub API warning: {github['error']}", "warn", "DependencyAgent")
    else:
        _log(
            state,
            f"Repository {github.get('full_name')} - {github.get('stars', 0)} stars, {github.get('forks', 0)} forks",
            agent="DependencyAgent",
        )

    # Repository Cloner
    snapshot.set_lifecycle(session_id, "cloning", 18)
    state["progress"] = 18
    _log(state, "Cloning repository...", agent="DependencyAgent")
    clone = clone_repo(repo_url)
    if not clone["success"]:
        _agent(state, "DependencyAgent", "FAILED", "Clone failed")
        _log(state, f"Clone failed: {clone.get('error', 'unknown')}", "error", "DependencyAgent")
        state["status"] = "failed"
        state["error"] = f"Clone failed: {clone.get('error', 'unknown')}"
        _push_snapshot(state, {"github": github, "contributors": contributors})
        return state

    repo_path = clone["path"]
    state["repo_path"] = repo_path
    _log(state, f"Repository cloned{' (cache hit)' if clone.get('cached') else ''}", agent="DependencyAgent")

    # Check repository size
    size_ok, size_msg = check_repo_size(repo_path, MAX_REPO_FILES)
    if not size_ok:
        _log(state, size_msg, "error", "DependencyAgent")
        state["status"] = "failed"
        state["error"] = size_msg
        _push_snapshot(state, {"github": github, "contributors": contributors})
        return state

    snapshot.set_lifecycle(session_id, "analyzing", 30)
    state["progress"] = 30
    structure = analyze_folder_structure(repo_path)
    state["structure"] = structure
    _log(
        state,
        f"Layout: {structure.get('layout_pattern')} - {len(structure.get('top_level_directories', []))} top-level dirs",
        agent="DependencyAgent",
    )

    _agent(state, "DependencyAgent", "THINKING", "Parsing modules")
    files = scan_repo(repo_path)
    state["files"] = files
    _log(state, f"Discovered {len(files)} Python modules", agent="DependencyAgent")

    # Build dependency graph
    graph_data = build_dependency_graph(files, repo_path)
    
    # Format graph nodes and edges for spatial graph visualizer
    nodes = []
    edges = []
    
    # 1. Add RepoNode
    nodes.append({
        "id": "repo_node",
        "kind": "RepoNode",
        "repo_url": repo_url,
        "repo_name": github.get("full_name", repo_url),
        "status": "analyzing",
        "risk_level": "unknown",
        "summary": "",
    })
    
    # 2. Add FileNodes
    for f in files[:80]:
        nodes.append({
            "id": f["path"],
            "kind": "FileNode",
            "path": f["path"],
            "imports": f.get("imports", []),
            "vulnerabilities": [],
            "risk_score": 0.0,
        })
        # Link FileNode to RepoNode
        edges.append({
            "kind": "discovered_by",
            "source": f["path"],
            "target": "repo_node",
            "agent": "DependencyAgent",
        })

    # Add other nodes/edges from built graph_data
    for n in graph_data.get("nodes", []):
        if n["id"] not in [node["id"] for node in nodes]:
            nodes.append({
                "id": n["id"],
                "kind": "ModuleNode",
                **n
            })
    for e in graph_data.get("edges", []):
        edges.append({
            "kind": e.get("type", "imports_edge"),
            "source": e["source"],
            "target": e["target"],
            **e
        })

    state["graph_nodes"] = nodes
    state["graph_edges"] = edges
    state["progress"] = 45
    
    _agent(state, "DependencyAgent", "COMPLETED", "Dependency graph ready")
    _push_snapshot(state, {
        "github": github,
        "contributors": contributors,
        "structure": structure,
    })

    return state


def security_agent_node(state: AgentState) -> AgentState:
    if state.get("status") == "failed":
        return state

    session_id = state["session_id"]
    repo_path = state["repo_path"]

    _agent(state, "SecurityAgent", "RUNNING", "Security scan")
    _log(state, "Running security pattern analysis...", agent="SecurityAgent")

    # Run Static Scanner Heuristics
    findings = scan_repository(repo_path)
    state["findings"] = findings
    for finding in findings[:5]:
        _log(
            state,
            f"{finding['title']} in {finding['file']}:{finding['line']}",
            "warn" if finding.get("severity") in ("high", "medium") else "info",
            "SecurityAgent",
        )

    # Run CVE Scan via OSV.dev
    _log(state, "Scanning dependencies for known CVEs (OSV.dev)...", agent="SecurityAgent")
    cve_findings = scan_dependencies_for_cves(repo_path)
    state["cve_findings"] = cve_findings
    if cve_findings:
        _log(state, f"CVE scan: {len(cve_findings)} vulnerable packages found", "warn", "SecurityAgent")
    else:
        _log(state, "CVE scan: no known vulnerabilities in dependencies", agent="SecurityAgent")

    # Map findings into graph nodes
    nodes = list(state["graph_nodes"])
    edges = list(state["graph_edges"])
    
    for idx, finding in enumerate(findings):
        vuln_id = f"vuln_{idx}"
        nodes.append({
            "id": vuln_id,
            "kind": "VulnerabilityNode",
            "rule": finding.get("rule", ""),
            "severity": finding.get("severity", "medium"),
            "file": finding.get("file", ""),
            "line": finding.get("line", 0),
            "title": finding.get("title", ""),
        })
        # Link vulnerability to corresponding file
        edges.append({
            "kind": "detected_in",
            "source": vuln_id,
            "target": finding.get("file", "repo_node"),
            "reason": "security_vulnerability",
        })

    state["graph_nodes"] = nodes
    state["graph_edges"] = edges
    state["progress"] = 55
    
    _agent(state, "SecurityAgent", "COMPLETED", f"{len(findings)} findings")
    _push_snapshot(state, {
        "findings": findings,
        "cve_findings": cve_findings,
    })

    return state


def impact_agent_node(state: AgentState) -> AgentState:
    if state.get("status") == "failed":
        return state

    _agent(state, "ImpactAgent", "RUNNING", "Impact analysis")
    _log(state, "[ImpactAgent] analyzing downstream dependency impact", agent="ImpactAgent")

    # Reconstruct NetworkX graph for analysis
    import networkx as nx
    nx_graph = nx.DiGraph()
    for node in state["graph_nodes"]:
        nx_graph.add_node(node["id"], kind=node["kind"])
    for edge in state["graph_edges"]:
        nx_graph.add_edge(edge["source"], edge["target"], kind=edge["kind"])

    # Determine target module for blast radius
    target = "auth"
    for f in state["files"]:
        if "auth" in f["path"].lower():
            target = f["path"].replace(".py", "").replace("/", ".")
            break

    impact = impact_analysis(nx_graph, target) if nx_graph.nodes else {}
    state["impact"] = impact
    if impact.get("human_readable"):
        _log(
            state,
            f"Blast radius for {target}: {', '.join(impact['human_readable'][:5])}",
            agent="ImpactAgent",
        )

    state["progress"] = 68
    _agent(state, "ImpactAgent", "COMPLETED", "Impact map ready")
    _push_snapshot(state, {"impact": impact})

    return state


def explanation_agent_node(state: AgentState) -> AgentState:
    if state.get("status") == "failed":
        return state

    session_id = state["session_id"]
    repo_path = state["repo_path"]
    files = state["files"]
    findings = state["findings"]
    github = state["github"]

    _agent(state, "ExplanationAgent", "RUNNING", "Generating AI insights")
    _log(state, "[ExplanationAgent] generating architecture intelligence", agent="ExplanationAgent")

    # Heuristic metrics/quality scanning
    readme = analyze_readme(repo_path)
    code_quality = analyze_code_quality(files, repo_path)
    maintainability = analyze_maintainability(github, files, findings)

    # Compute metric counters
    node_count = len(state["graph_nodes"])
    edge_count = len(state["graph_edges"])
    metrics = {"node_count": node_count, "edge_count": edge_count}

    stack = _detect_stack(repo_path, files)
    summary = heuristic_summary(
        github.get("full_name", repo_path.split("/")[-1]),
        stack,
        findings,
        metrics,
    )

    # Richer LLM summaries if key available
    ctx = {
        "github": {
            "full_name": github.get("full_name"),
            "stars": github.get("stars"),
            "description": github.get("description"),
        },
        "modules": len(files),
        "findings_count": len(findings),
        "graph_metrics": metrics,
        "readme_found": readme.get("found"),
        "code_quality_grade": code_quality.get("grade"),
        "maintainability_grade": maintainability.get("grade"),
    }
    
    import json
    ctx_str = json.dumps(ctx, indent=0)[:8000]

    prompt_summary = (
        f"Write a 3-4 sentence repository intelligence summary for judges.\n"
        f"Repo: {github.get('full_name')}\nDescription: {github.get('description')}\n"
        f"Languages: {', '.join(github.get('languages', []))}\n"
        f"Type hint: {stack['repo_type']}\nSecurity findings: {len(findings)}\n"
        f"Modules: {len(files)}"
    )
    
    ai_summary, provider = llm_generate(prompt_summary)
    if ai_summary and provider != "heuristic":
        summary["purpose"] = ai_summary
        summary["source"] = provider
        _log(state, f"AI repository summary generated ({provider})", agent="ExplanationAgent")

    arch_prompt = (
        f"Explain the architecture of this repository in 2-3 sentences.\n"
        f"Layout: {state['structure'].get('layout_pattern')}\n"
        f"Top dirs: {', '.join(state['structure'].get('top_level_directories', [])[:8])}\n"
        f"Stack: {stack['repo_type']}"
    )
    arch_text, _ = llm_generate(arch_prompt)
    if arch_text and _ != "heuristic":
        summary["architecture"] = arch_text.strip()[:500]

    rec_prompt = f"List 5 actionable engineering recommendations as bullet points.\n{ctx_str}"
    rec_text, _ = llm_generate(rec_prompt)
    recommendations = []
    if rec_text and _ != "heuristic":
        for line in rec_text.split("\n"):
            line = line.strip().lstrip("•-*0123456789. ")
            if len(line) > 12:
                recommendations.append(line)
                
    if not recommendations:
        # Fallback recommendations
        if findings:
            recommendations.append("Address high-severity security patterns before next release.")
        recommendations.extend((maintainability.get("insights") or [])[:3])
        if not readme.get("has_install_docs"):
            recommendations.append("Add installation documentation to README.")
        if not recommendations:
            recommendations.append("Maintain modular architecture and schedule dependency audits.")

    recommendations = build_recommendations(
        summary,
        findings,
        code_quality,
        readme,
        github,
    ) or recommendations

    summary = _ensure_summary_shape(
        summary,
        recommendations,
        findings,
        maintainability,
        code_quality,
        metrics,
    )

    state["summary"] = summary
    state["readme"] = readme
    state["code_quality"] = code_quality
    state["maintainability"] = maintainability
    state["progress"] = 82

    _agent(state, "ExplanationAgent", "COMPLETED", "Intelligence report ready")
    _push_snapshot(state, {
        "summary": summary,
        "readme": readme,
        "code_quality": code_quality,
        "maintainability": maintainability,
        "recommendations": recommendations[:8],
    })

    return state


def fix_agent_node(state: AgentState) -> AgentState:
    if state.get("status") == "failed":
        return state

    _agent(state, "FixAgent", "RUNNING", "Generating patches")

    findings = state["findings"]
    fixes = []
    approvals = []

    # Filter to high/medium findings
    target_findings = [f for f in findings if f.get("severity") in ("high", "medium")][:3]
    
    if not target_findings:
        state["progress"] = 95
        _agent(state, "FixAgent", "COMPLETED", "No fixes required")
        _push_snapshot(state, {"fixes": [], "approvals": []})
        return state

    for finding in target_findings:
        fix = generate_fix(finding)
        fixes.append({**fix, "title": finding.get("title", "Fix")})
        
        # Unique approval id
        approval_id = uuid.uuid4().hex[:8]
        approval = {
            "id": approval_id,
            "agent": "SecurityAgent",
            "question": finding["title"],
            "file": finding["file"],
            "line": finding["line"],
            "recommendation": finding["recommendation"],
            "fix_preview": fix.get("diff", ""),
            "approved": None,
            "status": "pending",
        }
        
        if state["execution_mode"] == "approval":
            approvals.append(approval)
            _log(state, f"Approval required: {finding['title']}", "approval", "FixAgent")
        else:
            approval["approved"] = True
            approval["status"] = "auto_approved"
            _log(state, f"Auto-approved patch for {finding['file']}", agent="FixAgent")

    state["fixes"] = fixes
    state["approvals"] = approvals
    state["progress"] = 95

    # If approval mode has pending approvals, set FixAgent to WAITING
    if state["execution_mode"] == "approval" and any(a["status"] == "pending" for a in approvals):
        _agent(state, "FixAgent", "WAITING", "Awaiting supervisor approval")
    else:
        _agent(state, "FixAgent", "COMPLETED", f"{len(fixes)} patches generated")

    # Map approvals to graph nodes
    nodes = list(state["graph_nodes"])
    edges = list(state["graph_edges"])

    for approval in approvals:
        nodes.append({
            "id": approval["id"],
            "kind": "ApprovalNode",
            "question": approval["question"],
            "approved": approval["approved"],
            "status": approval["status"],
            "file": approval["file"],
            "line": approval["line"],
            "recommendation": approval["recommendation"],
            "fix_preview": approval["fix_preview"],
        })
        edges.append({
            "kind": "approval_request",
            "source": "repo_node", # Linked to repo
            "target": approval["id"],
            "severity": "medium",
        })

    state["graph_nodes"] = nodes
    state["graph_edges"] = edges

    _push_snapshot(state, {
        "fixes": fixes,
        "approvals": approvals,
    })

    return state


def finalize_node(state: AgentState) -> AgentState:
    # Finalize node executes only when workflow finishes (e.g. no pending approvals or when resumed)
    # Check if there are still pending approvals. If so, don't finalize yet (remain in WAITING state)
    if state["execution_mode"] == "approval" and any(a["status"] == "pending" for a in state["approvals"]):
        return state

    state["status"] = "completed"
    state["progress"] = 100
    _agent(state, "MonitorAgent", "COMPLETED", "Mission complete")
    _agent(state, "FixAgent", "COMPLETED", f"Remediations applied/reviewed")
    _log(state, "Analysis complete - dashboard fully populated", agent="MonitorAgent")
    snapshot.finalize_session(state["session_id"], "completed")
    _push_snapshot(state, {"status": "completed"})

    return state


# Compile Workflow

workflow = StateGraph(AgentState)

# Register Nodes
workflow.add_node("dependency_agent", dependency_agent_node)
workflow.add_node("security_agent", security_agent_node)
workflow.add_node("impact_agent", impact_agent_node)
workflow.add_node("explanation_agent", explanation_agent_node)
workflow.add_node("fix_agent", fix_agent_node)
workflow.add_node("finalize", finalize_node)

# Define Edges
workflow.add_edge(START, "dependency_agent")
workflow.add_edge("dependency_agent", "security_agent")
workflow.add_edge("security_agent", "impact_agent")
workflow.add_edge("impact_agent", "explanation_agent")
workflow.add_edge("explanation_agent", "fix_agent")
workflow.add_edge("fix_agent", "finalize")
workflow.add_edge("finalize", END)

# We use a memory checkpoint saver to support human interrupts
# Interrupt execution AFTER the fix_agent runs (before finalize) so approvals can be processed
memory = MemorySaver()
app = workflow.compile(
    checkpointer=memory,
    interrupt_after=["fix_agent"]
)

