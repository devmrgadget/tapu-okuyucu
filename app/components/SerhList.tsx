"use client";

import { useState, useMemo } from "react";
import type { SerhEntry } from "../lib/python-bridge";

interface SerhListProps {
  grouped: Record<string, SerhEntry[]>;
  totalEntries: number;
}

export default function SerhList({ grouped, totalEntries }: SerhListProps) {
  const dairesiKeys = Object.keys(grouped).sort();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(dairesiKeys.map((k) => [k, false]))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[] | null>(null);

  // Collect unique types from all entries
  const allTypes = useMemo(() => {
    const types = new Set<string>();
    Object.values(grouped).flat().forEach(e => {
      if (e.type) types.add(e.type);
    });
    return Array.from(types).sort();
  }, [grouped]);

  // Filter grouped entries based on search and type filter
  const filteredGrouped = useMemo(() => {
    const result: Record<string, SerhEntry[]> = {};
    const q = searchQuery.toLowerCase().trim();

    for (const [dairesi, entries] of Object.entries(grouped)) {
      let filtered = entries;

      const activeTypes = selectedTypes === null ? allTypes : selectedTypes;

      // Apply type filter
      if (activeTypes.length === 0) {
        filtered = [];
      } else if (activeTypes.length !== allTypes.length) {
        filtered = filtered.filter(e => e.type && activeTypes.includes(e.type));
      }

      // Apply search query
      if (q) {
        filtered = filtered.filter(e =>
          (e.icra_dairesi || "").toLowerCase().includes(q) ||
          (e.dosya_no || "").toLowerCase().includes(q) ||
          (e.alacakli || "").toLowerCase().includes(q) ||
          (e.bedel || "").toLowerCase().includes(q) ||
          (e.yevmiye_no || "").toLowerCase().includes(q) ||
          (e.tarih || "").toLowerCase().includes(q) ||
          (e.type || "").toLowerCase().includes(q)
        );
      }

      if (filtered.length > 0) {
        result[dairesi] = filtered;
      }
    }

    return result;
  }, [grouped, searchQuery, selectedTypes, allTypes]);

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

  const filteredDairesiKeys = Object.keys(filteredGrouped).sort();
  const filteredTotal = Object.values(filteredGrouped).reduce((sum, entries) => sum + entries.length, 0);

  const toggleGroup = (dairesi: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [dairesi]: !prev[dairesi],
    }));
  };

  const expandAll = () => {
    setExpandedGroups(Object.fromEntries(filteredDairesiKeys.map(k => [k, true])));
  };

  const collapseAll = () => {
    setExpandedGroups(Object.fromEntries(filteredDairesiKeys.map(k => [k, false])));
  };

  return (
    <div>
      {/* Search and Filter Bar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: 16,
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

      {/* Summary header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          padding: "14px 20px",
          background: "rgba(59, 130, 246, 0.08)",
          borderRadius: "var(--radius-md)",
          border: "1px solid rgba(59, 130, 246, 0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>
            {filteredTotal !== totalEntries ? `Bulunan: ${filteredTotal} / Toplam: ${totalEntries}` : `Toplam Şerh Sayısı`}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="btn-secondary"
            style={{ padding: "4px 10px", fontSize: 11 }}
            onClick={expandAll}
          >
            Tümünü Aç
          </button>
          <button
            className="btn-secondary"
            style={{ padding: "4px 10px", fontSize: 11 }}
            onClick={collapseAll}
          >
            Tümünü Kapat
          </button>
          <span className="badge badge-blue" style={{ fontSize: 14, padding: "6px 14px" }}>
            {filteredTotal}
          </span>
        </div>
      </div>

      {/* No results */}
      {filteredDairesiKeys.length === 0 && (searchQuery || selectedTypes !== null) && (
        <div
          className="glass-card"
          style={{ padding: 40, textAlign: "center" }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Arama kriterlerine uygun şerh bulunamadı
          </p>
        </div>
      )}

      {/* İcra Dairesi groups */}
      <div className="stagger-children">
        {filteredDairesiKeys.map((dairesi) => {
          const entries = filteredGrouped[dairesi];

          // Group by dosya_no within each İcra Dairesi
          const byDosya: Record<string, SerhEntry[]> = {};
          entries.forEach((entry) => {
            const key = entry.dosya_no || "Bilinmeyen";
            if (!byDosya[key]) byDosya[key] = [];
            byDosya[key].push(entry);
          });

          return (
            <div key={dairesi} style={{ marginBottom: 16 }}>
              {/* İcra Dairesi Header */}
              <div
                onClick={() => toggleGroup(dairesi)}
                style={{
                  cursor: "pointer",
                  background:
                    "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.1))",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  borderRadius: expandedGroups[dairesi]
                    ? "var(--radius-md) var(--radius-md) 0 0"
                    : "var(--radius-md)",
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <span style={{ fontSize: 18 }}>🏛️</span>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {dairesi}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="badge badge-purple">
                    {entries.length} şerh
                  </span>
                  <span
                    style={{
                      transform: expandedGroups[dairesi] ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                      fontSize: 12,
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "rgba(139, 92, 246, 0.1)",
                    }}
                  >
                    ▼
                  </span>
                </div>
              </div>

              {/* Dosya groups */}
              {expandedGroups[dairesi] && (
                <div
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderTop: "none",
                    borderRadius: "0 0 var(--radius-md) var(--radius-md)",
                    overflow: "hidden",
                  }}
                >
                {Object.entries(byDosya).map(
                  ([dosyaNo, dosyaEntries], dosyaIdx) => (
                    <div key={dosyaNo}>
                      {/* Dosya No sub-header */}
                      <div
                        style={{
                          padding: "10px 20px",
                          background: "rgba(245, 158, 11, 0.06)",
                          borderBottom: "1px solid var(--border-color)",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 13 }}>📁</span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--accent-amber)",
                          }}
                        >
                          Dosya No: {dosyaNo}
                        </span>
                        <span
                          className="badge badge-amber"
                          style={{ fontSize: 10, marginLeft: "auto" }}
                        >
                          {dosyaEntries.length} kayıt
                        </span>
                      </div>

                      {/* Entry rows */}
                      {dosyaEntries.map((entry, entryIdx) => (
                        <div
                          key={entryIdx}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr 1fr",
                            gap: 12,
                            padding: "12px 20px",
                            borderBottom:
                              entryIdx < dosyaEntries.length - 1
                                ? "1px solid var(--border-subtle)"
                                : dosyaIdx <
                                  Object.keys(byDosya).length - 1
                                ? "1px solid var(--border-color)"
                                : "none",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(59, 130, 246, 0.04)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "var(--text-muted)",
                                marginBottom: 3,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                              }}
                            >
                              Tür
                            </div>
                            <span
                              className={`badge ${
                                entry.type.includes("htiyati")
                                  ? "badge-amber"
                                  : "badge-red"
                              }`}
                              style={{ fontSize: 10 }}
                            >
                              {entry.type}
                            </span>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "var(--text-muted)",
                                marginBottom: 3,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                              }}
                            >
                              Yevmiye Tarihi
                            </div>
                            <span
                              style={{
                                fontSize: 13,
                                color: "var(--text-primary)",
                              }}
                            >
                              {entry.yevmiye_tarih || "-"}
                            </span>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "var(--text-muted)",
                                marginBottom: 3,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                              }}
                            >
                              Yevmiye No
                            </div>
                            <span
                              style={{
                                fontSize: 13,
                                color: "var(--text-primary)",
                                fontFamily: "monospace",
                              }}
                            >
                              {entry.yevmiye_no || "-"}
                            </span>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "var(--text-muted)",
                                marginBottom: 3,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                              }}
                            >
                              Bedel
                            </div>
                            <span
                              style={{
                                fontSize: 13,
                                color: "#f87171",
                                fontWeight: 600,
                              }}
                            >
                              {entry.bedel ? `${entry.bedel} ₺` : "-"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
