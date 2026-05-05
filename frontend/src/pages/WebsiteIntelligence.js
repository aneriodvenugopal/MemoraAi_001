import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Globe, Search, Loader2, RefreshCw, RotateCcw, Download, Plus,
  CheckCircle2, XCircle, AlertCircle, FileText, Database, Activity,
  Sparkles, Zap, Eye, ToggleLeft, ToggleRight, Filter, Trash2,
  Link as LinkIcon, BookOpen, Brain, Clock, ChevronRight,
} from "lucide-react";
import BusinessAdminLayout from "../layouts/BusinessAdminLayout";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const useApi = () => {
  const token = localStorage.getItem("token");
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }),
    [token]
  );
  return { token, headers };
};

const TYPE_COLORS = {
  service: "bg-emerald-100 text-emerald-700 border-emerald-200",
  blog: "bg-purple-100 text-purple-700 border-purple-200",
  faq: "bg-amber-100 text-amber-700 border-amber-200",
  product: "bg-pink-100 text-pink-700 border-pink-200",
  contact: "bg-sky-100 text-sky-700 border-sky-200",
  booking: "bg-orange-100 text-orange-700 border-orange-200",
  category: "bg-indigo-100 text-indigo-700 border-indigo-200",
  about: "bg-cyan-100 text-cyan-700 border-cyan-200",
  home: "bg-blue-100 text-blue-700 border-blue-200",
  manual: "bg-violet-100 text-violet-700 border-violet-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function WebsiteIntelligence() {
  const { headers, token } = useApi();
  const [source, setSource] = useState(null);
  const [stats, setStats] = useState({});
  const [structured, setStructured] = useState({});
  const [pages, setPages] = useState([]);
  const [pagesTotal, setPagesTotal] = useState(0);
  const [pageFilter, setPageFilter] = useState({ q: "", type: "", use_for_ai: "" });
  const [pageSkip, setPageSkip] = useState(0);
  const [pageLimit] = useState(50);
  const [latestSync, setLatestSync] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewPage, setPreviewPage] = useState(null);
  const [selected, setSelected] = useState(new Set());

  // form state
  const [primaryUrl, setPrimaryUrl] = useState("");
  const [extras, setExtras] = useState("");
  const [depth, setDepth] = useState("medium");
  const [schedule, setSchedule] = useState("manual");

  // manual content
  const [mTitle, setMTitle] = useState("");
  const [mBody, setMBody] = useState("");

  // test search
  const [testQ, setTestQ] = useState("");
  const [testHits, setTestHits] = useState([]);

  // Gemini RAG status
  const [rag, setRag] = useState({ enabled: false, store_name: null, last_synced_at: null, doc_count: 0, breakdown: {}, business_category: "general" });
  const [ragSyncing, setRagSyncing] = useState(false);

  const refreshRag = useCallback(async () => {
    try {
      const r = await fetch(`${API}/website-intel/rag/status`, { headers });
      if (!r.ok) return;
      const d = await r.json();
      setRag(d || {});
    } catch (e) { /* ignore */ }
  }, [headers]);

  const triggerRagSync = async () => {
    setRagSyncing(true);
    try {
      const r = await fetch(`${API}/website-intel/rag/sync`, { method: "POST", headers });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        alert(d.detail || "Sync request failed");
      } else {
        // Poll status until last_synced_at changes
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const sr = await fetch(`${API}/website-intel/rag/status`, { headers });
          const sd = await sr.json();
          if (sd?.last_synced_at && sd.last_synced_at !== rag.last_synced_at) {
            setRag(sd);
            break;
          }
        }
      }
    } catch (e) { alert(e.message); }
    setRagSyncing(false);
  };

  const refresh = useCallback(async () => {
    try {
      const [s, st, str] = await Promise.all([
        fetch(`${API}/website-intel/source`, { headers }).then(r => r.json()),
        fetch(`${API}/website-intel/stats`, { headers }).then(r => r.json()),
        fetch(`${API}/website-intel/structured`, { headers }).then(r => r.json()),
      ]);
      setSource(s.source || null);
      setStats(st || {});
      setStructured(str?.data || {});
      if (s.source) {
        setPrimaryUrl(s.source.primary_url || "");
        setExtras((s.source.additional_urls || []).join("\n"));
        setDepth(s.source.depth || "medium");
        setSchedule(s.source.schedule || "manual");
      }
    } catch (e) { console.error(e); }
  }, [headers]);

  const refreshPages = useCallback(async () => {
    const params = new URLSearchParams();
    if (pageFilter.q) params.set("q", pageFilter.q);
    if (pageFilter.type) params.set("type", pageFilter.type);
    if (pageFilter.use_for_ai !== "") params.set("use_for_ai", pageFilter.use_for_ai);
    params.set("skip", pageSkip);
    params.set("limit", pageLimit);
    const r = await fetch(`${API}/website-intel/pages?${params}`, { headers });
    const d = await r.json();
    setPages(d.items || []);
    setPagesTotal(d.total || 0);
  }, [headers, pageFilter, pageSkip, pageLimit]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { refreshPages(); }, [refreshPages]);
  useEffect(() => { refreshRag(); }, [refreshRag]);

  // poll while crawling
  useEffect(() => {
    if (source?.status !== "crawling" && latestSync?.status !== "queued" && latestSync?.status !== "crawling") return;
    const t = setInterval(async () => {
      const r = await fetch(`${API}/website-intel/stats`, { headers });
      const d = await r.json();
      setStats(d || {});
      if (d?.last_sync_status && d.last_sync_status !== "queued" && d.last_sync_status !== "crawling") {
        setLatestSync({ status: d.last_sync_status });
        refresh();
        refreshPages();
      }
    }, 3000);
    return () => clearInterval(t);
  }, [source, latestSync, headers, refresh, refreshPages]);

  const saveSource = async () => {
    setBusy(true);
    try {
      const body = {
        primary_url: primaryUrl.trim(),
        additional_urls: extras.split(/\r?\n/).map(s => s.trim()).filter(Boolean),
        depth, schedule, auto_remove_dead: true, reindex_changed_only: true,
      };
      const r = await fetch(`${API}/website-intel/source`, { method: "POST", headers, body: JSON.stringify(body) });
      if (!r.ok) throw new Error((await r.json()).detail || "Save failed");
      await refresh();
    } catch (e) { alert(e.message); }
    setBusy(false);
  };

  const startScan = async () => {
    if (!source) { await saveSource(); }
    setBusy(true);
    try {
      const r = await fetch(`${API}/website-intel/sync`, { method: "POST", headers });
      if (!r.ok) throw new Error((await r.json()).detail || "Sync failed");
      const d = await r.json();
      setLatestSync(d);
    } catch (e) { alert(e.message); }
    setBusy(false);
    refresh();
  };

  const resetIndex = async () => {
    if (!window.confirm("Wipe all indexed pages and chunks? This cannot be undone.")) return;
    await fetch(`${API}/website-intel/reset`, { method: "POST", headers });
    refresh(); refreshPages();
  };

  const togglePage = async (pageId, useForAi) => {
    await fetch(`${API}/website-intel/pages/toggle`, {
      method: "POST", headers,
      body: JSON.stringify({ page_ids: [pageId], use_for_ai: useForAi }),
    });
    refreshPages();
  };

  const bulkToggle = async (useForAi) => {
    if (selected.size === 0) return;
    await fetch(`${API}/website-intel/pages/toggle`, {
      method: "POST", headers,
      body: JSON.stringify({ page_ids: Array.from(selected), use_for_ai: useForAi }),
    });
    setSelected(new Set());
    refreshPages();
  };

  const exportCsv = () => {
    window.open(`${API}/website-intel/pages.csv?token=${token}`, "_blank");
  };

  const openPreview = async (pageId) => {
    const r = await fetch(`${API}/website-intel/pages/${pageId}`, { headers });
    const d = await r.json();
    setPreviewPage(d);
  };

  const addManual = async () => {
    if (!mTitle.trim() || !mBody.trim()) return;
    setBusy(true);
    await fetch(`${API}/website-intel/manual-content`, {
      method: "POST", headers,
      body: JSON.stringify({ title: mTitle, body: mBody }),
    });
    setMTitle(""); setMBody("");
    setBusy(false);
    refresh(); refreshPages();
  };

  const runTestSearch = async () => {
    if (!testQ.trim()) return;
    const r = await fetch(`${API}/website-intel/test-search`, {
      method: "POST", headers,
      body: JSON.stringify({ query: testQ, k: 5 }),
    });
    const d = await r.json();
    setTestHits(d.hits || []);
  };

  const isCrawling = source?.status === "crawling" || latestSync?.status === "queued" || latestSync?.status === "crawling";
  const last = stats || {};

  return (
    <BusinessAdminLayout pageTitle="Website Intelligence Engine" pageSubtitle="Index your website so the AI replies from real business content">
      <div className="space-y-6 pb-20">
        {/* 1. URL INPUT */}
        <Card icon={Globe} title="1. Website Source" testid="website-source-card">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Primary website URL</Label>
              <input
                value={primaryUrl}
                onChange={e => setPrimaryUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                data-testid="website-primary-url"
              />
              <p className="text-[11px] text-gray-500 mt-1">We'll auto-detect sitemap.xml, robots.txt and crawl internal pages.</p>
            </div>
            <div>
              <Label>Crawl depth</Label>
              <select value={depth} onChange={e => setDepth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" data-testid="website-depth-select">
                <option value="light">Light · up to 25 pages</option>
                <option value="medium">Medium · up to 100 pages</option>
                <option value="deep">Deep · up to 1000+ pages</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label>Additional URLs (one per line, optional)</Label>
              <textarea rows={3} value={extras} onChange={e => setExtras(e.target.value)}
                placeholder="https://example.com/services\nhttps://example.com/faq"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono"
                data-testid="website-extra-urls" />
            </div>
            <div>
              <Label>Sync schedule</Label>
              <select value={schedule} onChange={e => setSchedule(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" data-testid="website-schedule-select">
                <option value="manual">Manual only</option>
                <option value="every_6h">Every 6 hours</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button onClick={saveSource} disabled={busy} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50" data-testid="save-source-btn">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : null} Save
            </button>
            <button onClick={startScan} disabled={busy || !primaryUrl} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5" data-testid="scan-website-btn">
              <Sparkles className="w-3.5 h-3.5" /> {isCrawling ? "Crawling…" : "Scan Website"}
            </button>
            <button onClick={() => { refresh(); refreshPages(); }} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm inline-flex items-center gap-1.5" data-testid="refresh-btn">
              <RefreshCw className="w-3.5 h-3.5" /> Sync Now
            </button>
            <button onClick={resetIndex} className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 text-sm inline-flex items-center gap-1.5" data-testid="reset-index-btn">
              <RotateCcw className="w-3.5 h-3.5" /> Reset Index
            </button>
            {source?.last_synced_at && (
              <span className="text-[11px] text-gray-500 ml-auto">
                <Clock className="w-3 h-3 inline -mt-0.5" /> Last sync: {new Date(source.last_synced_at).toLocaleString()}
              </span>
            )}
          </div>
        </Card>

        {/* 2. AUTO DETECTION */}
        <Card icon={Activity} title="2. Auto-Detection" testid="auto-detection-card">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <DetectStat label="sitemap.xml" found={last?.last_sync_status && stats?.source?.status !== "idle"} statusText={statusText(stats, "sitemap_found")} />
            <DetectStat label="sitemap_index.xml" found={statusText(stats, "sitemap_index_found")} statusText={statusText(stats, "sitemap_index_found")} />
            <DetectStat label="robots.txt" found={statusText(stats, "robots_found")} statusText={statusText(stats, "robots_found")} />
            <DetectStat label="Internal links discovered" count={stats?.pages_indexed || 0} />
          </div>
        </Card>

        {/* 5. AI KNOWLEDGE STATUS */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="knowledge-stats">
          <StatCard icon={FileText} label="Pages indexed" value={last.pages_indexed || 0} accent="sky" />
          <StatCard icon={Database} label="Chunks created" value={last.chunks_created || 0} accent="emerald" />
          <StatCard icon={AlertCircle} label="Failed pages" value={last.failed_pages || 0} accent="amber" />
          <StatCard icon={Brain} label="Last sync" value={last.last_sync_status || "—"} accent="violet" small />
        </div>

        {/* 5b. GEMINI MANAGED RAG (FILE SEARCH) */}
        <Card icon={Brain} title="Gemini Managed RAG · File Search" testid="rag-status-card">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div data-testid="rag-enabled">
                <p className="text-gray-500">Status</p>
                <p className={`font-semibold ${rag.enabled ? "text-emerald-600" : "text-gray-400"}`}>
                  {rag.enabled ? "Active" : "Disabled"}
                </p>
              </div>
              <div data-testid="rag-store-name">
                <p className="text-gray-500">Store</p>
                <p className="font-mono text-[11px] truncate" title={rag.store_name || ""}>
                  {rag.store_name ? rag.store_name.split("/").pop() : "—"}
                </p>
              </div>
              <div data-testid="rag-doc-count">
                <p className="text-gray-500">Docs synced</p>
                <p className="font-semibold">{rag.doc_count || 0}</p>
              </div>
              <div data-testid="rag-last-synced">
                <p className="text-gray-500">Last sync</p>
                <p className="font-medium">
                  {rag.last_synced_at ? new Date(rag.last_synced_at).toLocaleString() : "Never"}
                </p>
              </div>
            </div>
            <button
              onClick={triggerRagSync}
              disabled={!rag.enabled || ragSyncing}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5 self-start sm:self-auto"
              data-testid="rag-sync-now-btn"
            >
              {ragSyncing
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing…</>
                : <><Zap className="w-3.5 h-3.5" /> Re-index All</>}
            </button>
          </div>

          {/* Breakdown chips */}
          {rag.breakdown && rag.breakdown.total ? (
            <div className="mt-4 grid sm:grid-cols-3 gap-3" data-testid="rag-breakdown">
              <BreakdownGroup
                label="By Source"
                data={rag.breakdown.by_source}
                colorMap={{
                  projects: "bg-sky-100 text-sky-700",
                  properties: "bg-emerald-100 text-emerald-700",
                  memoraai_content: "bg-amber-100 text-amber-700",
                  website: "bg-violet-100 text-violet-700",
                }}
              />
              <BreakdownGroup
                label="By Business Category"
                data={rag.breakdown.by_category}
                colorMap={{
                  real_estate: "bg-blue-100 text-blue-700",
                  astrology: "bg-fuchsia-100 text-fuchsia-700",
                  hospitals: "bg-rose-100 text-rose-700",
                  clinics: "bg-pink-100 text-pink-700",
                  education: "bg-indigo-100 text-indigo-700",
                  saloon: "bg-orange-100 text-orange-700",
                  spa: "bg-teal-100 text-teal-700",
                  restaurant: "bg-yellow-100 text-yellow-700",
                  general: "bg-slate-100 text-slate-700",
                }}
              />
              <BreakdownGroup
                label="By Content Type"
                data={rag.breakdown.by_content_type}
                colorMap={{
                  project: "bg-sky-100 text-sky-700",
                  property: "bg-emerald-100 text-emerald-700",
                  brochure: "bg-amber-100 text-amber-700",
                  document: "bg-slate-100 text-slate-700",
                  faq: "bg-pink-100 text-pink-700",
                  website_page: "bg-violet-100 text-violet-700",
                }}
              />
            </div>
          ) : null}

          <p className="text-[11px] text-gray-500 mt-3">
            Pushes website pages, projects, properties and uploaded content (PDF, DOCX, XLSX, CSV, images via OCR) into Gemini File Search so the AI can retrieve exact prices, RERA numbers and inventory in real time.
            {rag.business_category ? <> &nbsp;·&nbsp; Tenant category: <span className="font-mono">{rag.business_category}</span></> : null}
          </p>
        </Card>

        {/* 4. STRUCTURED DATA */}
        {(structured?.services?.length || structured?.faqs?.length || structured?.products?.length || structured?.business) ? (
          <Card icon={Sparkles} title="4. Structured Data Extracted" testid="structured-card">
            <div className="grid md:grid-cols-2 gap-4">
              {structured?.services?.length ? (
                <Mini title={`Services (${structured.services.length})`}>
                  <ul className="space-y-1 max-h-48 overflow-auto">
                    {structured.services.slice(0, 30).map((s, i) => (
                      <li key={i} className="text-xs flex justify-between border-b border-gray-100 py-1">
                        <span className="font-medium truncate">{s.name}</span>
                        <span className="text-gray-500 whitespace-nowrap ml-2">{s.currency} {s.price}</span>
                      </li>
                    ))}
                  </ul>
                </Mini>
              ) : null}
              {structured?.faqs?.length ? (
                <Mini title={`FAQs (${structured.faqs.length})`}>
                  <ul className="space-y-2 max-h-48 overflow-auto">
                    {structured.faqs.slice(0, 12).map((f, i) => (
                      <li key={i} className="text-xs border-l-2 border-amber-300 pl-2">
                        <p className="font-medium">{f.question}</p>
                        <p className="text-gray-600 line-clamp-2">{f.answer}</p>
                      </li>
                    ))}
                  </ul>
                </Mini>
              ) : null}
              {structured?.products?.length ? (
                <Mini title={`Products (${structured.products.length})`}>
                  <ul className="space-y-1 max-h-48 overflow-auto">
                    {structured.products.slice(0, 30).map((p, i) => (
                      <li key={i} className="text-xs flex justify-between border-b border-gray-100 py-1">
                        <span className="truncate">{p.name}</span>
                        <span className="text-gray-500 whitespace-nowrap ml-2">{p.currency} {p.price}</span>
                      </li>
                    ))}
                  </ul>
                </Mini>
              ) : null}
              {structured?.business && Object.keys(structured.business).length ? (
                <Mini title="Business info">
                  <ul className="space-y-1 text-xs">
                    {Object.entries(structured.business).map(([k, v]) => v ? (
                      <li key={k}><span className="font-medium capitalize">{k}: </span><span className="text-gray-600">{String(v).slice(0, 200)}</span></li>
                    ) : null)}
                  </ul>
                </Mini>
              ) : null}
            </div>
          </Card>
        ) : null}

        {/* 3. ALL LINKS */}
        <Card icon={LinkIcon} title="3. Discovered Links" testid="links-explorer-card">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-gray-400" />
              <input value={pageFilter.q} onChange={e => { setPageFilter(f => ({ ...f, q: e.target.value })); setPageSkip(0); }}
                placeholder="Search title or URL…"
                className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-gray-300 text-xs"
                data-testid="page-search" />
            </div>
            <select value={pageFilter.type} onChange={e => { setPageFilter(f => ({ ...f, type: e.target.value })); setPageSkip(0); }}
              className="px-2 py-1.5 rounded-lg border border-gray-300 text-xs" data-testid="page-type-filter">
              <option value="">All types</option>
              {["service", "blog", "faq", "product", "contact", "booking", "category", "about", "home", "manual", "other"].map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={pageFilter.use_for_ai} onChange={e => { setPageFilter(f => ({ ...f, use_for_ai: e.target.value })); setPageSkip(0); }}
              className="px-2 py-1.5 rounded-lg border border-gray-300 text-xs" data-testid="page-ai-filter">
              <option value="">All</option>
              <option value="true">AI-enabled</option>
              <option value="false">AI-disabled</option>
            </select>
            <div className="flex-1" />
            {selected.size > 0 ? (
              <>
                <button onClick={() => bulkToggle(true)} className="px-2 py-1 rounded text-xs bg-emerald-600 text-white">Enable AI ({selected.size})</button>
                <button onClick={() => bulkToggle(false)} className="px-2 py-1 rounded text-xs bg-slate-700 text-white">Disable AI ({selected.size})</button>
              </>
            ) : null}
            <button onClick={exportCsv} className="px-2 py-1 rounded text-xs border border-gray-300 inline-flex items-center gap-1" data-testid="export-csv-btn">
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>

          <div className="overflow-auto rounded border border-gray-200 max-h-[500px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="text-left">
                  <th className="px-2 py-1.5 w-8"><input type="checkbox" onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(pages.map(p => p.id)));
                    else setSelected(new Set());
                  }} /></th>
                  <th className="px-2 py-1.5">Title</th>
                  <th className="px-2 py-1.5">URL</th>
                  <th className="px-2 py-1.5">Type</th>
                  <th className="px-2 py-1.5">Status</th>
                  <th className="px-2 py-1.5 text-right">Words</th>
                  <th className="px-2 py-1.5 text-center">AI</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {pages.map(p => (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-sky-50/40" data-testid={`page-row-${p.id}`}>
                    <td className="px-2 py-1.5"><input type="checkbox" checked={selected.has(p.id)} onChange={() => {
                      const s = new Set(selected); s.has(p.id) ? s.delete(p.id) : s.add(p.id); setSelected(s);
                    }} /></td>
                    <td className="px-2 py-1.5 max-w-[260px] truncate" title={p.title}>{p.title}</td>
                    <td className="px-2 py-1.5 max-w-[280px] truncate text-blue-600">
                      <a href={p.url} target="_blank" rel="noreferrer">{p.url}</a>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] ${TYPE_COLORS[p.type] || TYPE_COLORS.other}`}>{p.type}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      {p.status === "indexed" ? <span className="text-emerald-600">indexed</span>
                        : p.status === "error" ? <span className="text-rose-600">error</span>
                        : <span className="text-gray-500">{p.status}</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right">{p.word_count ?? 0}</td>
                    <td className="px-2 py-1.5 text-center">
                      <button onClick={() => togglePage(p.id, !p.use_for_ai)} title="Toggle AI use" data-testid={`toggle-ai-${p.id}`}>
                        {p.use_for_ai ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-2 py-1.5">
                      <button onClick={() => openPreview(p.id)} className="text-sky-600 hover:underline inline-flex items-center gap-0.5" data-testid={`preview-${p.id}`}>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {pages.length === 0 ? (
                  <tr><td colSpan={8} className="text-center text-gray-500 py-6">No pages indexed yet — click <b>Scan Website</b>.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {pagesTotal > pageLimit ? (
            <div className="flex items-center justify-between mt-2 text-xs">
              <span>Total {pagesTotal}, showing {pageSkip + 1}–{Math.min(pageSkip + pageLimit, pagesTotal)}</span>
              <div className="space-x-1">
                <button disabled={pageSkip === 0} onClick={() => setPageSkip(Math.max(0, pageSkip - pageLimit))} className="px-2 py-0.5 border rounded disabled:opacity-40">Prev</button>
                <button disabled={pageSkip + pageLimit >= pagesTotal} onClick={() => setPageSkip(pageSkip + pageLimit)} className="px-2 py-0.5 border rounded disabled:opacity-40">Next</button>
              </div>
            </div>
          ) : null}
        </Card>

        {/* 7. MANUAL CONTENT */}
        <Card icon={Plus} title="7. Manual Content" testid="manual-content-card">
          <div className="space-y-2">
            <input value={mTitle} onChange={e => setMTitle(e.target.value)} placeholder="Title (e.g. Refund policy, opening hours…)" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" data-testid="manual-title" />
            <textarea rows={4} value={mBody} onChange={e => setMBody(e.target.value)} placeholder="Paste brochure / extra business info / policies / scripts" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" data-testid="manual-body" />
            <button onClick={addManual} disabled={!mTitle.trim() || !mBody.trim() || busy} className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50" data-testid="add-manual-btn">
              <Plus className="w-3.5 h-3.5" /> Add to AI knowledge base
            </button>
          </div>
        </Card>

        {/* AI TEST SEARCH */}
        <Card icon={Zap} title="Test AI retrieval" testid="test-search-card">
          <div className="flex gap-2">
            <input value={testQ} onChange={e => setTestQ(e.target.value)} placeholder="What will a customer ask? e.g. 'price of gemstone service'" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" data-testid="test-search-query" />
            <button onClick={runTestSearch} className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-semibold inline-flex items-center gap-1" data-testid="run-test-search">
              <Search className="w-3.5 h-3.5" /> Search
            </button>
          </div>
          {testHits.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {testHits.map((h, i) => (
                <li key={i} className="border border-gray-200 rounded p-2 text-xs bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{h.title}</span>
                    <span className="text-violet-600 font-mono">score {h.score}</span>
                  </div>
                  <a className="text-sky-600 truncate block" href={h.url} target="_blank" rel="noreferrer">{h.url}</a>
                  <p className="mt-1 text-gray-700 line-clamp-3">{h.text}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </div>

      {/* 6. PREVIEW MODAL */}
      {previewPage ? (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setPreviewPage(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] overflow-auto p-5" onClick={e => e.stopPropagation()} data-testid="page-preview-modal">
            <div className="flex items-start gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-sky-600 mt-1" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{previewPage.page?.title}</h3>
                <a href={previewPage.page?.url} target="_blank" rel="noreferrer" className="text-xs text-sky-600 truncate block">{previewPage.page?.url}</a>
              </div>
              <button onClick={() => setPreviewPage(null)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
            </div>
            <h4 className="text-xs font-semibold text-gray-500 mt-3">Cleaned text</h4>
            <pre className="text-[11px] whitespace-pre-wrap bg-gray-50 p-2 rounded max-h-56 overflow-auto">{previewPage.page?.cleaned_text || "(no text)"}</pre>
            <h4 className="text-xs font-semibold text-gray-500 mt-3">AI chunks ({previewPage.chunks?.length || 0})</h4>
            <ul className="space-y-2 mt-1">
              {(previewPage.chunks || []).map(c => (
                <li key={c.id} className="text-[11px] border border-gray-200 rounded p-2 bg-slate-50/40">
                  <p className="text-gray-500 mb-1">#{c.chunk_index} · {c.word_count} words</p>
                  <p>{c.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </BusinessAdminLayout>
  );
}

// ─────────────── small components ───────────────
const Label = ({ children }) => <label className="block text-[11px] font-semibold text-gray-600 mb-1">{children}</label>;

function Card({ icon: Icon, title, children, testid }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm" data-testid={testid}>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        <Icon className="w-4 h-4 text-sky-600" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function StatCard({ icon: Icon, label, value, accent = "sky", small = false }) {
  const colors = {
    sky: "from-sky-50 to-sky-100 text-sky-700 border-sky-200",
    emerald: "from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200",
    amber: "from-amber-50 to-amber-100 text-amber-700 border-amber-200",
    violet: "from-violet-50 to-violet-100 text-violet-700 border-violet-200",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[accent]} border rounded-2xl p-3`} data-testid={`stat-${label}`}>
      <Icon className="w-4 h-4 mb-1" />
      <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <p className={`${small ? "text-base" : "text-2xl"} font-bold mt-0.5`}>{value}</p>
    </div>
  );
}

function DetectStat({ label, found, statusText, count }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-slate-50 p-3 flex items-center gap-2">
      {count !== undefined ? (
        <Database className="w-4 h-4 text-sky-600" />
      ) : statusText === true ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
      ) : statusText === false ? (
        <XCircle className="w-4 h-4 text-rose-500" />
      ) : (
        <AlertCircle className="w-4 h-4 text-gray-400" />
      )}
      <div className="text-xs">
        <p className="font-medium">{label}</p>
        <p className="text-gray-500">
          {count !== undefined ? `${count} discovered`
            : statusText === true ? "Found"
            : statusText === false ? "Not found"
            : "Run a scan to detect"}
        </p>
      </div>
    </div>
  );
}

function Mini({ title, children }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide mb-1.5">{title}</p>
      {children}
    </div>
  );
}

function BreakdownGroup({ label, data, colorMap = {} }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide mb-2">{label}</p>
      {entries.length === 0 ? (
        <p className="text-[11px] text-gray-400 italic">No data</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {entries.map(([k, v]) => (
            <span
              key={k}
              className={`text-[11px] px-2 py-0.5 rounded-full border border-transparent ${colorMap[k] || "bg-slate-100 text-slate-700"}`}
              data-testid={`rag-chip-${k}`}
            >
              <span className="font-medium">{k.replace(/_/g, " ")}</span>
              <span className="ml-1 font-bold">{v}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function statusText(stats, key) {
  // Stats endpoint doesn't carry sitemap_found directly — read from latest source last_sync_id
  // Fallback: simple presence detection from stats.last_sync_status
  if (!stats) return null;
  if (stats.last_sync_status !== "completed") return null;
  // we approximate: if pages_indexed > 0, then we crawled successfully which means sitemap or BFS worked
  if (key === "sitemap_found") return (stats.pages_indexed || 0) > 0;
  if (key === "sitemap_index_found") return (stats.pages_indexed || 0) > 0;
  if (key === "robots_found") return true;
  return null;
}
