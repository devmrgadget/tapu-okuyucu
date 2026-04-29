"use client";

import type { Malik } from "../../lib/python-bridge";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

interface HomeViewProps {
  maliks: Malik[];
  setShowAddModal: (b: boolean) => void;
  openMalikDetail: (malik: Malik) => void;
  handleDeleteMalik: (id: number, name: string) => void;
}

export default function HomeView({
  maliks,
  setShowAddModal,
  openMalikDetail,
  handleDeleteMalik,
}: HomeViewProps) {
  return (
    <div className="animate-fade-in">
      <div className="mb-7">
        <h2 className="text-2xl font-bold mb-1.5">Malikler</h2>
        <p className="text-sm text-[var(--text-muted)]">Tapu kayıtlarını incelemek için bir malik seçin veya yeni ekleyin</p>
      </div>

      {maliks.length === 0 ? (
        <Card padding="lg" className="text-center">
          <div className="text-5xl mb-4">👤</div>
          <h3 className="text-lg font-semibold mb-2">Henüz malik eklenmemiş</h3>
          <p className="text-[var(--text-muted)] mb-5">Başlamak için yeni bir malik ekleyin</p>
          <Button onClick={() => setShowAddModal(true)}>➕ İlk Maliki Ekle</Button>
        </Card>
      ) : (
        <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {maliks.map((malik) => (
            <Card
              key={malik.id}
              className="cursor-pointer relative flex flex-col"
              padding="md"
              onClick={() => openMalikDetail(malik)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg font-bold text-white shrink-0">
                  {malik.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold line-clamp-1">{malik.name}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{malik.record_count || 0} tapu kaydı</p>
                </div>
              </div>
              <div className="flex justify-between items-center mt-auto pt-2">
                <span className="text-[11px] text-[var(--text-muted)]">
                  {new Date(malik.created_at).toLocaleDateString("tr-TR")}
                </span>
                <Button
                  variant="danger"
                  className="!px-2.5 !py-1 !text-[11px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMalik(malik.id, malik.name);
                  }}
                >
                  🗑️ Sil
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
