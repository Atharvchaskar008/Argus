import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

const API_BASE = 'http://localhost:8000';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('argus_github_token') || '');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [repos, setRepos] = useState([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Check URL query parameters for OAuth redirect payload
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingToken = params.get('token');
    const incomingAuth = params.get('auth');
    const incomingError = params.get('auth_error');

    if (incomingError) {
      setAuthError(incomingError);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (incomingAuth === 'success' && incomingToken) {
      localStorage.setItem('argus_github_token', incomingToken);
      setToken(incomingToken);
      setAuthError(null);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch current user details whenever token changes
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    const activeToken = localStorage.getItem('argus_github_token') || token;

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const res = await fetch(`${API_BASE}/auth/user`, {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          if (data.token && !activeToken) {
            localStorage.setItem('argus_github_token', data.token);
            setToken(data.token);
          }
        } else {
          setUser(null);
          if (activeToken) {
            localStorage.removeItem('argus_github_token');
            setToken('');
          }
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to check auth state:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch user repositories (public & private)
  const fetchRepos = useCallback(async () => {
    const activeToken = localStorage.getItem('argus_github_token') || token;
    if (!activeToken) return [];

    setIsLoadingRepos(true);
    try {
      const res = await fetch(`${API_BASE}/auth/repos?per_page=100`, {
        headers: {
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        const list = data.repos || [];
        setRepos(list);
        return list;
      }
    } catch (err) {
      console.error('Failed to fetch repositories:', err);
    } finally {
      setIsLoadingRepos(false);
    }
    return [];
  }, [token]);

  // Initiate GitHub OAuth flow
  const login = () => {
    window.location.href = `${API_BASE}/auth/github/login`;
  };

  // Sign out
  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('argus_github_token');
    setToken('');
    setUser(null);
    setRepos([]);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!user,
        isLoading,
        repos,
        isLoadingRepos,
        authError,
        clearAuthError: () => setAuthError(null),
        login,
        logout,
        fetchRepos,
        refreshAuth: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
