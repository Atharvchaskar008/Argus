// Base URL of the Argus API.
// - `npm run dev`: the Flask server on http://localhost:8000
// - production build served by Flask (Docker / Render): same origin, so ''
// - UI hosted separately from the API: set VITE_API_BASE_URL at build time
const fallback = import.meta.env.DEV ? 'http://localhost:8000' : '';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? fallback).replace(/\/+$/, '');

export const apiUrl = (path) => `${API_BASE}${path}`;
