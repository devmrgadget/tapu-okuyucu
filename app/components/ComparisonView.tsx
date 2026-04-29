"use client";

import { useState, useMemo } from "react";
import type { ComparisonResult, SerhEntry } from "../lib/python-bridge";

interface ComparisonViewProps {
  comparison: ComparisonResult;
  oldDate: string;
  newDate: string;
}

function EntryRow({ entry, variant }: { entry: SerhEntry; variant: string }) {
  return (
    <div
      className={`status-${variant}`}
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1.5fr 1fr",
        gap: 8,
        padding: "10px 16px",
        marginBottom: 2,
        borderRadius: "var(--radius-sm)",
        transition: "background 0.2s",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            marginBottom: 2,
          }}
        >
          İcra Dairesi
        </div>
        <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>
          {entry.icra_dairesi}
        </span>
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            marginBottom: 2,
          }}
        >
          Dosya No
        </div>
        <span style={{ fontSize: 12, color: "var(--text-primary)", fontFamily: "monospace" }}>
          {entry.dosya_no}
        </span>
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            marginBottom: 2,
          }}
        >
          Tarih
        </div>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {entry.tarih}
        </span>
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            marginBottom: 2,
          }}
        >
          Bedel
        </div>
        <span style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}>
          {entry.bedel ? `${entry.bedel} ₺` : "-"}
        </span>
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            marginBottom: 2,
          }}
        >
          Alacaklı
        </div>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {entry.alacakli || "-"}
        </span>
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            marginBottom: 2,
          }}
        >
          Yevmiye
        </div>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {entry.yevmiye_tarih} / {entry.yevmiye_no}
        </span>
      </div>
    </div>
  );
}

function Section({
  title,
  emoji,
  count,
  entries,
  variant,
  badgeClass,
  searchQuery,
  filterType,
}: {
  title: string;
  emoji: string;
  count: number;
  entries: SerhEntry[];
  variant: string;
  badgeClass: string;
  searchQuery: string;
  filterType: string;
}) {
  // Apply search
  const filteredEntries = useMemo(() => {
    let result = entries;
    
    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => 
        (e.icra_dairesi || "").toLowerCase().includes(q) ||
        (e.dosya_no || "").toLowerCase().includes(q) ||
        (e.alacakli || "").toLowerCase().includes(q) ||
        (e.bedel || "").toLowerCase().includes(q) ||
        (e.yevmiye_no || "").toLowerCase().includes(q) ||
        (e.tarih || "").toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [entries, searchQuery]);

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          padding: "12px 18px",
          background: "var(--bg-card)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>{emoji}</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {filteredEntries.length !== count && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {filteredEntries.length} / {count}
            </span>
          )}
          <span className={`badge ${badgeClass}`} style={{ fontSize: 14, padding: "6px 14px" }}>
            {filteredEntries.length}
          </span>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 30,
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          {entries.length === 0 ? "Bu kategoride kayıt bulunmuyor" : "Arama kriterlerine uygun kayıt bulunamadı"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filteredEntries.map((entry, idx) => (
            <EntryRow key={idx} entry={entry} variant={variant} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ComparisonView({
  comparison,
  oldDate,
  newDate,
}: ComparisonViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[] | null>(null);

  // Collect unique types from all entries
  const allTypes = useMemo(() => {
    const types = new Set<string>();
    [...comparison.removed, ...comparison.remaining, ...comparison.added].forEach(e => {
      if (e.type) types.add(e.type);
    });
    return Array.from(types).sort();
  }, [comparison]);

  const activeTypes = selectedTypes === null ? allTypes : selectedTypes;

  const toggleType = (t: string) => {
    if (selectedTypes === null) {
      setSelectedTypes(allTypes.filter(type => type !== t));
    } else {
      if (selectedTypes.includes(t)) {
        setSelectedTypes(selectedTypes.filter(type => type !== t));
      } else {
        setSelectedTypes([...selectedTypes, t]);
      }
    }
  };

  const filterEntries = (entries: SerhEntry[]) => {
    if (activeTypes.length === 0) return [];
    if (activeTypes.length === allTypes.length) return entries;
    return entries.filter(e => e.type && activeTypes.includes(e.type));
  };

  const filteredRemoved = useMemo(() => filterEntries(comparison.removed), [comparison.removed, activeTypes]);
  const filteredRemaining = useMemo(() => filterEntries(comparison.remaining), [comparison.remaining, activeTypes]);
  const filteredAdded = useMemo(() => filterEntries(comparison.added), [comparison.added, activeTypes]);

  return (
    <div>
      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div
          className="glass-card"
          style={{ padding: "18px 20px", textAlign: "center" }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "#34d399",
              marginBottom: 4,
            }}
          >
            {filteredRemoved.length}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            ✅ Kaldırılan Şerh
          </div>
        </div>
        <div
          className="glass-card"
          style={{ padding: "18px 20px", textAlign: "center" }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "#fbbf24",
              marginBottom: 4,
            }}
          >
            {filteredRemaining.length}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            ⏳ Devam Eden Şerh
          </div>
        </div>
        <div
          className="glass-card"
          style={{ padding: "18px 20px", textAlign: "center" }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "#f87171",
              marginBottom: 4,
            }}
          >
            {filteredAdded.length}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            🆕 Yeni Eklenen Şerh
          </div>
        </div>
      </div>

      {/* Date range indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          marginBottom: 20,
          padding: "12px 0",
        }}
      >
        <span className="badge badge-blue" style={{ fontSize: 12, padding: "6px 16px" }}>
          📅 {oldDate}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 20 }}>→</span>
        <span className="badge badge-green" style={{ fontSize: 12, padding: "6px 16px" }}>
          📅 {newDate}
        </span>
      </div>

      {/* Search and Filter Bar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: 24,
          padding: "14px 18px",
          background: "var(--bg-card)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--text-muted)" }}>🔍</span>
            <input
              className="input-field"
              type="text"
              placeholder="Arama... (İcra dairesi, dosya no, alacaklı, bedel)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, fontSize: 13, width: "100%" }}
            />
          </div>
          {(searchQuery || selectedTypes !== null) && (
            <button
              className="btn-secondary"
              style={{ padding: "8px 14px", fontSize: 12, whiteSpace: "nowrap" }}
              onClick={() => { setSearchQuery(""); setSelectedTypes(null); }}
            >
              ✕ Temizle
            </button>
          )}
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 8 }}>Şerh Türü:</span>
          {allTypes.map(t => {
            const isActive = activeTypes.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  borderRadius: "20px",
                  border: `1px solid ${isActive ? "var(--accent-blue)" : "var(--border-color)"}`,
                  background: isActive ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  color: isActive ? "var(--accent-blue)" : "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <div style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: `1px solid ${isActive ? "var(--accent-blue)" : "var(--border-color)"}`,
                  background: isActive ? "var(--accent-blue)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {isActive && <span style={{ color: "white", fontSize: 10 }}>✓</span>}
                </div>
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sections */}
      <Section
        title="Kaldırılan Şerhler"
        emoji="✅"
        count={comparison.removed_count}
        entries={filteredRemoved}
        variant="removed"
        badgeClass="badge-green"
        searchQuery={searchQuery}
        filterType="all"
      />

      <Section
        title="Devam Eden Şerhler"
        emoji="⏳"
        count={comparison.remaining_count}
        entries={filteredRemaining}
        variant="remaining"
        badgeClass="badge-amber"
        searchQuery={searchQuery}
        filterType="all"
      />

      <Section
        title="Yeni Eklenen Şerhler"
        emoji="🆕"
        count={comparison.added_count}
        entries={filteredAdded}
        variant="added"
        badgeClass="badge-red"
        searchQuery={searchQuery}
        filterType="all"
      />
    </div>
  );
}
