"use client";

import { useState, useEffect } from "react";
import AddMalikModal from "./components/AddMalikModal";
import ComparisonView from "./components/ComparisonView";
import ExportColumnsModal from "./components/ExportColumnsModal";
import HomeView from "./components/views/HomeView";
import MalikDetailView from "./components/views/MalikDetailView";
import RecordDetailView from "./components/views/RecordDetailView";
import type {
  Malik,
  TapuRecord,
  SerhEntry,
  ComparisonResult,
} from "./lib/python-bridge";

// Dynamic imports for Tauri APIs (only available in Tauri context)
let tauriCore: typeof import("@tauri-apps/api/core") | null = null;
let tauriDialog: typeof import("@tauri-apps/plugin-dialog") | null = null;

async function loadTauriModules() {
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  if (!isTauri) {
    console.log("Running outside Tauri");
    return;
  }
  try {
    tauriCore = await import("@tauri-apps/api/core");
    tauriDialog = await import("@tauri-apps/plugin-dialog");
  } catch {
    console.log("Failed to load Tauri modules");
  }
}

async function runPython(action: string, data: Record<string, unknown> = {}) {
  const payload = JSON.stringify({ action, data, app_data_dir: null });

  if (!tauriCore) {
    // Fallback to local HTTP server for web environment
    try {
      const response = await fetch("http://localhost:8000", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      return result;
    } catch (e) {
      throw new Error(
        "Tauri not available and cannot connect to local HTTP server. " +
        "Please run 'python python-backend/server.py' to use the web version."
      );
    }
  }

  const raw: string = await tauriCore.invoke("run_python", {
    scriptPath: "python-backend/main.py",
    payload,
  });
  const result = JSON.parse(raw);
  if (result.error) throw new Error(result.error);
  return result;
}

interface ExportColumn {
  key: string;
  label: string;
}

type View = "home" | "malik-detail" | "record-detail" | "comparison";

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [maliks, setMaliks] = useState<Malik[]>([]);
  const [selectedMalik, setSelectedMalik] = useState<Malik | null>(null);
  const [tapuRecords, setTapuRecords] = useState<TapuRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<TapuRecord | null>(null);
  const [serhGrouped, setSerhGrouped] = useState<Record<string, SerhEntry[]>>({});
  const [serhEntries, setSerhEntries] = useState<SerhEntry[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [compOldDate, setCompOldDate] = useState("");
  const [compNewDate, setCompNewDate] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState("");
  const [tauriReady, setTauriReady] = useState(false);

  // Export columns modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportColumns, setExportColumns] = useState<ExportColumn[]>([]);
  const [exportRecordId, setExportRecordId] = useState<number | null>(null);
  const [isExportingComparison, setIsExportingComparison] = useState(false);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 5000);
  };

  useEffect(() => {
    loadTauriModules().then(() => {
      const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      setTauriReady(isTauri ? !!tauriCore : true);

      if (tauriCore || !isTauri) {
        runPython("init")
          .then(() => loadMaliks())
          .catch((e) => {
            console.error("Init error:", e);
            if (!isTauri) {
              notify("⚠️ Web modunda çalışıyor. Backend'e bağlanılamadı. Lütfen 'python python-backend/server.py' çalıştırın.");
            }
          });
      }
    });
  }, []);

  const loadMaliks = async () => {
    try {
      const res = await runPython("get_maliks");
      setMaliks(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMalik = async (name: string) => {
    try {
      await runPython("add_malik", { name });
      await loadMaliks();
      notify(`✅ ${name} eklendi`);
    } catch (e: unknown) {
      notify(`❌ Hata: ${e instanceof Error ? e.message : "Bilinmeyen hata"}`);
      throw e; // Re-throw so the modal can show the error
    }
  };

  const handleDeleteMalik = async (id: number, name: string) => {
    let isConfirmed = false;
    if (tauriDialog) {
      isConfirmed = await tauriDialog.confirm(`"${name}" silinecek. Emin misiniz?`, { title: 'Silme Onayı', kind: 'warning' });
    } else {
      isConfirmed = window.confirm(`"${name}" silinecek. Emin misiniz?`);
    }
    if (!isConfirmed) return;

    await runPython("delete_malik", { id });
    await loadMaliks();
    if (selectedMalik?.id === id) {
      setView("home");
      setSelectedMalik(null);
    }
    notify(`🗑️ ${name} silindi`);
  };

  const openMalikDetail = async (malik: Malik) => {
    setSelectedMalik(malik);
    setTapuRecords([]); // Clear old records immediately to prevent flashing
    setView("malik-detail");
    setLoading(true);
    try {
      const res = await runPython("get_tapu_records", { malik_id: malik.id });
      setTapuRecords(res.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleAddTapuRecord = async () => {
    if (!selectedMalik) return;
    if (!tauriDialog) {
      notify("⚠️ PDF yükleme ve işleme özellikleri sadece Tauri masaüstü uygulamasında çalışır.");
      return;
    }
    const file = await tauriDialog.open({
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      multiple: false,
    });
    if (!file) return;
    setLoading(true);
    try {
      const res = await runPython("add_tapu_record", {
        malik_id: selectedMalik.id,
        pdf_path: file,
      });
      notify(`✅ Tapu kaydı eklendi (${res.data.parsed.total_entries} şerh)`);
      const records = await runPython("get_tapu_records", { malik_id: selectedMalik.id });
      setTapuRecords(records.data || []);
    } catch (e: unknown) {
      notify(`❌ Hata: ${e instanceof Error ? e.message : "Bilinmeyen hata"}`);
    }
    setLoading(false);
  };

  const openRecordDetail = async (record: TapuRecord) => {
    setSelectedRecord(record);
    setView("record-detail");
    setLoading(true);
    try {
      const res = await runPython("get_tapu_record_detail", { record_id: record.id });
      setSerhGrouped(res.data.grouped || {});
      setSerhEntries(res.data.entries || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCompare = async () => {
    if (tapuRecords.length < 2) {
      notify("⚠️ Karşılaştırma için en az 2 tapu kaydı gerekli");
      return;
    }
    setLoading(true);
    try {
      const sorted = [...tapuRecords].sort((a, b) => a.tapu_date.localeCompare(b.tapu_date));
      const oldR = sorted[0];
      const newR = sorted[sorted.length - 1];
      const res = await runPython("compare_records", {
        old_record_id: oldR.id,
        new_record_id: newR.id,
      });
      setComparison(res.data);
      setCompOldDate(oldR.tapu_date);
      setCompNewDate(newR.tapu_date);
      setView("comparison");
    } catch (e: unknown) {
      notify(`❌ Hata: ${e instanceof Error ? e.message : "Bilinmeyen hata"}`);
    }
    setLoading(false);
  };

  // Open export modal with column selection for a specific record
  const openExportModal = async (recordId: number) => {
    try {
      const res = await runPython("get_export_columns");
      setExportColumns(res.data || []);
      setExportRecordId(recordId);
      setIsExportingComparison(false);
      setShowExportModal(true);
    } catch {
      // Fallback: export without column selection
      handleExportExcel(recordId);
    }
  };

  // Open export modal for comparison
  const openExportComparisonModal = async () => {
    try {
      const res = await runPython("get_export_columns");
      setExportColumns(res.data || []);
      setExportRecordId(null);
      setIsExportingComparison(true);
      setShowExportModal(true);
    } catch {
      // Fallback
      handleExportComparisonLogic();
    }
  };

  const handleExportExcel = async (recordId: number, selectedCols?: string[]) => {
    if (!tauriDialog) {
      notify("⚠️ Excel'e dışa aktarma sadece Tauri masaüstü uygulamasında çalışır.");
      return;
    }
    const path = await tauriDialog.save({
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
      defaultPath: `tapu_serh_${recordId}.xlsx`,
    });
    if (!path) return;
    try {
      await runPython("export_excel", {
        record_id: recordId,
        output_path: path,
        selected_columns: selectedCols || null,
      });
      notify("✅ Excel dosyası oluşturuldu");
    } catch (e: unknown) {
      notify(`❌ Hata: ${e instanceof Error ? e.message : "Bilinmeyen hata"}`);
    }
  };

  const handleExportWithColumns = (selectedCols: string[]) => {
    setShowExportModal(false);
    if (isExportingComparison) {
      handleExportComparisonLogic(selectedCols);
    } else if (exportRecordId !== null) {
      handleExportExcel(exportRecordId, selectedCols);
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    let isConfirmed = false;
    if (tauriDialog) {
      isConfirmed = await tauriDialog.confirm("Bu tapu kaydı silinecek. Emin misiniz?", { title: 'Silme Onayı', kind: 'warning' });
    } else {
      isConfirmed = window.confirm("Bu tapu kaydı silinecek. Emin misiniz?");
    }
    if (!isConfirmed) return;

    await runPython("delete_tapu_record", { record_id: recordId });
    if (selectedMalik) {
      const res = await runPython("get_tapu_records", { malik_id: selectedMalik.id });
      setTapuRecords(res.data || []);
    }
    if (view === "record-detail") setView("malik-detail");
    notify("🗑️ Kayıt silindi");
  };

  const handleExportComparisonLogic = async (selectedCols?: string[]) => {
    if (!tauriDialog) {
      notify("⚠️ Excel'e dışa aktarma sadece Tauri masaüstü uygulamasında çalışır.");
      return;
    }
    const path = await tauriDialog.save({
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
      defaultPath: `karsilastirma_${selectedMalik?.name || "rapor"}.xlsx`,
    });
    if (!path) return;

    try {
      const sorted = [...tapuRecords].sort((a, b) => a.tapu_date.localeCompare(b.tapu_date));
      const oldR = sorted[0];
      const newR = sorted[sorted.length - 1];

      await runPython("export_comparison_excel", {
        old_record_id: oldR.id,
        new_record_id: newR.id,
        output_path: path,
        selected_columns: selectedCols || null,
      });
      notify("✅ Karşılaştırma Excel dosyası oluşturuldu");
    } catch (e: unknown) {
      notify(`❌ Hata: ${e instanceof Error ? e.message : "Bilinmeyen hata"}`);
    }
  };

  const goBack = () => {
    if (view === "record-detail") setView("malik-detail");
    else if (view === "comparison") setView("malik-detail");
    else { setView("home"); setSelectedMalik(null); }
  };

  // ─── RENDER ────────────────────────────────────

  if (!tauriReady) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 48, height: 48, border: "3px solid var(--border-color)", borderTopColor: "var(--accent-blue)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Tauri ortamı bekleniyor...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Notification */}
      {notification && (
        <div className="animate-slide-up" style={{ position: "fixed", top: 20, right: 20, zIndex: 100, background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "12px 20px", boxShadow: "var(--shadow-card)", fontSize: 14, maxWidth: 350 }}>
          {notification}
        </div>
      )}

      {/* Header */}
      <header style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {view !== "home" && (
            <button onClick={goBack} className="btn-secondary" style={{ padding: "8px 14px" }}>
              ← Geri
            </button>
          )}
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(135deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              📜 Tapu Okuyucu
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Tapu Kaydı Şerh Analiz Sistemi</p>
          </div>
        </div>
        {view === "home" && (
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            ➕ Malik Ekle
          </button>
        )}
      </header>

      {/* Main content */}
      <main style={{ flex: 1, padding: 28, maxWidth: 1200, width: "100%", margin: "0 auto" }}>
        {/* ─── HOME VIEW ───────────────────── */}
        {view === "home" && (
          <HomeView
            maliks={maliks}
            setShowAddModal={setShowAddModal}
            openMalikDetail={openMalikDetail}
            handleDeleteMalik={handleDeleteMalik}
          />
        )}

        {/* ─── MALIK DETAIL VIEW ──────────── */}
        {view === "malik-detail" && selectedMalik && (
          <MalikDetailView
            selectedMalik={selectedMalik}
            tapuRecords={tapuRecords}
            loading={loading}
            handleCompare={handleCompare}
            handleAddTapuRecord={handleAddTapuRecord}
            openRecordDetail={openRecordDetail}
            openExportModal={openExportModal}
            handleDeleteRecord={handleDeleteRecord}
          />
        )}

        {/* ─── RECORD DETAIL VIEW ─────────── */}
        {view === "record-detail" && selectedRecord && selectedMalik && (
          <RecordDetailView
            selectedMalik={selectedMalik}
            selectedRecord={selectedRecord}
            loading={loading}
            serhGrouped={serhGrouped}
            serhEntries={serhEntries}
            openExportModal={openExportModal}
          />
        )}

        {/* ─── COMPARISON VIEW ────────────── */}
        {view === "comparison" && comparison && (
          <div className="animate-fade-in">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Şerh Karşılaştırması</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{selectedMalik?.name}</p>
              </div>
              <button className="btn-success" onClick={openExportComparisonModal}>📊 Excel&apos;e Aktar</button>
            </div>
            <ComparisonView comparison={comparison} oldDate={compOldDate} newDate={compNewDate} />
          </div>
        )}
      </main>

      <AddMalikModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddMalik} />
      <ExportColumnsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportWithColumns}
        columns={exportColumns}
      />
    </div>
  );
}
