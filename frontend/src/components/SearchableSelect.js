import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

/**
 * Accessible, searchable combobox with auto-suggestions.
 * Options: [{value, label, icon?, sublabel?}]
 */
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No match found",
  testid = "searchable-select",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const btnRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(() => options.find(o => o.value === value), [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o =>
      (o.label || "").toLowerCase().includes(q) ||
      (o.sublabel || "").toLowerCase().includes(q) ||
      (o.value || "").toLowerCase().includes(q)
    );
  }, [options, query]);

  // Reset highlight when filtering
  useEffect(() => { setHighlight(0); }, [query, open]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current.focus(), 50);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target) &&
          listRef.current && !listRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const pick = (opt) => {
    onChange(opt.value);
    setOpen(false);
    setQuery("");
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[highlight]) pick(filtered[highlight]); }
    else if (e.key === "Escape") { setOpen(false); setQuery(""); }
  };

  return (
    <div className="relative" data-testid={testid}>
      <button
        type="button"
        ref={btnRef}
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 border rounded-xl text-left text-sm bg-white transition-all ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-sky-300"
        } ${open ? "border-sky-400 ring-2 ring-sky-100" : "border-gray-200"}`}
        data-testid={`${testid}-trigger`}
      >
        <span className={`flex-1 truncate ${selected ? "text-gray-900 font-medium" : "text-gray-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        {value && !disabled && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
            data-testid={`${testid}-clear`}
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-80 flex flex-col overflow-hidden"
          data-testid={`${testid}-listbox`}
        >
          <div className="relative px-2.5 pt-2.5 pb-2 border-b border-gray-100">
            <Search className="absolute left-5 top-[18px] w-3.5 h-3.5 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
              data-testid={`${testid}-search`}
            />
          </div>
          <div className="overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400" data-testid={`${testid}-empty`}>
                {emptyText}
              </div>
            ) : (
              filtered.map((opt, i) => {
                const active = i === highlight;
                const picked = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pick(opt)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                      active ? "bg-sky-50" : ""
                    } ${picked ? "text-sky-700 font-semibold" : "text-gray-800"}`}
                    data-testid={`${testid}-option-${opt.value}`}
                  >
                    <span className="flex-1 truncate">
                      <span className={picked ? "" : "font-medium"}>{opt.label}</span>
                      {opt.sublabel && <span className="text-[11px] text-gray-400 block truncate">{opt.sublabel}</span>}
                    </span>
                    {picked && <Check className="w-4 h-4 text-sky-600 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 font-medium">
            {filtered.length} of {options.length} · type to filter
          </div>
        </div>
      )}
    </div>
  );
}
