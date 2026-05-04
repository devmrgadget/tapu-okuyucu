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
import { Button } from "@/components/ui/button";

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

import { Command, Child } from "@tauri-apps/plugin-shell";

let sidecarChild: Child | null = null;
let responseBuffer = "";
const pendingRequests = new Map<string, (result: unknown) => void>();

async function getSidecar(): Promise<Child> {
  if (sidecarChild) return sidecarChild;

  const command = Command.sidecar("bin/api/main");

  // stdout'tan gelen satırları dinle
  command.stdout.on("data", (line: string) => {
    responseBuffer += line;
    const lines = responseBuffer.split("\n");
    responseBuffer = lines.pop() || "";

    for (const l of lines) {
      if (!l.trim()) continue;
      try {
        const result = JSON.parse(l);
        const requestId = result._request_id;
        const handler = pendingRequests.get(requestId);
        if (handler) {
          pendingRequests.delete(requestId);
          handler(result);
        }
      } catch (e) {
        console.error("Parse error:", e);
      }
    }
  });

  command.stderr.on("data", (line: string) => {
    console.error("Sidecar stderr:", line);
  });

  sidecarChild = await command.spawn();
  return sidecarChild;
}

async function getAppDataDir(): Promise<string | null> {
  try {
    if (tauriCore) {
      const { appDataDir } = await import("@tauri-apps/api/path");
      return await appDataDir();
    }
  } catch {
    console.error("appDataDir alınamadı");
  }
  return null;
}

async function runPython(action: string, data: Record<string, unknown> = {}): Promise<any> {
  const app_data_dir = await getAppDataDir();
  const requestId = crypto.randomUUID();

  const payload =
    JSON.stringify({ action, data, app_data_dir, _request_id: requestId }) +
    "\n";

  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error("Sidecar timeout"));
    }, 30000);

    pendingRequests.set(requestId, (result: unknown) => {
      clearTimeout(timeout);
      const r = result as Record<string, unknown>;
      if (r.error) reject(new Error(r.error as string));
      else resolve(r);
    });

    try {
      const child = await getSidecar();
      await child.write(payload);
    } catch (e) {
      pendingRequests.delete(requestId);
      reject(e);
    }
  });
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
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-12 h-12 border-4 border-border border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Tauri ortamı bekleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Notification */}
      {notification && (
        <div className="animate-in slide-in-from-bottom-4 fade-in duration-300 fixed top-6 right-6 z-50 bg-card border border-border rounded-xl px-5 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-sm max-w-[380px]">
          {notification}
        </div>
      )}

      {/* Header */}
      <header
        className="bg-secondary border-b border-border flex items-center justify-between sticky top-0 z-40"
        style={{ padding: "16px 24px" }}
      >
        <div className="flex items-center" style={{ gap: 16 }}>
          {view !== "home" && (
            <Button variant="secondary" onClick={goBack}>
              ← Geri
            </Button>
          )}
          <div>
            <h1 className="text-xl font-extrabold bg-gradient-to-br from-blue-400 to-purple-400 bg-clip-text text-transparent">
              📜 Tapu Okuyucu
            </h1>
            <p className="text-xs text-muted-foreground" style={{ marginTop: 4 }}>Tapu Kaydı Şerh Analiz Sistemi</p>
          </div>
        </div>
        {view === "home" && (
          <Button variant="default" onClick={() => setShowAddModal(true)}>
            ➕ Malik Ekle
          </Button>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto" style={{ padding: "32px 24px" }}>
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
          <div className="animate-in fade-in duration-300">
            <div className="flex items-center justify-between flex-wrap" style={{ marginBottom: 32, gap: 16 }}>
              <div>
                <h2 className="text-[22px] font-bold" style={{ marginBottom: 8 }}>Şerh Karşılaştırması</h2>
                <p className="text-sm text-muted-foreground">{selectedMalik?.name}</p>
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openExportComparisonModal}>
                📊 Excel&apos;e Aktar
              </Button>
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
