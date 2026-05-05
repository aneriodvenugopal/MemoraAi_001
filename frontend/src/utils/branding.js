/**
 * Branding URL helpers — single source of truth for the platform logo & icon.
 *
 * All components must use `logoUrl()` / `iconUrl()` (NOT raw `/memoraai-logo.png`)
 * so that:
 *   1. New uploads in SaaS Admin → Platform Settings reflect immediately
 *      (browsers and CDNs see a NEW URL with a fresh `?v=` query string).
 *   2. The same image works in production, where the canonical bytes live in
 *      MongoDB and are served by `GET /api/branding/logo`.
 *
 * The version is fetched once on app load from `/api/branding/version`
 * (returns the upload timestamp). It's cached in localStorage for 60s so
 * we don't hammer the backend, but we ALWAYS refresh after an upload via
 * `bumpBrandingVersion()`.
 */

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : "/api";
const KEY = "memora_brand_version";
const TS_KEY = "memora_brand_version_ts";
const TTL_MS = 60 * 1000;

let _memVersion = null;
let _inflight = null;

function _readCached() {
  try {
    const v = localStorage.getItem(KEY);
    const ts = parseInt(localStorage.getItem(TS_KEY) || "0", 10);
    if (v && Date.now() - ts < TTL_MS) return v;
  } catch (e) {/* noop */}
  return null;
}

function _writeCached(v) {
  try {
    localStorage.setItem(KEY, v);
    localStorage.setItem(TS_KEY, String(Date.now()));
  } catch (e) {/* noop */}
}

export async function fetchBrandingVersion() {
  if (_inflight) return _inflight;
  _inflight = (async () => {
    try {
      const r = await fetch(`${API}/branding/version`, { cache: "no-store" });
      if (!r.ok) throw new Error("v fetch failed");
      const d = await r.json();
      const v = String(d.version || "0");
      _memVersion = v;
      _writeCached(v);
      return v;
    } catch (e) {
      return _memVersion || "0";
    } finally {
      _inflight = null;
    }
  })();
  return _inflight;
}

export function getBrandingVersionSync() {
  if (_memVersion) return _memVersion;
  const cached = _readCached();
  if (cached) {
    _memVersion = cached;
    return cached;
  }
  // Trigger a refresh in the background but return a stable boot value first
  fetchBrandingVersion();
  return "boot";
}

export function bumpBrandingVersion(newVersion) {
  // Called immediately after a successful upload so all <img> tags update next render
  if (newVersion) {
    _memVersion = String(newVersion);
    _writeCached(_memVersion);
  } else {
    _memVersion = String(Date.now());
    _writeCached(_memVersion);
  }
  // Notify any listeners (BrandingProvider) to re-render
  try {
    window.dispatchEvent(new CustomEvent("memora:branding-version", { detail: _memVersion }));
  } catch (e) {/* noop */}
}

export function logoUrl(version) {
  const v = version || getBrandingVersionSync();
  return `${API}/branding/logo?v=${v}`;
}

export function iconUrl(version) {
  const v = version || getBrandingVersionSync();
  return `${API}/branding/icon?v=${v}`;
}

/**
 * Update <link rel=icon> + apple-touch-icon dynamically so browser tabs and
 * iOS home screens pick up the new logo without a hard refresh.
 */
export function refreshFavicons(version) {
  const v = version || getBrandingVersionSync();
  const url = iconUrl(v);
  try {
    const ids = ["app-icon", "app-icon-png"];
    const sel = "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']";
    document.querySelectorAll(sel).forEach((l) => { l.href = url; });
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = url;
    });
  } catch (e) {/* noop */}
}
