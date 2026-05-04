"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ExportColumn {
  key: string;
  label: string;
}

interface ExportColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (selectedColumns: string[]) => void;
  columns: ExportColumn[];
}

export default function ExportColumnsModal({
  isOpen,
  onClose,
  onExport,
  columns,
}: ExportColumnsModalProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && columns.length > 0) {
      const initial: Record<string, boolean> = {};
      columns.forEach((col) => {
        initial[col.key] = true;
      });
      setSelected(initial);
    }
  }, [isOpen, columns]);

  const toggleColumn = (key: string) => {
    setSelected((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const selectAll = () => {
    const all: Record<string, boolean> = {};
    columns.forEach((col) => {
      all[col.key] = true;
    });
    setSelected(all);
  };

  const deselectAll = () => {
    const none: Record<string, boolean> = {};
    columns.forEach((col) => {
      none[col.key] = false;
    });
    setSelected(none);
  };

  const selectedKeys = Object.entries(selected)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const handleExport = () => {
    if (selectedKeys.length === 0) return;
    onExport(selectedKeys);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>📊 Excel'e Aktar</DialogTitle>
          <DialogDescription>
            Dışa aktarılacak sütunları seçin
          </DialogDescription>
        </DialogHeader>

        {/* Select all / deselect all */}
        <div className="flex items-center gap-3 mb-5">
          <Button size="sm" onClick={selectAll}>
            Tümünü Seç
          </Button>
          <Button variant="secondary" size="sm" onClick={deselectAll}>
            Tümünü Kaldır
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            {selectedKeys.length} / {columns.length} seçili
          </span>
        </div>

        {/* Columns list */}
        <div className="grid grid-cols-2 gap-3 mb-7 max-h-[60vh] overflow-y-auto pr-2">
          {columns.map((col) => {
            const isSelected = selected[col.key] || false;
            return (
              <label
                key={col.key}
                className={`flex items-center rounded-xl border cursor-pointer transition-all text-[13px] p-3 gap-3 ${isSelected
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-semibold dark:text-emerald-400"
                  : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                  }`}
              >
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all border-2 ${isSelected ? "bg-emerald-500 border-emerald-500" : "bg-transparent border-border"
                    }`}
                >
                  {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleColumn(col.key)}
                  className="hidden"
                />
                {col.label}
              </label>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>
            İptal
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedKeys.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            📊 Dışa Aktar ({selectedKeys.length} sütun)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
