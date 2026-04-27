/**
 * Python backend bridge for Tauri sidecar communication.
 * Spawns python process and communicates via stdin/stdout JSON protocol.
 */

import { Command } from "@tauri-apps/plugin-shell";

// Get the path to the python-backend directory
function getPythonBackendPath(): string {
  // In dev mode, use relative path from project root
  // In production, this would be bundled differently
  return "python-backend/main.py";
}

/**
 * Execute a command on the Python backend via Tauri shell.
 */
export async function pythonCommand(
  action: string,
  data: Record<string, unknown> = {}
): Promise<unknown> {
  const payload = JSON.stringify({
    action,
    data,
    app_data_dir: null, // Will use default
  });

  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  if (!isTauri) {
    // Web fallback using the local python HTTP server on port 8000
    try {
      const response = await fetch("http://localhost:8000", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    } catch (e) {
      console.error("Web fetch error:", e);
      throw new Error("Cannot connect to Python backend. Ensure 'python python-backend/server.py' is running. Error: " + (e as Error).message);
    }
  }

  const cmd = Command.create(
    "python-backend",
    [getPythonBackendPath(), payload],
    {
      env: {
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1",
      },
    }
  );

  const output = await cmd.execute();

  if (output.code !== 0) {
    console.error("Python stderr:", output.stderr);
    throw new Error(output.stderr || "Python backend error");
  }

  try {
    const result = JSON.parse(output.stdout.trim());
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.error("Failed to parse Python output:", output.stdout);
      throw new Error("Invalid response from backend");
    }
    throw e;
  }
}

// ─── Typed API Functions ─────────────────────────

export interface Malik {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  record_count?: number;
}

export interface TapuRecord {
  id: number;
  malik_id: number;
  pdf_path: string;
  tapu_date: string;
  total_entries: number;
  created_at: string;
}

export interface SerhEntry {
  id?: number;
  tapu_record_id?: number;
  type: string;
  icra_dairesi: string;
  tarih: string;
  dosya_no: string;
  bedel: string;
  alacakli: string;
  yevmiye_tarih: string;
  yevmiye_no: string;
}

export interface ParsedTapu {
  tapu_date: string;
  malik_name: string;
  total_entries: number;
  entries: SerhEntry[];
  grouped: Record<string, SerhEntry[]>;
}

export interface ComparisonResult {
  removed: SerhEntry[];
  remaining: SerhEntry[];
  added: SerhEntry[];
  removed_count: number;
  remaining_count: number;
  added_count: number;
}

// ─── Init ────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  await pythonCommand("init");
}

// ─── Malik Operations ───────────────────────────

export async function addMalik(name: string): Promise<Malik> {
  const result = (await pythonCommand("add_malik", { name })) as {
    data: Malik;
  };
  return result.data;
}

export async function getMaliks(): Promise<Malik[]> {
  const result = (await pythonCommand("get_maliks")) as { data: Malik[] };
  return result.data;
}

export async function getMalik(id: number): Promise<Malik> {
  const result = (await pythonCommand("get_malik", { id })) as {
    data: Malik;
  };
  return result.data;
}

export async function deleteMalik(id: number): Promise<void> {
  await pythonCommand("delete_malik", { id });
}

// ─── Tapu Record Operations ────────────────────

export async function addTapuRecord(
  malikId: number,
  pdfPath: string
): Promise<{ record: TapuRecord; parsed: ParsedTapu }> {
  const result = (await pythonCommand("add_tapu_record", {
    malik_id: malikId,
    pdf_path: pdfPath,
  })) as { data: { record: TapuRecord; parsed: ParsedTapu } };
  return result.data;
}

export async function getTapuRecords(malikId: number): Promise<TapuRecord[]> {
  const result = (await pythonCommand("get_tapu_records", {
    malik_id: malikId,
  })) as { data: TapuRecord[] };
  return result.data;
}

export async function getTapuRecordDetail(recordId: number): Promise<{
  record: TapuRecord;
  entries: SerhEntry[];
  grouped: Record<string, SerhEntry[]>;
}> {
  const result = (await pythonCommand("get_tapu_record_detail", {
    record_id: recordId,
  })) as {
    data: {
      record: TapuRecord;
      entries: SerhEntry[];
      grouped: Record<string, SerhEntry[]>;
    };
  };
  return result.data;
}

export async function deleteTapuRecord(recordId: number): Promise<void> {
  await pythonCommand("delete_tapu_record", { record_id: recordId });
}

// ─── Comparison ─────────────────────────────────

export async function compareRecords(
  oldRecordId: number,
  newRecordId: number
): Promise<ComparisonResult> {
  const result = (await pythonCommand("compare_records", {
    old_record_id: oldRecordId,
    new_record_id: newRecordId,
  })) as { data: ComparisonResult };
  return result.data;
}

// ─── Export ─────────────────────────────────────

export async function exportExcel(
  recordId: number,
  outputPath: string
): Promise<string> {
  const result = (await pythonCommand("export_excel", {
    record_id: recordId,
    output_path: outputPath,
  })) as { data: { path: string } };
  return result.data.path;
}

export async function exportComparisonExcel(
  oldRecordId: number,
  newRecordId: number,
  outputPath: string
): Promise<string> {
  const result = (await pythonCommand("export_comparison_excel", {
    old_record_id: oldRecordId,
    new_record_id: newRecordId,
    output_path: outputPath,
  })) as { data: { path: string } };
  return result.data.path;
}

// ─── Parse Only (no save) ──────────────────────

export async function parsePdf(pdfPath: string): Promise<ParsedTapu> {
  const result = (await pythonCommand("parse_pdf", {
    pdf_path: pdfPath,
  })) as { data: ParsedTapu };
  return result.data;
}
