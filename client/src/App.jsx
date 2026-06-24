import { useState, useEffect, useCallback } from "react";
import {
  Search, Loader2, AlertCircle, CheckCircle2, Info,
  Bookmark, RefreshCw, ChevronDown, ChevronUp,
  Building2, User, Hash, MapPin, XCircle,
} from "lucide-react";
import Header from "./components/Header";
import CaptchaBox from "./components/CaptchaBox";
import SearchResultsTable from "./components/SearchResultsTable";
import SavedProjectsTable from "./components/SavedProjectsTable";
import StatsBar from "./components/StatsBar";
import ProjectDetailModal from "./components/ProjectDetailModal";
import { useSearch } from "./hooks/useSearch";
import { getStoredProjects, saveProject, unsaveProject } from "./services/api";

export default function App() {
  const {
    captchaImage, captchaLoading, captchaError, loadCaptcha,
    searchLoading, searchError, results,
    doSearch, cancelSearch, searchHistory, clearHistory,
  } = useSearch();

  const [query,        setQuery]        = useState("");
  const [promoter,     setPromoter]     = useState("");
  const [reraNo,       setReraNo]       = useState("");
  const [district,     setDistrict]     = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [successMsg,      setSuccessMsg]      = useState("");
  const [activeTab,       setActiveTab]       = useState("search");
  const [savedProjects,   setSavedProjects]   = useState([]);
  const [savedLoading,    setSavedLoading]    = useState(false);
  const [saveError,       setSaveError]       = useState("");
  const [savedSet,        setSavedSet]        = useState(new Set());
  const [selectedProject, setSelectedProject] = useState(null);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  function getProjectKey(project) {
    return (project.reraNumber && !project.reraNumber.includes("_"))
      ? project.reraNumber
      : `${project.projectName}_${project.promoterName}`;
  }

  const loadSaved = useCallback(async () => {
    setSavedLoading(true);
    try {
      const data = await getStoredProjects({ isSaved: "true", limit: 100 });
      const list = data.projects || [];
      setSavedProjects(list);
      setSavedSet(new Set(list.map(getProjectKey)));
    } catch (e) {
      console.error("Load saved failed:", e);
    } finally {
      setSavedLoading(false);
    }
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  async function handleSearch(e) {
    e.preventDefault();
    if (!captchaInput.trim()) return;
    const hasQuery = query.trim() || promoter.trim() || reraNo.trim() || district.trim();
    if (!hasQuery) { alert("Please enter at least one search field."); return; }

    setSuccessMsg("");
    setSaveError("");

    const data = await doSearch(
      { query: query.trim(), promoter: promoter.trim(), reraNo: reraNo.trim(), district: district.trim() },
      captchaInput.trim()
    );

    if (data) {
      const projects = Array.isArray(data.projects) ? data.projects : [];
      setSuccessMsg(`Found ${projects.length} project(s). ${data.saved || 0} record(s) stored.`);
      setCaptchaInput("");
      await loadSaved();
      setStatsRefreshKey((k) => k + 1);
    }
  }

  function fillFromHistory(entry) {
    setQuery(entry.params?.query || entry.query || "");
    setPromoter(entry.params?.promoter || "");
    setReraNo(entry.params?.reraNo || "");
    setDistrict(entry.params?.district || "");
  }

  async function handleSaveProject(proj) {
    const projectKey  = getProjectKey(proj);
    const alreadySaved = savedSet.has(projectKey);
    setSaveError("");

    // Optimistic update
    setSavedSet((prev) => {
      const next = new Set(prev);
      alreadySaved ? next.delete(projectKey) : next.add(projectKey);
      return next;
    });

    try {
      if (alreadySaved) {
        await unsaveProject({
          reraNumber:   proj.reraNumber,
          projectName:  proj.projectName,
          promoterName: proj.promoterName,
        });
      } else {
        const { rowIndex, ...projectData } = proj;
        await saveProject(proj.reraNumber, projectData);
      }
      await loadSaved();
      setStatsRefreshKey((k) => k + 1);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Unknown error";
      setSaveError(`Save failed: ${msg}`);
      // Roll back optimistic update
      setSavedSet((prev) => {
        const next = new Set(prev);
        alreadySaved ? next.add(projectKey) : next.delete(projectKey);
        return next;
      });
    }
  }

  async function handleUnsave(project) {
    const projectKey = getProjectKey(project);
    setSavedSet((prev) => { const s = new Set(prev); s.delete(projectKey); return s; });
    setSavedProjects((prev) => prev.filter((p) => getProjectKey(p) !== projectKey));

    try {
      await unsaveProject({
        reraNumber:   project.reraNumber,
        projectName:  project.projectName,
        promoterName: project.promoterName,
      });
      await loadSaved();
      setStatsRefreshKey((k) => k + 1);
    } catch (e) {
      console.error("Unsave failed:", e);
      await loadSaved();
    }
  }

  const hasAdvanced = promoter || reraNo || district;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* StatsBar */}
        <StatsBar key={statsRefreshKey} />

        {/* Search Panel */}
        <div className="card p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-gov-400" />
            <h2 className="font-display font-bold text-base text-white">Search RERA Projects</h2>
          </div>

          <div className="flex gap-3 bg-gov-800/40 border border-gov-600/30 rounded-xl p-3">
            <Info size={14} className="text-gov-400 shrink-0 mt-0.5" />
            <p className="text-gov-300 text-xs leading-relaxed">
              Click <strong className="text-white">Load CAPTCHA</strong>, solve it, enter your keyword, then
              click <strong className="text-white">Search</strong>. Click any row to view full details.
              Use the <strong className="text-amber-400">bookmark icon</strong> to save a project.
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gov-400 uppercase tracking-wider mb-1.5">
                  <Building2 size={11} className="inline mr-1" />Project Name
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gov-500" />
                  <input type="text" placeholder="e.g. Aparna, My Home, Kokapet…"
                    value={query} onChange={(e) => setQuery(e.target.value)}
                    className="input-field pl-10" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gov-400 uppercase tracking-wider">CAPTCHA</label>
                  {!captchaImage && (
                    <button type="button" onClick={loadCaptcha} disabled={captchaLoading}
                      className="btn-primary text-xs py-1 px-3 flex items-center gap-1.5">
                      {captchaLoading && <Loader2 size={11} className="animate-spin" />}
                      Load CAPTCHA
                    </button>
                  )}
                </div>
                <CaptchaBox
                  captchaImage={captchaImage} captchaLoading={captchaLoading}
                  captchaError={captchaError} onRefresh={loadCaptcha}
                  value={captchaInput} onChange={setCaptchaInput} />
              </div>
            </div>

            {/* Advanced Filters */}
            <div>
              <button type="button" onClick={() => setAdvancedOpen((v) => !v)}
                className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors
                  ${hasAdvanced ? "text-amber-400" : "text-gov-500 hover:text-gov-300"}`}>
                {advancedOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                Advanced Filters
                {hasAdvanced && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] normal-case">active</span>}
              </button>

              {advancedOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gov-700/40">
                  <div>
                    <label className="block text-xs font-semibold text-gov-500 uppercase tracking-wider mb-1.5">
                      <User size={10} className="inline mr-1" />Promoter Name
                    </label>
                    <input type="text" placeholder="Builder / Developer"
                      value={promoter} onChange={(e) => setPromoter(e.target.value)}
                      className="input-field text-sm py-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gov-500 uppercase tracking-wider mb-1.5">
                      <Hash size={10} className="inline mr-1" />RERA / Cert. No
                    </label>
                    <input type="text" placeholder="P02400XXXXXX"
                      value={reraNo} onChange={(e) => setReraNo(e.target.value)}
                      className="input-field text-sm py-2 font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gov-500 uppercase tracking-wider mb-1.5">
                      <MapPin size={10} className="inline mr-1" />District
                    </label>
                    <input type="text" placeholder="Hyderabad, Rangareddy…"
                      value={district} onChange={(e) => setDistrict(e.target.value)}
                      className="input-field text-sm py-2" />
                  </div>
                </div>
              )}
            </div>

            {searchError && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl p-3">
                <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{searchError}</p>
              </div>
            )}
            {saveError && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl p-3">
                <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{saveError}</p>
              </div>
            )}
            {successMsg && (
              <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-emerald-300 text-sm">{successMsg}</p>
              </div>
            )}

            {searchHistory.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-gov-600 uppercase tracking-wider">Recent:</span>
                {searchHistory.slice(0, 6).map((h, i) => (
                  <button key={i} type="button" onClick={() => fillFromHistory(h)}
                    className="px-2.5 py-1 rounded-lg bg-gov-800/50 border border-gov-600/30
                               text-xs text-gov-400 hover:text-white hover:bg-gov-700/50 transition-all">
                    {h.query || h.params?.query || "(advanced)"}
                  </button>
                ))}
                <button type="button" onClick={clearHistory}
                  className="px-2 py-1 text-[10px] text-gov-700 hover:text-red-400 transition-colors">clear</button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button type="submit"
                disabled={searchLoading || !captchaInput.trim()}
                className="btn-primary flex items-center justify-center gap-2 py-3 w-full sm:w-auto sm:px-12">
                {searchLoading
                  ? <><Loader2 size={15} className="animate-spin" />Searching RERA…</>
                  : <><Search size={15} />Search Projects</>}
              </button>

              {/* FIX: Cancel button — lets user abort a long-running search */}
              {searchLoading && (
                <button type="button" onClick={cancelSearch}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-semibold
                             bg-red-500/10 text-red-400 border border-red-500/30
                             hover:bg-red-500/20 transition-all">
                  <XCircle size={15} /> Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex items-center border-b border-gov-700/40 mb-4">
            <button onClick={() => setActiveTab("search")}
              className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-px transition-colors
                ${activeTab === "search" ? "text-gov-200 border-gov-400" : "text-gov-500 border-transparent hover:text-gov-300"}`}>
              Search Results
              {results !== null && results.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-gov-700/50 text-[10px]">{results.length}</span>
              )}
            </button>

            <button onClick={() => { setActiveTab("saved"); loadSaved(); }}
              className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-px transition-colors flex items-center gap-1.5
                ${activeTab === "saved" ? "text-gov-200 border-gov-400" : "text-gov-500 border-transparent hover:text-gov-300"}`}>
              <Bookmark size={11} /> Saved Projects
              {savedSet.size > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                  {savedSet.size}
                </span>
              )}
            </button>

            {activeTab === "saved" && (
              <button onClick={loadSaved}
                className="ml-auto mr-1 p-2 text-gov-500 hover:text-gov-300 transition-colors" title="Refresh">
                <RefreshCw size={13} className={savedLoading ? "animate-spin" : ""} />
              </button>
            )}
          </div>

          {activeTab === "search" && (
            <SearchResultsTable
              projects={results || []}
              savedSet={savedSet}
              getProjectKey={getProjectKey}
              onView={setSelectedProject}
              onSave={handleSaveProject}
            />
          )}

          {activeTab === "saved" && (
            <SavedProjectsTable
              projects={savedProjects}
              loading={savedLoading}
              savedSet={savedSet}
              getProjectKey={getProjectKey}
              onView={setSelectedProject}
              onSave={handleSaveProject}
              onUnsave={handleUnsave}
            />
          )}
        </div>
      </main>

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          savedSet={savedSet}
          getProjectKey={getProjectKey}
          onClose={() => setSelectedProject(null)}
          onSaved={() => { loadSaved(); setStatsRefreshKey((k) => k + 1); }}
        />
      )}
    </div>
  );
}
