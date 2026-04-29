"use client";

import type { Malik, TapuRecord } from "../../lib/python-bridge";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

interface MalikDetailViewProps {
  selectedMalik: Malik;
  tapuRecords: TapuRecord[];
  loading: boolean;
  handleCompare: () => void;
  handleAddTapuRecord: () => void;
  openRecordDetail: (record: TapuRecord) => void;
  openExportModal: (id: number) => void;
  handleDeleteRecord: (id: number) => void;
}

export default function MalikDetailView({
  selectedMalik,
  tapuRecords,
  loading,
  handleCompare,
  handleAddTapuRecord,
  openRecordDetail,
  openExportModal,
  handleDeleteRecord,
}: MalikDetailViewProps) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h2 className="text-2xl font-bold mb-1">{selectedMalik.name}</h2>
          <p className="text-sm text-[var(--text-muted)]">Tapu kayıtları ve şerh bilgileri</p>
        </div>
        <div className="flex gap-2.5">
          {tapuRecords.length >= 2 && (
            <Button variant="secondary" onClick={handleCompare}>🔄 Karşılaştır</Button>
          )}
          <Button variant="primary" onClick={handleAddTapuRecord} disabled={loading}>
            {loading ? "⏳ Yükleniyor..." : "📄 Tapu Kaydı Ekle"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="loading-shimmer h-20 rounded-xl" />
          ))}
        </div>
      ) : tapuRecords.length === 0 ? (
        <Card padding="lg" className="text-center">
          <div className="text-5xl mb-4">📄</div>
          <h3 className="text-lg font-semibold mb-2">Henüz tapu kaydı yok</h3>
          <p className="text-[var(--text-muted)] mb-5">PDF dosyası yükleyerek tapu kaydı ekleyin</p>
          <Button onClick={handleAddTapuRecord}>📄 PDF Yükle</Button>
        </Card>
      ) : (
        <div className="stagger-children flex flex-col gap-3">
          {tapuRecords.map((record) => (
            <Card
              key={record.id}
              className="cursor-pointer flex items-center justify-between hover:border-blue-500/30"
              padding="sm"
              onClick={() => openRecordDetail(record)}
            >
              <div className="flex items-center gap-3.5 px-1">
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center text-lg">📜</div>
                <div>
                  <div className="text-[15px] font-semibold">Tapu Kaydı - {record.tapu_date}</div>
                  <div className="text-xs text-[var(--text-muted)]">{record.total_entries} şerh kaydı</div>
                </div>
              </div>
              <div className="flex items-center gap-2 pr-1">
                <Button
                  variant="success"
                  className="!px-3 !py-1.5 !text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    openExportModal(record.id);
                  }}
                >
                  📊 Excel
                </Button>
                <Button
                  variant="danger"
                  className="!px-3 !py-1.5 !text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRecord(record.id);
                  }}
                >
                  🗑️
                </Button>
                <span className="text-[var(--text-muted)] text-lg ml-1">→</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
