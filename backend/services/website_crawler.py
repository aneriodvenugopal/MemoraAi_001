"""
Website Intelligence Crawler.

Discovers a tenant's website, parses sitemap.xml / sitemap_index.xml /
robots.txt, BFS-crawls internal links up to a configured depth, extracts
clean text + structured data (services, FAQs, business info, products,
booking links), chunks the text, and persists everything per-tenant for
the AI reply engine to use.

Collections:
- website_sources         : per-tenant primary URL, depth, schedule
- website_pages           : every discovered page + status + cleaned text
- website_chunks          : ~500-word chunks for retrieval
- website_structured_data : services / faqs / products / business_info
- website_sync_logs       : crawl runs (started/completed/error)
"""
from __future__ import annotations

import re
import json
import logging
import asyncio
import urllib.parse as _u
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Set
from xml.etree import ElementTree as ET

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ─────────────── Config ───────────────
USER_AGENT = "MemoraAI-WebsiteIntel/1.0 (+https://memoraai.in)"
TIMEOUT = 15
MAX_BYTES_PER_PAGE = 2_000_000  # 2 MB

DEPTH_PRESETS = {
    "light": 25,
    "medium": 100,
    "deep": 1000,
}

# URL types we tag during discovery
TYPE_PATTERNS: List[Tuple[str, re.Pattern]] = [
    ("service",  re.compile(r"/(service|services|treatment|offering)s?(/|$)", re.I)),
    ("blog",     re.compile(r"/(blog|articles?|news|posts?)(/|$)", re.I)),
    ("faq",      re.compile(r"/(faq|faqs|help|q-?and-?a)(/|$)", re.I)),
    ("product",  re.compile(r"/(product|shop|store|item)s?(/|$)", re.I)),
    ("contact",  re.compile(r"/(contact|reach|connect|location)(/|$)", re.I)),
    ("booking",  re.compile(r"/(book|booking|appointment|schedule|reserve|consult)(/|$)", re.I)),
    ("about",    re.compile(r"/(about|who-we-are|company|team)(/|$)", re.I)),
    ("category", re.compile(r"/(category|categories|collections?)(/|$)", re.I)),
]


def _classify_url(url: str) -> str:
    path = _u.urlparse(url).path
    for tag, pat in TYPE_PATTERNS:
        if pat.search(path):
            return tag
    if path in ("", "/"):
        return "home"
    return "other"


def _normalize_url(url: str) -> str:
    """Canonicalize: lowercase host, strip fragment, drop tracking params."""
    if not url:
        return ""
    p = _u.urlparse(url.strip())
    if not p.scheme:
        p = p._replace(scheme="https")
    netloc = p.netloc.lower()
    # strip default ports
    if netloc.endswith(":80") or netloc.endswith(":443"):
        netloc = netloc.rsplit(":", 1)[0]
    # drop tracking params
    bad = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
           "gclid", "fbclid", "ref", "ref_src"}
    qs = [(k, v) for k, v in _u.parse_qsl(p.query, keep_blank_values=False) if k.lower() not in bad]
    query = _u.urlencode(qs, doseq=True)
    path = p.path or "/"
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
    return _u.urlunparse((p.scheme, netloc, path, "", query, ""))


def _same_host(seed: str, url: str) -> bool:
    return _u.urlparse(seed).netloc.lower() == _u.urlparse(url).netloc.lower()


# ─────────────── HTML cleaner & extractor ───────────────
_BAD_TAGS = ("script", "style", "noscript", "iframe", "svg", "form", "footer",
             "header", "nav", "aside")


def _clean_text(soup: BeautifulSoup) -> str:
    for t in soup(_BAD_TAGS):
        t.decompose()
    text = soup.get_text(separator="\n")
    lines = [ln.strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if len(ln) > 1]
    out: List[str] = []
    for ln in lines:
        if not out or out[-1] != ln:
            out.append(ln)
    return "\n".join(out)


_PRICE_RE = re.compile(
    r"(?:₹|INR|Rs\.?|USD|\$)\s*([\d][\d,]*(?:\.\d{1,2})?)|"
    r"([\d][\d,]*(?:\.\d{1,2})?)\s*(?:rupees|inr|usd|dollars?)",
    re.I,
)


def _extract_jsonld(soup: BeautifulSoup) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "")
        except Exception:
            continue
        if isinstance(data, list):
            out.extend(d for d in data if isinstance(d, dict))
        elif isinstance(data, dict):
            out.append(data)
    return out


def _extract_structured(url: str, soup: BeautifulSoup, text: str) -> Dict[str, Any]:
    """Heuristic + JSON-LD extraction of services / faqs / business info / products."""
    services: List[Dict[str, Any]] = []
    faqs: List[Dict[str, Any]] = []
    products: List[Dict[str, Any]] = []
    business: Dict[str, Any] = {}

    for j in _extract_jsonld(soup):
        t = (j.get("@type") or "").lower() if isinstance(j.get("@type"), str) else ""
        types = j.get("@type") if isinstance(j.get("@type"), list) else [t]
        types = [str(x).lower() for x in types]

        if any("faqpage" == x for x in types):
            for q in j.get("mainEntity") or []:
                if isinstance(q, dict):
                    a = q.get("acceptedAnswer") or {}
                    faqs.append({
                        "question": q.get("name", "")[:300],
                        "answer": (a.get("text") if isinstance(a, dict) else "")[:1200],
                    })
        if any(x in ("product", "service") for x in types):
            offer = j.get("offers") or {}
            if isinstance(offer, list) and offer:
                offer = offer[0]
            price = offer.get("price") if isinstance(offer, dict) else None
            currency = offer.get("priceCurrency") if isinstance(offer, dict) else None
            entry = {
                "name": str(j.get("name", ""))[:200],
                "description": str(j.get("description", ""))[:500],
                "price": price,
                "currency": currency,
                "url": url,
            }
            (products if "product" in types else services).append(entry)
        if any(x in ("organization", "localbusiness") for x in types):
            business.update({
                "name": j.get("name") or business.get("name"),
                "phone": j.get("telephone") or business.get("phone"),
                "email": j.get("email") or business.get("email"),
                "address": json.dumps(j.get("address"))[:500] if j.get("address") else business.get("address"),
                "hours": json.dumps(j.get("openingHours"))[:500] if j.get("openingHours") else business.get("hours"),
            })

    # Heuristic: phone / email / pincode in text
    if not business.get("phone"):
        m = re.search(r"(?:\+?91[\s\-]?)?[6-9]\d{4}[\s\-]?\d{5}", text)
        if m:
            business["phone"] = m.group(0)
    if not business.get("email"):
        m = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
        if m:
            business["email"] = m.group(0)

    # Heuristic FAQ detection (h2/h3 ending with ?)
    for h in soup.find_all(["h2", "h3", "h4"]):
        q = h.get_text(strip=True)
        if q.endswith("?") and len(q) < 200:
            sib = h.find_next(["p", "div"])
            if sib:
                a = sib.get_text(" ", strip=True)[:800]
                if a:
                    faqs.append({"question": q, "answer": a})

    # Heuristic price detection
    prices = []
    for m in _PRICE_RE.finditer(text):
        raw = (m.group(1) or m.group(2) or "").replace(",", "")
        if raw:
            try:
                prices.append(float(raw))
            except ValueError:
                pass
    if prices and not services:
        title = (soup.title.string if soup.title else "") or url
        services.append({
            "name": (title or "Service").strip()[:120],
            "price": prices[0],
            "currency": "INR" if "₹" in text or "INR" in text else "",
            "url": url,
        })

    return {
        "services": services,
        "faqs": faqs,
        "products": products,
        "business": business,
    }


# ─────────────── Sitemap & robots ───────────────
async def _fetch_text(client: httpx.AsyncClient, url: str) -> Optional[str]:
    try:
        r = await client.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT, follow_redirects=True)
        if r.status_code == 200 and len(r.content) <= MAX_BYTES_PER_PAGE:
            return r.text
    except Exception as e:
        logger.debug(f"fetch fail {url}: {e}")
    return None


async def _parse_sitemap(client: httpx.AsyncClient, url: str, depth: int = 0,
                         seen: Optional[Set[str]] = None) -> List[str]:
    if seen is None:
        seen = set()
    if url in seen or depth > 3:
        return []
    seen.add(url)
    txt = await _fetch_text(client, url)
    if not txt:
        return []
    urls: List[str] = []
    try:
        # remove namespace
        txt2 = re.sub(r'\sxmlns="[^"]+"', "", txt, count=1)
        root = ET.fromstring(txt2)
    except Exception:
        return []
    for loc in root.iter("loc"):
        u = (loc.text or "").strip()
        if not u:
            continue
        if root.tag.lower().endswith("sitemapindex") or u.endswith(".xml"):
            urls.extend(await _parse_sitemap(client, u, depth + 1, seen))
        else:
            urls.append(u)
    return urls


async def _parse_robots(client: httpx.AsyncClient, base: str) -> Tuple[List[str], List[str]]:
    """Return (sitemaps, disallow_patterns)."""
    txt = await _fetch_text(client, _u.urljoin(base, "/robots.txt"))
    sitemaps: List[str] = []
    disallow: List[str] = []
    if not txt:
        return sitemaps, disallow
    for line in txt.splitlines():
        line = line.strip()
        if line.lower().startswith("sitemap:"):
            sitemaps.append(line.split(":", 1)[1].strip())
        elif line.lower().startswith("disallow:"):
            v = line.split(":", 1)[1].strip()
            if v:
                disallow.append(v)
    return sitemaps, disallow


# ─────────────── BFS crawler ───────────────
async def _crawl_bfs(client: httpx.AsyncClient, seeds: List[str], host_seed: str,
                     max_pages: int, disallow: List[str]) -> List[Tuple[str, str, str, int]]:
    """Returns list of (url, title, cleaned_text, word_count)."""
    visited: Set[str] = set()
    queue: List[str] = list(dict.fromkeys(_normalize_url(s) for s in seeds))
    out: List[Tuple[str, str, str, int]] = []

    def _allowed(url: str) -> bool:
        path = _u.urlparse(url).path
        for d in disallow:
            if path.startswith(d):
                return False
        return True

    while queue and len(out) < max_pages:
        url = queue.pop(0)
        if url in visited:
            continue
        visited.add(url)
        if not _same_host(host_seed, url) or not _allowed(url):
            continue
        try:
            r = await client.get(url, headers={"User-Agent": USER_AGENT},
                                 timeout=TIMEOUT, follow_redirects=True)
            if r.status_code != 200 or "html" not in (r.headers.get("content-type") or "").lower():
                continue
            if len(r.content) > MAX_BYTES_PER_PAGE:
                continue
            soup = BeautifulSoup(r.text, "lxml")
            title = (soup.title.string.strip() if soup.title and soup.title.string else url)[:280]
            text = _clean_text(soup)
            words = len(text.split())
            out.append((url, title, text, words))
            # enqueue more links
            if len(out) < max_pages:
                for a in soup.find_all("a", href=True):
                    nxt = _normalize_url(_u.urljoin(url, a["href"]))
                    if nxt and nxt not in visited and _same_host(host_seed, nxt):
                        queue.append(nxt)
        except Exception as e:
            logger.debug(f"crawl fail {url}: {e}")
    return out


# ─────────────── Chunker ───────────────
def _chunk(text: str, target_words: int = 220) -> List[str]:
    paras = [p.strip() for p in text.split("\n") if p.strip()]
    chunks: List[str] = []
    buf: List[str] = []
    count = 0
    for p in paras:
        w = len(p.split())
        if count + w > target_words and buf:
            chunks.append(" ".join(buf))
            buf, count = [], 0
        buf.append(p)
        count += w
    if buf:
        chunks.append(" ".join(buf))
    return [c for c in chunks if len(c.split()) > 6]


# ─────────────── Public entrypoints ───────────────
async def run_crawl(db, tenant_id: str, source_id: str, primary_url: str,
                    additional: List[str], depth_preset: str,
                    sync_id: str) -> Dict[str, Any]:
    """Full crawl workflow. Updates DB collections and returns a summary."""
    max_pages = DEPTH_PRESETS.get(depth_preset, DEPTH_PRESETS["medium"])
    seed = _normalize_url(primary_url)
    host_seed = seed
    extras = [_normalize_url(u) for u in additional if u]
    started = datetime.now(timezone.utc)

    summary: Dict[str, Any] = {
        "started_at": started, "tenant_id": tenant_id, "source_id": source_id,
        "primary_url": seed, "depth_preset": depth_preset,
        "max_pages": max_pages,
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # Step 1 — robots.txt
        sm_from_robots, disallow = await _parse_robots(client, seed)

        # Step 2 — sitemaps
        sitemap_candidates = list(dict.fromkeys(
            sm_from_robots + [_u.urljoin(seed, "/sitemap.xml"),
                              _u.urljoin(seed, "/sitemap_index.xml"),
                              _u.urljoin(seed, "/sitemap-index.xml")]
        ))
        sitemap_urls: List[str] = []
        sitemap_found = False
        sitemap_index_found = False
        for sm in sitemap_candidates:
            urls = await _parse_sitemap(client, sm)
            if urls:
                sitemap_urls.extend(urls)
                if "sitemap_index" in sm or "sitemap-index" in sm:
                    sitemap_index_found = True
                else:
                    sitemap_found = True

        sitemap_urls = list(dict.fromkeys(_normalize_url(u) for u in sitemap_urls))
        seeds = [seed] + extras + sitemap_urls
        seeds = list(dict.fromkeys(seeds))[:max_pages * 2]

        # Step 3 — BFS
        crawled = await _crawl_bfs(client, seeds, host_seed, max_pages, disallow)

    # Step 4 — Persist
    page_count = 0
    chunk_count = 0
    services_total: List[Dict] = []
    faqs_total: List[Dict] = []
    products_total: List[Dict] = []
    business_info: Dict[str, Any] = {}

    # Wipe stale chunks but keep page rows so manual toggles persist
    await db.website_chunks.delete_many({"tenant_id": tenant_id, "source_id": source_id})

    for url, title, text, words in crawled:
        page_id = f"page_{abs(hash(url)) % (10 ** 12)}"
        url_type = _classify_url(url)
        soup_obj = BeautifulSoup(f"<html><head><title>{title}</title></head><body>{text}</body></html>", "lxml")
        # Re-extract structured data using the original-ish HTML (we lost the raw
        # HTML on purpose to save space; structured data extraction works on text + JSON-LD presence,
        # but keeping titles & text is enough for retrieval. JSON-LD recovery is optional here.)
        struct = _extract_structured(url, soup_obj, text)

        await db.website_pages.update_one(
            {"tenant_id": tenant_id, "url": url},
            {"$set": {
                "id": page_id, "tenant_id": tenant_id, "source_id": source_id,
                "url": url, "title": title, "type": url_type,
                "status": "indexed", "word_count": words,
                "last_crawled_at": datetime.now(timezone.utc),
                "cleaned_text": text[:60000],
            }, "$setOnInsert": {
                "use_for_ai": True,
                "first_seen_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
        page_count += 1

        for i, ch in enumerate(_chunk(text)):
            await db.website_chunks.insert_one({
                "id": f"{page_id}_chunk_{i}",
                "tenant_id": tenant_id, "source_id": source_id,
                "page_id": page_id, "url": url, "page_type": url_type,
                "title": title, "chunk_index": i, "text": ch,
                "word_count": len(ch.split()),
                "created_at": datetime.now(timezone.utc),
            })
            chunk_count += 1

        services_total.extend(struct["services"])
        faqs_total.extend(struct["faqs"])
        products_total.extend(struct["products"])
        if struct["business"]:
            business_info = {**business_info, **{k: v for k, v in struct["business"].items() if v}}

    # Persist structured data (replace per-source)
    await db.website_structured_data.delete_many({"tenant_id": tenant_id, "source_id": source_id})
    if services_total or faqs_total or products_total or business_info:
        await db.website_structured_data.insert_one({
            "id": f"struct_{source_id}",
            "tenant_id": tenant_id, "source_id": source_id,
            "services": services_total[:100],
            "faqs": faqs_total[:100],
            "products": products_total[:100],
            "business": business_info,
            "extracted_at": datetime.now(timezone.utc),
        })

    finished = datetime.now(timezone.utc)
    duration_ms = int((finished - started).total_seconds() * 1000)

    summary.update({
        "sitemap_found": sitemap_found,
        "sitemap_index_found": sitemap_index_found,
        "robots_found": bool(sm_from_robots or disallow),
        "internal_links_discovered": len(seeds),
        "pages_indexed": page_count,
        "chunks_created": chunk_count,
        "services_extracted": len(services_total),
        "faqs_extracted": len(faqs_total),
        "products_extracted": len(products_total),
        "duration_ms": duration_ms,
        "completed_at": finished,
        "status": "completed",
    })

    await db.website_sync_logs.update_one(
        {"id": sync_id},
        {"$set": summary},
        upsert=True,
    )
    await db.website_sources.update_one(
        {"id": source_id, "tenant_id": tenant_id},
        {"$set": {
            "last_synced_at": finished,
            "last_sync_id": sync_id,
            "pages_indexed": page_count,
            "chunks_count": chunk_count,
            "status": "ready",
        }}
    )
    return summary


def _score(query: str, text: str) -> float:
    q = set(re.findall(r"\w+", query.lower()))
    t = re.findall(r"\w+", (text or "").lower())
    if not q or not t:
        return 0.0
    tset = set(t)
    overlap = q & tset
    if not overlap:
        return 0.0
    # tf-ish bonus
    tf = sum(t.count(w) for w in overlap) / len(t)
    return len(overlap) / len(q) + 0.3 * tf


async def search_chunks(db, tenant_id: str, query: str, k: int = 5) -> List[Dict[str, Any]]:
    """Lightweight keyword/TF retrieval over the tenant's website_chunks."""
    if not query:
        return []
    q_words = re.findall(r"\w+", query.lower())
    if not q_words:
        return []
    or_clauses = [{"text": {"$regex": re.escape(w), "$options": "i"}} for w in q_words[:8]]
    cursor = db.website_chunks.find(
        {"tenant_id": tenant_id, "$or": or_clauses},
        {"_id": 0, "text": 1, "url": 1, "title": 1, "page_type": 1}
    ).limit(50)
    candidates = await cursor.to_list(50)
    scored = sorted(
        ((c, _score(query, c.get("text", ""))) for c in candidates),
        key=lambda x: x[1], reverse=True,
    )
    return [{**c, "score": round(s, 3)} for c, s in scored[:k] if s > 0]
