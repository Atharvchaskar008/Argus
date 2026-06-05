# Graph-native repository memory

node RepoNode {
    has repo_name: str = "",
        repo_url: str = "",
        status: str = "pending",
        risk_level: str = "unknown",
        summary: str = "";
}

node FileNode {
    has path: str = "",
        imports: list = [],
        vulnerabilities: list = [],
        risk_score: float = 0.0;
}

node VulnerabilityNode {
    has rule: str = "",
        severity: str = "medium",
        file: str = "",
        line: int = 0,
        title: str = "";
}

node AgentNode {
    has name: str = "",
        state: str = "IDLE",
        last_action: str = "",
        active_tasks: list = [],
        recent_actions: list = [];
}

edge imports_edge {
    has module_name: str = "";
}

edge depends_on {
    has strength: float = 1.0;
}

edge discovered_by {
    has agent: str = "";
}

node DependencyNode {
    has name: str = "",
        ecosystem: str = "",
        cve_ids: list = [],
        llm_rating: str = "LOW",
        severity: str = "LOW";
}

node SecretNode {
    has file_path: str = "",
        secret_type: str = "",
        risk_explanation: str = "";
}

node ReportNode {
    has total_issues: int = 0,
        summary: str = "",
        risk_score: int = 50,
        recommendations: list = [];
}

