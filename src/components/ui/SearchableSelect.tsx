"use client";

import { useState, useRef, useEffect, useId, KeyboardEvent } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  name?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  style,
  name,
}: SearchableSelectProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && listRef.current) {
      const item = listRef.current.children[highlighted] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted, open]);

  function openDropdown() {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setHighlighted(options.findIndex((o) => o.value === value) || 0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function selectOption(opt: SelectOption) {
    onChange(opt.value);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) selectOption(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", ...style }}>
      {/* Hidden native select for form compatibility */}
      {name && (
        <select name={name} value={value} onChange={() => {}} style={{ display: "none" }} aria-hidden="true">
          <option value="" />
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {/* Trigger button */}
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={openDropdown}
        style={{
          width: "100%",
          padding: "10px 36px 10px 12px",
          background: "var(--nyx-input-bg, rgba(255,255,255,0.06))",
          border: "1px solid var(--nyx-input-border, rgba(255,255,255,0.15))",
          borderRadius: 8,
          color: value ? "var(--nyx-text, #e8e8e8)" : "var(--nyx-text-muted, #888)",
          fontSize: "0.875rem",
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          position: "relative",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          appearance: "none",
          display: "block",
        }}
      >
        {selectedLabel || placeholder}
        <span style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          pointerEvents: "none", color: "var(--nyx-text-muted, #888)", fontSize: "0.7rem",
        }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute",
          zIndex: 9999,
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "var(--nyx-card, #1a1a2e)",
          border: "1px solid var(--nyx-accent-dim, rgba(201,168,76,0.25))",
          borderRadius: 8,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}>
          {/* Search input */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--nyx-accent-dim, rgba(201,168,76,0.12))" }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHighlighted(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Type to search..."
              style={{
                width: "100%",
                padding: "6px 10px",
                background: "var(--nyx-input-bg, rgba(255,255,255,0.08))",
                border: "1px solid var(--nyx-input-border, rgba(255,255,255,0.12))",
                borderRadius: 6,
                color: "var(--nyx-text, #e8e8e8)",
                fontSize: "0.82rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Options list */}
          <ul
            ref={listRef}
            role="listbox"
            aria-labelledby={id}
            style={{
              margin: 0,
              padding: "4px 0",
              maxHeight: 260,
              overflowY: "auto",
              listStyle: "none",
            }}
          >
            {/* Clear option */}
            {!query && (
              <li
                role="option"
                aria-selected={value === ""}
                onClick={() => selectOption({ value: "", label: placeholder })}
                style={{
                  padding: "9px 14px",
                  fontSize: "0.82rem",
                  color: "var(--nyx-text-muted, #888)",
                  cursor: "pointer",
                  fontStyle: "italic",
                }}
              >
                {placeholder}
              </li>
            )}
            {filtered.length === 0 && (
              <li style={{ padding: "10px 14px", fontSize: "0.82rem", color: "var(--nyx-text-muted, #888)" }}>
                No results
              </li>
            )}
            {filtered.map((opt, idx) => {
              const isHighlighted = idx === highlighted;
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectOption(opt)}
                  onMouseEnter={() => setHighlighted(idx)}
                  style={{
                    padding: "9px 14px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    background: isHighlighted
                      ? "rgba(201,168,76,0.12)"
                      : isSelected
                      ? "rgba(201,168,76,0.06)"
                      : "transparent",
                    color: isSelected
                      ? "var(--nyx-accent, #c9a84c)"
                      : "var(--nyx-text, #e8e8e8)",
                    fontWeight: isSelected ? 600 : 400,
                    borderLeft: isSelected ? "3px solid var(--nyx-accent, #c9a84c)" : "3px solid transparent",
                  }}
                >
                  {opt.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
