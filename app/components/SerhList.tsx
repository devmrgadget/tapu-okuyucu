"use client";

import { useState, useMemo } from "react";
import type { SerhEntry } from "../lib/python-bridge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      <Card className="p-5 mb-5">
        <div className="flex items-center" style={{ gap: 12, marginBottom: 12 }}>
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">🔍</span>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full"
              style={{ paddingLeft: 40 }}
              type="text"
              placeholder="Arama... (İcra dairesi, dosya no, alacaklı, bedel)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {(searchQuery || selectedTypes !== null) && (
            <Button
              variant="secondary"
              style={{ fontSize: 12, whiteSpace: "nowrap" }}
              onClick={() => { setSearchQuery(""); setSelectedTypes(null); }}
            >
              ✕ Temizle
            </Button>
          )}
        </div>

        <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
          <span className="text-xs text-muted-foreground" style={{ marginRight: 4 }}>Şerh Türü:</span>
          {allTypes.map(t => {
            const isActive = activeTypes.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`flex items-center text-xs border transition-all cursor-pointer ${isActive
                  ? "border-blue-500 bg-blue-500/10 text-blue-400"
                  : "border-border bg-transparent text-muted-foreground"
                  }`}
                style={{ gap: 8, borderRadius: 9999 }}
              >
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isActive ? "border-blue-500 bg-blue-500" : "border-border bg-transparent"
                  }`}>
                  {isActive && <span className="text-white text-[10px]">✓</span>}
                </div>
                {t}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Summary header */}
      <div className="flex items-center justify-between mb-6 px-5 py-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
        <div className="flex items-center gap-3">
          <span className="text-xl">📋</span>
          <span className="text-[15px] font-semibold">
            {filteredTotal !== totalEntries ? `Bulunan: ${filteredTotal} / Toplam: ${totalEntries}` : `Toplam Şerh Sayısı`}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" style={{ fontSize: 11 }} onClick={expandAll}>
            Tümünü Aç
          </Button>
          <Button variant="secondary" style={{ fontSize: 11 }} onClick={collapseAll}>
            Tümünü Kapat
          </Button>
          <Badge className="ml-1 text-sm px-3 py-1">
            {filteredTotal}
          </Badge>
        </div>
      </div>

      {/* No results */}
      {filteredDairesiKeys.length === 0 && (searchQuery || selectedTypes !== null) && (
        <Card className="text-center p-8">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-sm text-muted-foreground">
            Arama kriterlerine uygun şerh bulunamadı
          </p>
        </Card>
      )}

      {/* İcra Dairesi groups */}
      <div className="flex flex-col gap-4">
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
            <div key={dairesi}>
              {/* İcra Dairesi Header */}
              <div
                onClick={() => toggleGroup(dairesi)}
                className={`cursor-pointer flex items-center justify-between transition-all border border-purple-500/30 bg-gradient-to-br from-purple-500/15 to-blue-500/10 ${expandedGroups[dairesi] ? "rounded-t-xl" : "rounded-xl"
                  }`}
                style={{ padding: "16px 20px" }}
              >
                <div className="flex items-center" style={{ gap: 12 }}>
                  <span className="text-lg">🏛️</span>
                  <span className="text-[15px] font-bold text-foreground">
                    {dairesi}
                  </span>
                </div>
                <div className="flex items-center" style={{ gap: 12 }}>
                  <Badge variant="secondary">{entries.length} şerh</Badge>
                  <span
                    className={`w-7 h-7 rounded-full bg-purple-500/10 flex items-center justify-center text-xs text-muted-foreground transition-transform duration-200 ${expandedGroups[dairesi] ? "rotate-180" : "rotate-0"
                      }`}
                  >
                    ▼
                  </span>
                </div>
              </div>

              {/* Dosya groups */}
              {expandedGroups[dairesi] && (
                <div className="bg-background border border-border border-t-0 rounded-b-xl overflow-hidden">
                  {Object.entries(byDosya).map(
                    ([dosyaNo, dosyaEntries], dosyaIdx) => (
                      <div key={dosyaNo}>
                        {/* Dosya No sub-header */}
                        <div className="bg-amber-500/5 border-b border-border flex items-center" style={{ padding: "12px 20px", gap: 10 }}>
                          <span className="text-[13px]">📁</span>
                          <span className="text-[13px] font-semibold text-amber-500">
                            Dosya No: {dosyaNo}
                          </span>
                          <Badge variant="secondary" className="text-[10px] ml-auto">
                            {dosyaEntries.length} kayıt
                          </Badge>
                        </div>

                        {/* Entry rows */}
                        {dosyaEntries.map((entry, entryIdx) => (
                          <div
                            key={entryIdx}
                            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 transition-colors hover:bg-blue-500/5 ${entryIdx < dosyaEntries.length - 1
                              ? "border-b border-border/50"
                              : dosyaIdx < Object.keys(byDosya).length - 1
                                ? "border-b border-border"
                                : ""
                              }`}
                          >
                            <div>
                              <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
                                Tür
                              </div>
                              <Badge
                                variant={entry.type?.includes("htiyati") ? "secondary" : "destructive"}
                                className="text-[10px]"
                              >
                                {entry.type || "Belirtilmemiş"}
                              </Badge>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
                                Yevmiye Tarihi
                              </div>
                              <span className="text-[13px] text-foreground">
                                {entry.yevmiye_tarih || "-"}
                              </span>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
                                Yevmiye No
                              </div>
                              <span className="text-[13px] text-foreground font-mono">
                                {entry.yevmiye_no || "-"}
                              </span>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
                                Bedel
                              </div>
                              <span className="text-[13px] font-semibold text-red-400">
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
