import axios from "axios";

// FIX: reduced from 180s (which left the tab silently hanging for 3 minutes)
// to 60s. The AbortController below gives users a manual cancel button too.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 60000,
  withCredentials: true,
  headers: {
    // FIX: send API key in a header for all requests (kept out of URLs / logs)
    // In dev this will be the placeholder value which the server ignores.
    "X-Api-Key": import.meta.env.VITE_API_KEY || "",
  },
});

export const fetchCaptcha = async () => {
  const res = await api.get("/captcha");
  if (res.data.sessionId) {
    // sessionStorage is tab-scoped — an XSS attack in another tab cannot
    // steal this session ID (unlike localStorage which is origin-wide).
    sessionStorage.setItem("reraSessionId", res.data.sessionId);
  }
  return res.data;
};

/**
 * searchProjects — supports an optional AbortController signal so the
 * caller can cancel a long-running search (e.g. user navigates away).
 */
export const searchProjects = async (params, signal) => {
  const sessionId = sessionStorage.getItem("reraSessionId");
  const res = await api.post("/search", { ...params, sessionId }, { signal });
  // Clear session immediately after use so it can't be replayed
  sessionStorage.removeItem("reraSessionId");
  return res.data;
};

export const getStoredProjects = (params = {}) =>
  api.get("/projects", { params }).then((r) => r.data);

export const getProjectStats = () =>
  api.get("/projects/stats").then((r) => r.data);

export const fetchDetails = (viewUrl, reraNumber, projectName, promoterName) =>
  api
    .post("/project/details", { viewUrl, reraNumber, projectName, promoterName })
    .then((r) => r.data);

export const saveProject = (reraNumber, projectData) =>
  api.post("/project/save", { reraNumber, projectData }).then((r) => r.data);

export const unsaveProject = (projectData) =>
  api.post("/project/unsave", projectData).then((r) => r.data);

export const updateNotes = (reraNumber, notes, projectName, promoterName) =>
  api
    .patch("/project/notes", { reraNumber, notes, projectName, promoterName })
    .then((r) => r.data);

export default api;
