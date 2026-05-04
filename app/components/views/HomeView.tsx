"use client";

import type { Malik } from "../../lib/python-bridge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <div className="animate-in fade-in duration-300">
      <div style={{ marginBottom: 32 }}>
        <h2 className="text-2xl font-bold" style={{ marginBottom: 8 }}>Malikler</h2>
        <p className="text-sm text-muted-foreground">Tapu kayıtlarını incelemek için bir malik seçin veya yeni ekleyin</p>
      </div>

      {maliks.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-5xl" style={{ marginBottom: 20 }}>👤</div>
          <h3 className="text-lg font-semibold" style={{ marginBottom: 12 }}>Henüz malik eklenmemiş</h3>
          <p className="text-muted-foreground text-sm" style={{ marginBottom: 24 }}>Başlamak için yeni bir malik ekleyin</p>
          <Button onClick={() => setShowAddModal(true)}>➕ İlk Maliki Ekle</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ gap: 20 }}>
          {maliks.map((malik) => (
            <Card
              key={malik.id}
              className="cursor-pointer relative flex flex-col"
              style={{ padding: 16 }}
              onClick={() => openMalikDetail(malik)}
            >
              <CardHeader>
                <CardTitle className="text-lg font-bold" >{malik.name}</CardTitle>
                <CardDescription>
                  {malik.record_count || 0} tapu kaydı
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="flex justify-between items-center mt-auto"
                  style={{ paddingTop: 12, borderTop: "1px solid hsl(var(--border))" }}
                >
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(malik.created_at).toLocaleDateString("tr-TR")}
                  </span>
                  <Button
                    variant="destructive"
                    style={{ padding: 10, gap: 10, cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMalik(malik.id, malik.name);
                    }}
                  >
                    🗑️ Sil
                  </Button>
                </div>
              </CardContent>


            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
