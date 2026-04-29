"use client";

import { useState, useEffect } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

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
    <Modal isOpen={isOpen} onClose={onClose} title="📊 Excel'e Aktar">
      <p className="text-sm text-[var(--text-muted)] mb-5">
        Dışa aktarılacak sütunları seçin
      </p>

      {/* Select all / deselect all */}
      <div className="flex gap-2 mb-4 items-center">
        <Button variant="secondary" className="!text-xs !py-1 !px-3" onClick={selectAll}>
          Tümünü Seç
        </Button>
        <Button variant="secondary" className="!text-xs !py-1 !px-3" onClick={deselectAll}>
          Tümünü Kaldır
        </Button>
        <span className="ml-auto text-xs text-[var(--text-muted)]">
          {selectedKeys.length} / {columns.length} seçili
        </span>
      </div>

      {/* Columns list */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {columns.map((col) => {
          const isSelected = selected[col.key] || false;
          return (
            <label
              key={col.key}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all text-[13px] ${
                isSelected
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold"
                  : "bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)]"
              }`}
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all border-2 ${
                  isSelected ? "bg-emerald-500 border-emerald-500" : "bg-transparent border-[var(--border-color)]"
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
      <div className="flex gap-3 justify-end mt-4">
        <Button variant="secondary" onClick={onClose}>
          İptal
        </Button>
        <Button
          variant="success"
          onClick={handleExport}
          disabled={selectedKeys.length === 0}
          className={selectedKeys.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
        >
          📊 Dışa Aktar ({selectedKeys.length} sütun)
        </Button>
      </div>
    </Modal>
  );
}
