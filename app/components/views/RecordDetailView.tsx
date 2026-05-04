"use client";

import type { Malik, TapuRecord, SerhEntry } from "../../lib/python-bridge";
import SerhList from "../SerhList";
import { Button } from "@/components/ui/button";

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
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between flex-wrap" style={{ marginBottom: 32, gap: 16 }}>
        <div>
          <h2 className="text-[22px] font-bold" style={{ marginBottom: 8 }}>Şerh Detayları</h2>
          <p className="text-sm text-muted-foreground">
            {selectedMalik.name} • Tarih: {selectedRecord.tapu_date}
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openExportModal(selectedRecord.id)}>
          📊 Excel&apos;e Aktar
        </Button>
      </div>
      {loading ? (
        <div className="flex flex-col" style={{ gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="loading-shimmer rounded-xl" style={{ height: 80 }} />
          ))}
        </div>
      ) : (
        <SerhList grouped={serhGrouped} totalEntries={serhEntries.length} />
      )}
    </div>
  );
}
