"use client";

import { useState } from "react";
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

  const toggleGroup = (dairesi: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [dairesi]: !prev[dairesi],
    }));
  };

  return (
    <div>
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
            Toplam Şerh Sayısı
          </span>
        </div>
        <span className="badge badge-blue" style={{ fontSize: 14, padding: "6px 14px" }}>
          {totalEntries}
        </span>
      </div>

      {/* İcra Dairesi groups */}
      <div className="stagger-children">
        {dairesiKeys.map((dairesi) => {
          const entries = grouped[dairesi];

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
