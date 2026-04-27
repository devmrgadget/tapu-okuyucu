"use client";

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
}: {
  title: string;
  emoji: string;
  count: number;
  entries: SerhEntry[];
  variant: string;
  badgeClass: string;
}) {
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
        <span className={`badge ${badgeClass}`} style={{ fontSize: 14, padding: "6px 14px" }}>
          {count}
        </span>
      </div>

      {entries.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 30,
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          Bu kategoride kayıt bulunmuyor
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {entries.map((entry, idx) => (
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
            {comparison.removed_count}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            ✅ Kaldırılan Haciz
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
            {comparison.remaining_count}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            ⏳ Devam Eden Haciz
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
            {comparison.added_count}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            🆕 Yeni Eklenen Haciz
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
          marginBottom: 28,
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

      {/* Sections */}
      <Section
        title="Kaldırılan Hacizler"
        emoji="✅"
        count={comparison.removed_count}
        entries={comparison.removed}
        variant="removed"
        badgeClass="badge-green"
      />

      <Section
        title="Devam Eden Hacizler"
        emoji="⏳"
        count={comparison.remaining_count}
        entries={comparison.remaining}
        variant="remaining"
        badgeClass="badge-amber"
      />

      <Section
        title="Yeni Eklenen Hacizler"
        emoji="🆕"
        count={comparison.added_count}
        entries={comparison.added}
        variant="added"
        badgeClass="badge-red"
      />
    </div>
  );
}
