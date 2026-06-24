import { useState, useCallback, useRef } from "react";
import { fetchCaptcha, searchProjects } from "../services/api";

export function useSearch() {
  const [captchaImage,   setCaptchaImage]   = useState(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaError,   setCaptchaError]   = useState("");

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError,   setSearchError]   = useState("");
  const [results,       setResults]       = useState(null);

  // Ref to the current in-flight AbortController so we can cancel mid-search
  const abortRef = useRef(null);

  // History stores up to 10 entries with the full param set
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("reraSearchHistory") || "[]");
    } catch {
      return [];
    }
  });

  // ── CAPTCHA ─────────────────────────────────────────────────────────────
  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaError("");
    setCaptchaImage(null);
    try {
      const data = await fetchCaptcha();
      if (data.captchaImage) {
        setCaptchaImage(`data:image/png;base64,${data.captchaImage}`);
      } else {
        throw new Error("No CAPTCHA image returned.");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load CAPTCHA.";
      setCaptchaError(msg);
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  // ── SEARCH ───────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (params, captcha) => {
    // Cancel any in-flight request before starting a new one
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setSearchLoading(true);
    setSearchError("");
    setResults(null);

    try {
      const data = await searchProjects({ ...params, captcha }, controller.signal);

      if (!data.success) {
        const errMsg = data.message || "Search failed.";
        setSearchError(errMsg);
        if (data.captchaInvalid) {
          setCaptchaImage(null);
          await loadCaptcha();
        }
        return null;
      }

      const projects = Array.isArray(data.projects) ? data.projects : [];
      setResults(projects);

      // Persist search history to sessionStorage
      setSearchHistory((prev) => {
        const entry = { query: params.query, params, timestamp: Date.now() };
        const next = [
          entry,
          ...prev.filter((h) => (h.params?.query || h.query) !== params.query),
        ].slice(0, 10);
        try { sessionStorage.setItem("reraSearchHistory", JSON.stringify(next)); } catch {}
        return next;
      });

      setCaptchaImage(null);
      return data;
    } catch (err) {
      // Ignore AbortError — user cancelled deliberately
      if (err.name === "CanceledError" || err.name === "AbortError") return null;

      const msg = err?.response?.data?.message || err?.message || "Search failed.";
      const captchaInvalid = err?.response?.data?.captchaInvalid;
      setSearchError(msg);

      if (captchaInvalid) {
        setCaptchaImage(null);
        await loadCaptcha();
      }
      return null;
    } finally {
      setSearchLoading(false);
      abortRef.current = null;
    }
  }, [loadCaptcha]);

  /** Cancel an in-flight search request. */
  const cancelSearch = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setSearchLoading(false);
    setSearchError("Search cancelled.");
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    try { sessionStorage.removeItem("reraSearchHistory"); } catch {}
  }, []);

  return {
    captchaImage,
    captchaLoading,
    captchaError,
    loadCaptcha,
    searchLoading,
    searchError,
    results,
    doSearch,
    cancelSearch,
    searchHistory,
    clearHistory,
  };
}
