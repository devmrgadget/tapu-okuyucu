"use client";

import { useState, useEffect, useCallback } from "react";
import AddMalikModal from "./components/AddMalikModal";
import SerhList from "./components/SerhList";
import ComparisonView from "./components/ComparisonView";
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

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
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

  const handleExportExcel = async (recordId: number) => {
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
      await runPython("export_excel", { record_id: recordId, output_path: path });
      notify("✅ Excel dosyası oluşturuldu");
    } catch (e: unknown) {
      notify(`❌ Hata: ${e instanceof Error ? e.message : "Bilinmeyen hata"}`);
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
          <div className="animate-fade-in">
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Malikler</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Tapu kayıtlarını incelemek için bir malik seçin veya yeni ekleyin</p>
            </div>

            {maliks.length === 0 ? (
              <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Henüz malik eklenmemiş</h3>
                <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>Başlamak için yeni bir malik ekleyin</p>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>➕ İlk Maliki Ekle</button>
              </div>
            ) : (
              <div className="stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {maliks.map((malik) => (
                  <div key={malik.id} className="glass-card" style={{ padding: 20, cursor: "pointer", position: "relative" }} onClick={() => openMalikDetail(malik)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "white" }}>
                        {malik.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{malik.name}</h3>
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{malik.record_count || 0} tapu kaydı</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {new Date(malik.created_at).toLocaleDateString("tr-TR")}
                      </span>
                      <button className="btn-danger" style={{ padding: "4px 10px", fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleDeleteMalik(malik.id, malik.name); }}>
                        🗑️ Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── MALIK DETAIL VIEW ──────────── */}
        {view === "malik-detail" && selectedMalik && (
          <div className="animate-fade-in">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{selectedMalik.name}</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Tapu kayıtları ve şerh bilgileri</p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {tapuRecords.length >= 2 && (
                  <button className="btn-secondary" onClick={handleCompare}>🔄 Karşılaştır</button>
                )}
                <button className="btn-primary" onClick={handleAddTapuRecord} disabled={loading}>
                  {loading ? "⏳ Yükleniyor..." : "📄 Tapu Kaydı Ekle"}
                </button>
              </div>
            </div>

            {tapuRecords.length === 0 ? (
              <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Henüz tapu kaydı yok</h3>
                <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>PDF dosyası yükleyerek tapu kaydı ekleyin</p>
                <button className="btn-primary" onClick={handleAddTapuRecord}>📄 PDF Yükle</button>
              </div>
            ) : (
              <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {tapuRecords.map((record) => (
                  <div key={record.id} className="glass-card" style={{ padding: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }} onClick={() => openRecordDetail(record)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "var(--radius-sm)", background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📜</div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>Tapu Kaydı - {record.tapu_date}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{record.total_entries} şerh kaydı</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button className="btn-success" style={{ padding: "6px 12px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); handleExportExcel(record.id); }}>📊 Excel</button>
                      <button className="btn-danger" style={{ padding: "6px 12px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); handleDeleteRecord(record.id); }}>🗑️</button>
                      <span style={{ color: "var(--text-muted)", fontSize: 18 }}>→</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── RECORD DETAIL VIEW ─────────── */}
        {view === "record-detail" && selectedRecord && (
          <div className="animate-fade-in">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Şerh Detayları</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  {selectedMalik?.name} • Tarih: {selectedRecord.tapu_date}
                </p>
              </div>
              <button className="btn-success" onClick={() => handleExportExcel(selectedRecord.id)}>📊 Excel&apos;e Aktar</button>
            </div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1, 2, 3].map((i) => (<div key={i} className="loading-shimmer" style={{ height: 80 }} />))}
              </div>
            ) : (
              <SerhList grouped={serhGrouped} totalEntries={serhEntries.length} />
            )}
          </div>
        )}

        {/* ─── COMPARISON VIEW ────────────── */}
        {view === "comparison" && comparison && (
          <div className="animate-fade-in">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Tapu Karşılaştırması</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{selectedMalik?.name}</p>
              </div>
            </div>
            <ComparisonView comparison={comparison} oldDate={compOldDate} newDate={compNewDate} />
          </div>
        )}
      </main>

      <AddMalikModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddMalik} />
    </div>
  );
}
