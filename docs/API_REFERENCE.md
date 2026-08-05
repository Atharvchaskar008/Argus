# RepoSense API Reference

| Method | Path | Description | Request Body | Response Shape |
|---|---|---|---|---|
| POST | `/analyze` | Starts repository analysis. | `{"repo_url": "...", "execution_mode": "autonomous"}` | `{"session_id": "...", "status": "queued"}` |
| POST | `/compare` | Starts parallel analysis of two repositories. | `{"repos": ["url1", "url2"]}` | `{"comparison_id": "...", "session_ids": ["id1", "id2"], "repos": ["url1", "url2"], "status": "both_queued"}` |
| GET | `/compare/result` | Returns side-by-side comparison. | N/A (Uses query params `?a=<sid1>&b=<sid2>`) | `{"a": {...}, "b": {...}}` |
| GET | `/health` | Live connectivity and configuration check. | N/A | `{"status": "ok", "service": "RepoSense", ...}` |
| GET | `/sessions` | Returns lightweight metadata for all active sessions. | N/A | `[{"id": "...", "status": "...", "repo_url": "...", ...}]` |
| GET | `/session/<session_id>` | Returns full session details. | N/A | `{"status": "...", "progress": 100, ...}` |
| DELETE | `/session/<session_id>` | Deletes an active session and its artifacts. | N/A | `{"deleted": true}` |
| GET | `/stream/<session_id>` | SSE stream for real-time analysis progress. | N/A | Server-Sent Events |
| POST | `/approve_fix` | Approves or rejects a suggested fix. | `{"session_id": "...", "approval_id": "...", "approved": true/false}` | `{"success": true, ...}` |
| POST | `/chat` | Conversational query over session state. | `{"session_id": "...", "message": "..."}` | `{"answer": "..."}` |
| GET | `/cve/<session_id>` | Retrieves known CVEs in the dependency graph. | N/A | `[{...}]` |
| GET | `/export/<session_id>` | Downloads complete analysis as a JSON file. | N/A | JSON File Download |
| GET | `/report/<session_id>` | Retrieves complete analysis as JSON payload. | N/A | `{"report_metadata": {...}, ...}` |
