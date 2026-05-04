"use client";

import type { Malik, TapuRecord } from "../../lib/python-bridge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between flex-wrap" style={{ marginBottom: 32, gap: 16 }}>
        <div>
          <h2 className="text-2xl font-bold" style={{ marginBottom: 8 }}>{selectedMalik.name}</h2>
          <p className="text-sm text-muted-foreground">Tapu kayıtları ve şerh bilgileri</p>
        </div>
        <div className="flex" style={{ gap: 12 }}>
          {tapuRecords.length >= 2 && (
            <Button variant="secondary" onClick={handleCompare}>🔄 Karşılaştır</Button>
          )}
          <Button variant="default" onClick={handleAddTapuRecord} disabled={loading}>
            {loading ? "⏳ Yükleniyor..." : "📄 Tapu Kaydı Ekle"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col" style={{ gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="loading-shimmer rounded-xl" style={{ height: 80 }} />
          ))}
        </div>
      ) : tapuRecords.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-5xl" style={{ marginBottom: 20 }}>📄</div>
          <h3 className="text-lg font-semibold" style={{ marginBottom: 12 }}>Henüz tapu kaydı yok</h3>
          <p className="text-muted-foreground text-sm" style={{ marginBottom: 24 }}>PDF dosyası yükleyerek tapu kaydı ekleyin</p>
          <Button onClick={handleAddTapuRecord}>📄 PDF Yükle</Button>
        </Card>
      ) : (
        <div className="flex flex-col" style={{ gap: 16 }}>
          {tapuRecords.map((record) => (
            <Card
              key={record.id}
              className="p-5 cursor-pointer flex items-center justify-between hover:border-blue-500/30"
              onClick={() => openRecordDetail(record)}
            >
              <div className="flex items-center" style={{ gap: 16 }}>
                <div className="rounded-xl bg-blue-500/15 flex items-center justify-center text-xl shrink-0" style={{ width: 44, height: 44 }}>📜</div>
                <div>
                  <div className="text-[15px] font-semibold" style={{ marginBottom: 4 }}>Tapu Kaydı - {record.tapu_date}</div>
                  <div className="text-xs text-muted-foreground">{record.total_entries} şerh kaydı</div>
                </div>
              </div>
              <div className="flex items-center" style={{ gap: 12 }}>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  style={{ padding: "8px 14px", fontSize: 12 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openExportModal(record.id);
                  }}
                >
                  📊 Excel
                </Button>
                <Button
                  variant="destructive"
                  style={{ fontSize: 12 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRecord(record.id);
                  }}
                >
                  🗑️
                </Button>
                <span className="text-muted-foreground text-lg" style={{ marginLeft: 4 }}>→</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
