"use client";

import { useState, useMemo } from "react";
import type { ComparisonResult, SerhEntry } from "../lib/python-bridge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ComparisonViewProps {
  comparison: ComparisonResult;
  oldDate: string;
  newDate: string;
}

function EntryRow({ entry, variant }: { entry: SerhEntry; variant: string }) {
  return (
    <div className={`status-${variant} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1.5fr_1fr_1fr_1.5fr_1fr] transition-colors hover:bg-white/5`} style={{ padding: "16px 20px", gap: 16, marginBottom: 4, borderRadius: 12 }}>
      <div>
        <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
          İcra Dairesi
        </div>
        <span className="text-xs text-foreground font-medium">
          {entry.icra_dairesi}
        </span>
      </div>
      <div>
        <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
          Dosya No
        </div>
        <span className="text-xs text-foreground font-mono">
          {entry.dosya_no}
        </span>
      </div>
      <div>
        <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
          Tarih
        </div>
        <span className="text-xs text-muted-foreground">
          {entry.tarih}
        </span>
      </div>
      <div>
        <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
          Bedel
        </div>
        <span className="text-xs font-semibold text-red-400">
          {entry.bedel ? `${entry.bedel} ₺` : "-"}
        </span>
      </div>
      <div>
        <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
          Alacaklı
        </div>
        <span className="text-xs text-muted-foreground line-clamp-1">
          {entry.alacakli || "-"}
        </span>
      </div>
      <div>
        <div className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">
          Yevmiye
        </div>
        <span className="text-xs text-muted-foreground">
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
  searchQuery,
}: {
  title: string;
  emoji: string;
  count: number;
  entries: SerhEntry[];
  variant: string;
  badgeClass: string;
  searchQuery: string;
  filterType: string;
}) {
  // Apply search
  const filteredEntries = useMemo(() => {
    let result = entries;

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        (e.icra_dairesi || "").toLowerCase().includes(q) ||
        (e.dosya_no || "").toLowerCase().includes(q) ||
        (e.alacakli || "").toLowerCase().includes(q) ||
        (e.bedel || "").toLowerCase().includes(q) ||
        (e.yevmiye_no || "").toLowerCase().includes(q) ||
        (e.tarih || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [entries, searchQuery]);

  return (
    <div className="mb-8">
      <Card className="p-5 flex items-center justify-between mb-4">
        <div className="flex items-center" style={{ gap: 12 }}>
          <span className="text-2xl">{emoji}</span>
          <span className="text-lg font-bold">{title}</span>
        </div>
        <div className="flex items-center" style={{ gap: 10 }}>
          {filteredEntries.length !== count && (
            <span className="text-sm text-muted-foreground">
              {filteredEntries.length} / {count}
            </span>
          )}
          <Badge variant={badgeClass as any} className="text-[15px] px-4 py-2">
            {filteredEntries.length}
          </Badge>
        </div>
      </Card>

      {filteredEntries.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          {entries.length === 0 ? "Bu kategoride kayıt bulunmuyor" : "Arama kriterlerine uygun kayıt bulunamadı"}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredEntries.map((entry, idx) => (
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[] | null>(null);

  // Collect unique types from all entries
  const allTypes = useMemo(() => {
    const types = new Set<string>();
    [...comparison.removed, ...comparison.remaining, ...comparison.added].forEach(e => {
      if (e.type) types.add(e.type);
    });
    return Array.from(types).sort();
  }, [comparison]);

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

  const filterEntries = (entries: SerhEntry[]) => {
    if (activeTypes.length === 0) return [];
    if (activeTypes.length === allTypes.length) return entries;
    return entries.filter(e => e.type && activeTypes.includes(e.type));
  };

  const filteredRemoved = useMemo(() => filterEntries(comparison.removed), [comparison.removed, activeTypes]);
  const filteredRemaining = useMemo(() => filterEntries(comparison.remaining), [comparison.remaining, activeTypes]);
  const filteredAdded = useMemo(() => filterEntries(comparison.added), [comparison.added, activeTypes]);

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <Card className="p-8 text-center">
          <div className="text-4xl font-extrabold text-emerald-400 mb-2">
            {filteredRemoved.length}
          </div>
          <div className="text-sm text-muted-foreground">
            ✅ Kaldırılan Şerh
          </div>
        </Card>
        <Card className="p-8 text-center">
          <div className="text-4xl font-extrabold text-amber-400 mb-2">
            {filteredRemaining.length}
          </div>
          <div className="text-sm text-muted-foreground">
            ⏳ Devam Eden Şerh
          </div>
        </Card>
        <Card className="p-8 text-center">
          <div className="text-4xl font-extrabold text-red-400 mb-2">
            {filteredAdded.length}
          </div>
          <div className="text-sm text-muted-foreground">
            🆕 Yeni Eklenen Şerh
          </div>
        </Card>
      </div>

      {/* Date range indicator */}
      <div className="flex items-center justify-center gap-5 mb-8 py-4">
        <Badge variant="default" className="text-[13px] px-4 py-2.5">
          📅 {oldDate}
        </Badge>
        <span className="text-2xl text-muted-foreground">→</span>
        <Badge variant="secondary" className="text-[13px] px-4 py-2.5">
          📅 {newDate}
        </Badge>
      </div>

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

      {/* Sections */}
      <Section
        title="Kaldırılan Şerhler"
        emoji="✅"
        count={comparison.removed_count}
        entries={filteredRemoved}
        variant="removed"
        badgeClass="secondary"
        searchQuery={searchQuery}
        filterType="all"
      />

      <Section
        title="Devam Eden Şerhler"
        emoji="⏳"
        count={comparison.remaining_count}
        entries={filteredRemaining}
        variant="remaining"
        badgeClass="secondary"
        searchQuery={searchQuery}
        filterType="all"
      />

      <Section
        title="Yeni Eklenen Şerhler"
        emoji="🆕"
        count={comparison.added_count}
        entries={filteredAdded}
        variant="added"
        badgeClass="destructive"
        searchQuery={searchQuery}
        filterType="all"
      />
    </div>
  );
}
