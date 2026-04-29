# -*- coding: utf-8 -*-
"""
Main entry point for the Tapu Okuyucu Python sidecar.
Communicates with Tauri frontend via stdin/stdout JSON protocol.
"""

import sys
import json
import os
import traceback
import io

# Force UTF-8 encoding for standard I/O on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add the script directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tapu_parser import parse_tapu_pdf, compare_tapu_records
from database import (
    init_db, add_malik, get_all_maliks, get_malik, delete_malik,
    add_tapu_record, get_tapu_records, get_tapu_record, delete_tapu_record,
    get_serh_entries, get_serh_entries_grouped
)
from excel_export import export_to_excel, export_comparison_to_excel, ALL_COLUMNS


def handle_command(cmd: dict) -> dict:
    """Process a single command and return the result."""
    action = cmd.get("action", "")
    data = cmd.get("data", {})
    app_data_dir = cmd.get("app_data_dir", None)

    try:
        # ─── INIT ─────────────────────────────────────────
        if action == "init":
            init_db(app_data_dir)
            return {"success": True, "message": "Database initialized"}

        # ─── PARSE PDF ────────────────────────────────────
        elif action == "parse_pdf":
            pdf_path = data.get("pdf_path", "")
            if not os.path.exists(pdf_path):
                return {"error": f"File not found: {pdf_path}"}
            result = parse_tapu_pdf(pdf_path)
            return {"success": True, "data": result}

        # ─── MALIK CRUD ──────────────────────────────────
        elif action == "add_malik":
            name = data.get("name", "").strip()
            if not name:
                return {"error": "Malik adı boş olamaz"}
            result = add_malik(name, app_data_dir)
            if "error" in result:
                return result
            return {"success": True, "data": result}

        elif action == "get_maliks":
            maliks = get_all_maliks(app_data_dir)
            return {"success": True, "data": maliks}

        elif action == "get_malik":
            malik_id = data.get("id")
            malik = get_malik(malik_id, app_data_dir)
            if not malik:
                return {"error": "Malik bulunamadı"}
            return {"success": True, "data": malik}

        elif action == "delete_malik":
            malik_id = data.get("id")
            delete_malik(malik_id, app_data_dir)
            return {"success": True, "message": "Malik silindi"}

        # ─── TAPU RECORD CRUD ────────────────────────────
        elif action == "add_tapu_record":
            malik_id = data.get("malik_id")
            pdf_path = data.get("pdf_path", "")

            if not os.path.exists(pdf_path):
                return {"error": f"Dosya bulunamadı: {pdf_path}"}

            # Parse the PDF
            try:
                parsed = parse_tapu_pdf(pdf_path)
            except Exception as e:
                return {"error": f"PDF okunamadı: {str(e)}"}

            # Validate if it's actually a readable Tapu document
            if not parsed.get("tapu_date") and not parsed.get("owner_name") and parsed.get("total_entries", 0) == 0:
                return {
                    "error": "Bu PDF dosyasından hiçbir veri çıkarılamadı. Dosyanın şifreli, resim formatında veya geçerli bir Tapu Kaydı belgesi olmadığından emin olun."
                }

            # Save to database
            record = add_tapu_record(
                malik_id, pdf_path, parsed["tapu_date"],
                parsed["entries"], app_data_dir
            )
            if "error" in record:
                return record

            return {
                "success": True,
                "data": {
                    "record": record,
                    "parsed": parsed
                }
            }

        elif action == "get_tapu_records":
            malik_id = data.get("malik_id")
            records = get_tapu_records(malik_id, app_data_dir)
            return {"success": True, "data": records}

        elif action == "get_tapu_record_detail":
            record_id = data.get("record_id")
            record = get_tapu_record(record_id, app_data_dir)
            if not record:
                return {"error": "Kayıt bulunamadı"}
            entries = get_serh_entries(record_id, app_data_dir)
            grouped = get_serh_entries_grouped(record_id, app_data_dir)
            return {
                "success": True,
                "data": {
                    "record": record,
                    "entries": entries,
                    "grouped": grouped
                }
            }

        elif action == "delete_tapu_record":
            record_id = data.get("record_id")
            delete_tapu_record(record_id, app_data_dir)
            return {"success": True, "message": "Kayıt silindi"}

        # ─── COMPARE ─────────────────────────────────────
        elif action == "compare_records":
            old_record_id = data.get("old_record_id")
            new_record_id = data.get("new_record_id")

            old_entries = get_serh_entries(old_record_id, app_data_dir)
            new_entries = get_serh_entries(new_record_id, app_data_dir)

            comparison = compare_tapu_records(old_entries, new_entries)
            return {"success": True, "data": comparison}

        # ─── EXPORT COLUMNS ──────────────────────────────
        elif action == "get_export_columns":
            return {
                "success": True,
                "data": [{"key": c["key"], "label": c["label"]} for c in ALL_COLUMNS]
            }

        # ─── EXPORT EXCEL ────────────────────────────────
        elif action == "export_excel":
            record_id = data.get("record_id")
            output_path = data.get("output_path", "")
            selected_columns = data.get("selected_columns", None)

            record = get_tapu_record(record_id, app_data_dir)
            if not record:
                return {"error": "Kayıt bulunamadı"}

            grouped = get_serh_entries_grouped(record_id, app_data_dir)

            # Get malik name
            malik = get_malik(record["malik_id"], app_data_dir)
            malik_name = malik["name"] if malik else "Bilinmeyen"

            export_to_excel(grouped, malik_name, record["tapu_date"], output_path, selected_columns)
            return {"success": True, "data": {"path": output_path}}

        elif action == "export_comparison_excel":
            old_record_id = data.get("old_record_id")
            new_record_id = data.get("new_record_id")
            output_path = data.get("output_path", "")
            selected_columns = data.get("selected_columns", None)

            old_record = get_tapu_record(old_record_id, app_data_dir)
            new_record = get_tapu_record(new_record_id, app_data_dir)
            if not old_record or not new_record:
                return {"error": "Kayıtlar bulunamadı"}

            old_entries = get_serh_entries(old_record_id, app_data_dir)
            new_entries = get_serh_entries(new_record_id, app_data_dir)
            comparison = compare_tapu_records(old_entries, new_entries)

            malik = get_malik(old_record["malik_id"], app_data_dir)
            malik_name = malik["name"] if malik else "Bilinmeyen"

            export_comparison_to_excel(
                comparison, malik_name,
                old_record["tapu_date"], new_record["tapu_date"],
                output_path, selected_columns
            )
            return {"success": True, "data": {"path": output_path}}

        else:
            return {"error": f"Unknown action: {action}"}

    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}


def main():
    """Main loop - reads JSON commands from stdin, writes JSON responses to stdout."""
    # Read from stdin line by line
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            cmd = json.loads(line)
            result = handle_command(cmd)
        except json.JSONDecodeError as e:
            result = {"error": f"Invalid JSON: {str(e)}"}
        except Exception as e:
            result = {"error": str(e), "traceback": traceback.format_exc()}

        # Write result to stdout
        sys.stdout.write(json.dumps(result, ensure_ascii=False) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    # Check if a single command is passed as argument (for testing)
    if len(sys.argv) > 1:
        cmd_str = " ".join(sys.argv[1:])
        try:
            cmd = json.loads(cmd_str)
            result = handle_command(cmd)
            print(json.dumps(result, ensure_ascii=False, indent=2))
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON argument"}))
    else:
        main()
