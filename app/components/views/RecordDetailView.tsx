"use client";

import type { Malik, TapuRecord, SerhEntry } from "../../lib/python-bridge";
import SerhList from "../SerhList";

interface RecordDetailViewProps {
  selectedMalik: Malik;
  selectedRecord: TapuRecord;
  loading: boolean;
  serhGrouped: Record<string, SerhEntry[]>;
  serhEntries: SerhEntry[];
  openExportModal: (id: number) => void;
}

export default function RecordDetailView({
  selectedMalik,
  selectedRecord,
  loading,
  serhGrouped,
  serhEntries,
  openExportModal,
}: RecordDetailViewProps) {
  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Şerh Detayları</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            {selectedMalik.name} • Tarih: {selectedRecord.tapu_date}
          </p>
        </div>
        <button className="btn-success" onClick={() => openExportModal(selectedRecord.id)}>📊 Excel&apos;e Aktar</button>
      </div>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => (<div key={i} className="loading-shimmer" style={{ height: 80 }} />))}
        </div>
      ) : (
        <SerhList grouped={serhGrouped} totalEntries={serhEntries.length} />
      )}
    </div>
  );
}
