import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const RepoContext = createContext();

export const RepoProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [sessionState, setSessionState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const eventSourceRef = useRef(null);

  const startAnalysis = async (repoUrl) => {
    setIsAnalyzing(true);
    setLogs([]);
    setSession(null);
    setSessionState(null);

    try {
      const res = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start analysis');

      const sessionId = data.session_id;
      setSession({ id: sessionId, repoUrl });
      connectStream(sessionId);
    } catch (err) {
      console.error(err);
      setIsAnalyzing(false);
      setLogs([{ level: 'error', message: err.message, agent: 'System' }]);
    }
  };

  const connectStream = useCallback((sessionId) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const es = new EventSource(`http://localhost:8000/stream/${sessionId}`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'state') {
          setSessionState(payload.data);
        } else if (payload.type === 'log') {
          setLogs((prev) => [...prev, payload.data]);
        } else if (payload.type === 'done') {
          setIsAnalyzing(false);
          es.close();
        } else if (payload.type === 'error') {
          setIsAnalyzing(false);
          es.close();
          setLogs((prev) => [...prev, { level: 'error', message: payload.data.message }]);
        }
      } catch (err) {
        // keep-alive or parse error
      }
    };
    es.onerror = () => {
      es.close();
      setIsAnalyzing(false);
    };
  }, []);

  const resetSession = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setSession(null);
    setSessionState(null);
    setLogs([]);
    setIsAnalyzing(false);
  }, []);

  return (
    <RepoContext.Provider value={{ session, sessionState, logs, isAnalyzing, startAnalysis, resetSession }}>
      {children}
    </RepoContext.Provider>
  );
};

export const useRepo = () => useContext(RepoContext);
