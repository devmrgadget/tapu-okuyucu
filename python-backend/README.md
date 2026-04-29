# Tapu Okuyucu — Python Backend

Technical documentation for the Python sidecar that powers the Tapu Okuyucu (Land Registry Reader) application.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Tauri Desktop App                         │
│  ┌──────────────┐         ┌─────────────────────────────┐   │
│  │   Next.js     │  JSON   │   Python Sidecar            │   │
│  │   Frontend    │◄───────►│   (stdin/stdout protocol)   │   │
│  │   (page.tsx)  │         │   main.py                   │   │
│  └──────────────┘         └──────────┬──────────────────┘   │
│                                       │                      │
│                           ┌───────────┼───────────┐          │
│                           │           │           │          │
│                    ┌──────▼──┐  ┌─────▼────┐ ┌────▼──────┐  │
│                    │  tapu_  │  │ database │ │  excel_   │  │
│                    │ parser  │  │   .py    │ │  export   │  │
│                    │   .py   │  │(SQLite)  │ │    .py    │  │
│                    └─────────┘  └──────────┘ └───────────┘  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   Web Development Mode                        │
│  ┌──────────────┐  HTTP POST  ┌──────────────────────────┐  │
│  │   Next.js     │◄───────────►│   server.py              │  │
│  │   (browser)   │  (port 8000)│   (wraps main.py)        │  │
│  └──────────────┘             └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Modules

### `main.py` — Command Router

The main entry point. Operates in two modes:

1. **Sidecar mode** (default): Reads JSON commands line-by-line from `stdin`, processes them, and writes JSON responses to `stdout`. This is how the Tauri desktop app communicates.
2. **CLI mode**: Accepts a JSON command as a CLI argument for testing.

**Protocol:**
```json
// Request (one JSON object per line on stdin):
{"action": "get_maliks", "data": {}, "app_data_dir": null}

// Response (one JSON object per line on stdout):
{"success": true, "data": [...]}
```

**Supported Actions:**

| Action | Description | Input `data` |
|---|---|---|
| `init` | Initialize SQLite database schema | — |
| `add_malik` | Add a new property owner | `{name}` |
| `get_maliks` | List all owners with record counts | — |
| `get_malik` | Get a single owner by ID | `{id}` |
| `delete_malik` | Delete an owner and all related records | `{id}` |
| `add_tapu_record` | Parse a PDF and store results | `{malik_id, pdf_path}` |
| `get_tapu_records` | List records for an owner | `{malik_id}` |
| `get_tapu_record_detail` | Get record with all şerh entries (flat + grouped) | `{record_id}` |
| `delete_tapu_record` | Delete a record and its entries | `{record_id}` |
| `compare_records` | Compare two records to find removed/remaining/added entries | `{old_record_id, new_record_id}` |
| `get_export_columns` | Return available column definitions for Excel export | — |
| `export_excel` | Export a single record's entries to .xlsx | `{record_id, output_path, selected_columns?}` |
| `export_comparison_excel` | Export comparison results to .xlsx | `{old_record_id, new_record_id, output_path, selected_columns?}` |

---

### `tapu_parser.py` — PDF Extraction Engine

Extracts structured annotation (şerh) data from Turkish land registry (tapu) PDF documents using **PyMuPDF** (`fitz`).

**Pipeline:**
1. `extract_text_from_pdf()` — Extracts raw text from all PDF pages.
2. `extract_tapu_date()` — Parses the document header date (`Tarih: DD-MM-YYYY-HH:MM`).
3. `extract_malik_name()` — Extracts the owner name from `Kaydı Oluşturan:` field.
4. `extract_serh_entries()` — Core parsing logic:
   - Truncates text at the `REHİN BİLGİLERİ` section to avoid misclassifying mortgage data.
   - Splits the text into blocks by `Şerh` delimiters.
   - For each block, extracts Yevmiye info *first* to avoid losing it during text cleanup.
   - Cleans the block of page-break artifacts (e.g., malik name, page numbers, watermarks) that split annotations across pages.
   - Uses regex patterns to extract fields for supported annotation types:
     - **Types Supported**: `İcrai Haciz`, `İhtiyati Haciz`, `Kamu Haczi`, `Satış`, and `İİK 150/c`
     - **İcra Dairesi** (Execution Office): Normalized and cleaned of OCR artifacts
     - **Tarih** (Date): From the haciz yazısı
     - **Dosya No** (File number)
     - **Bedel** (Amount in TL, dynamically handled for different types)
     - **Alacaklı** (Creditor, dynamically stripped of malik artifacts and TC numbers)
     - **Yevmiye Tarih/No** (Registration date/number)
5. `group_by_icra_dairesi()` — Groups entries by execution office name.

**İcra Dairesi Normalization:**
- Converts to uppercase Turkish
- Removes page numbers, dates, watermarks
- Normalizes `MÜDÜRLÜĞÜ` → `DAİRESİ`
- Fixes OCR typos (`İCRRA` → `İCRA`)
- Standardizes numbering (`3 İCRA` → `3. İCRA`)

**Comparison Algorithm** (`compare_tapu_records()`):

Compares two sets of şerh entries to determine which annotations were removed, remain, or were added between two tapu record dates.

- **Unique key**: `icra_dairesi | dosya_no | yevmiye_no`
- Uses yevmiye_no in the key to track individual entries even when multiple annotations share the same dosya number
- Handles duplicate keys by counting occurrences

---

### `database.py` — SQLite Data Layer

Manages persistent storage using SQLite with WAL journal mode and foreign key constraints.

**Schema:**

```sql
maliks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    created_at  TEXT,
    updated_at  TEXT
)

tapu_records (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    malik_id       INTEGER → maliks(id) ON DELETE CASCADE,
    pdf_path       TEXT,
    tapu_date      TEXT,
    total_entries  INTEGER,
    created_at     TEXT
)

serh_entries (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    tapu_record_id   INTEGER → tapu_records(id) ON DELETE CASCADE,
    type             TEXT,
    icra_dairesi     TEXT,
    tarih            TEXT,
    dosya_no         TEXT,
    bedel            TEXT,
    alacakli         TEXT,
    yevmiye_tarih    TEXT,
    yevmiye_no       TEXT,
    created_at       TEXT
)
```

**Indexes:** `malik_id`, `tapu_record_id`, `icra_dairesi`

**Database location:**
- Tauri mode: `<app_data_dir>/tapu_okuyucu.db`
- Development mode: `python-backend/tapu_okuyucu.db`

---

### `excel_export.py` — Excel Report Generator

Uses **openpyxl** to generate styled `.xlsx` reports.

**Two export modes:**

1. **Single record export** (`export_to_excel`):
   - Groups entries by İcra Dairesi with section headers
   - Includes title, date, and styled column headers

2. **Comparison export** (`export_comparison_to_excel`):
   - Three sheets: Removed, Remaining, Added
   - Color-coded headers (red, amber, green)

**Column Filtering:**
Both export functions accept an optional `selected_columns` parameter — a list of column keys (e.g. `["type", "dosya_no", "bedel"]`) to include in the output. When omitted, all columns are exported.

Available columns: `type`, `icra_dairesi`, `dosya_no`, `tarih`, `bedel`, `alacakli`, `yevmiye_tarih`, `yevmiye_no`

---

### `server.py` — Development HTTP Bridge

A lightweight HTTP server for web development without Tauri. Wraps `main.py`'s `handle_command()` behind a CORS-enabled `POST` endpoint on `localhost:8000`.

```bash
# Start the development server:
python python-backend/server.py
```

All requests use the same JSON protocol as the sidecar mode.

---

## Dependencies

| Package | Purpose |
|---|---|
| `PyMuPDF` (fitz) | PDF text extraction |
| `openpyxl` | Excel file generation |
| `sqlite3` | Database (stdlib) |

## Quick Start

```bash
# Install dependencies
pip install pymupdf openpyxl

# Run in development mode (web)
python python-backend/server.py

# Test CLI mode
python python-backend/main.py '{"action": "init", "data": {}}'
```
