# -*- coding: utf-8 -*-
"""
SQLite Database Module for Tapu Okuyucu.
Manages maliks (owners), tapu records, and şerh entries.
"""

import sqlite3
import os
import json
from datetime import datetime


DB_PATH = None


def get_db_path(app_data_dir: str = None) -> str:
    """Get the database file path."""
    global DB_PATH
    if DB_PATH:
        return DB_PATH

    if app_data_dir:
        os.makedirs(app_data_dir, exist_ok=True)
        DB_PATH = os.path.join(app_data_dir, "tapu_okuyucu.db")
    else:
        DB_PATH = os.path.join(os.path.dirname(__file__), "tapu_okuyucu.db")

    return DB_PATH


def get_connection(app_data_dir: str = None) -> sqlite3.Connection:
    """Get a database connection."""
    db_path = get_db_path(app_data_dir)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db(app_data_dir: str = None):
    """Initialize the database schema."""
    conn = get_connection(app_data_dir)
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS maliks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS tapu_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            malik_id INTEGER NOT NULL,
            pdf_path TEXT NOT NULL,
            tapu_date TEXT,
            total_entries INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (malik_id) REFERENCES maliks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS serh_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tapu_record_id INTEGER NOT NULL,
            type TEXT,
            icra_dairesi TEXT,
            tarih TEXT,
            dosya_no TEXT,
            bedel TEXT,
            alacakli TEXT,
            yevmiye_tarih TEXT,
            yevmiye_no TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (tapu_record_id) REFERENCES tapu_records(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_tapu_records_malik ON tapu_records(malik_id);
        CREATE INDEX IF NOT EXISTS idx_serh_entries_tapu ON serh_entries(tapu_record_id);
        CREATE INDEX IF NOT EXISTS idx_serh_icra_dairesi ON serh_entries(icra_dairesi);
    """)

    conn.commit()
    conn.close()


# ─── MALIK CRUD ───────────────────────────────────────────────

def add_malik(name: str, app_data_dir: str = None) -> dict:
    """Add a new malik."""
    conn = get_connection(app_data_dir)
    try:
        cursor = conn.execute(
            "INSERT INTO maliks (name) VALUES (?)", (name.strip(),)
        )
        conn.commit()
        malik = conn.execute(
            "SELECT * FROM maliks WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
        return dict(malik)
    except sqlite3.IntegrityError:
        return {"error": f"'{name}' zaten mevcut."}
    finally:
        conn.close()


def get_all_maliks(app_data_dir: str = None) -> list:
    """Get all maliks."""
    conn = get_connection(app_data_dir)
    rows = conn.execute(
        "SELECT m.*, COUNT(t.id) as record_count "
        "FROM maliks m LEFT JOIN tapu_records t ON m.id = t.malik_id "
        "GROUP BY m.id ORDER BY m.name"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_malik(malik_id: int, app_data_dir: str = None) -> dict:
    """Get a single malik by ID."""
    conn = get_connection(app_data_dir)
    row = conn.execute("SELECT * FROM maliks WHERE id = ?", (malik_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def delete_malik(malik_id: int, app_data_dir: str = None) -> bool:
    """Delete a malik and all related records."""
    conn = get_connection(app_data_dir)
    conn.execute("DELETE FROM maliks WHERE id = ?", (malik_id,))
    conn.commit()
    conn.close()
    return True


# ─── TAPU RECORD CRUD ────────────────────────────────────────

def add_tapu_record(malik_id: int, pdf_path: str, tapu_date: str,
                    entries: list, app_data_dir: str = None) -> dict:
    """Add a tapu record with its şerh entries."""
    conn = get_connection(app_data_dir)
    try:
        cursor = conn.execute(
            "INSERT INTO tapu_records (malik_id, pdf_path, tapu_date, total_entries) "
            "VALUES (?, ?, ?, ?)",
            (malik_id, pdf_path, tapu_date, len(entries))
        )
        tapu_record_id = cursor.lastrowid

        for entry in entries:
            conn.execute(
                "INSERT INTO serh_entries "
                "(tapu_record_id, type, icra_dairesi, tarih, dosya_no, bedel, alacakli, yevmiye_tarih, yevmiye_no) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    tapu_record_id,
                    entry.get("type", ""),
                    entry.get("icra_dairesi", ""),
                    entry.get("tarih", ""),
                    entry.get("dosya_no", ""),
                    entry.get("bedel", ""),
                    entry.get("alacakli", ""),
                    entry.get("yevmiye_tarih", ""),
                    entry.get("yevmiye_no", ""),
                )
            )

        conn.commit()

        record = conn.execute(
            "SELECT * FROM tapu_records WHERE id = ?", (tapu_record_id,)
        ).fetchone()
        return dict(record)
    except Exception as e:
        conn.rollback()
        return {"error": str(e)}
    finally:
        conn.close()


def get_tapu_records(malik_id: int, app_data_dir: str = None) -> list:
    """Get all tapu records for a malik."""
    conn = get_connection(app_data_dir)
    rows = conn.execute(
        "SELECT * FROM tapu_records WHERE malik_id = ? ORDER BY tapu_date DESC",
        (malik_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_tapu_record(record_id: int, app_data_dir: str = None) -> dict:
    """Get a single tapu record."""
    conn = get_connection(app_data_dir)
    row = conn.execute(
        "SELECT * FROM tapu_records WHERE id = ?", (record_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def delete_tapu_record(record_id: int, app_data_dir: str = None) -> bool:
    """Delete a tapu record and all related entries."""
    conn = get_connection(app_data_dir)
    conn.execute("DELETE FROM tapu_records WHERE id = ?", (record_id,))
    conn.commit()
    conn.close()
    return True


# ─── ŞERH ENTRIES ────────────────────────────────────────────

def get_serh_entries(tapu_record_id: int, app_data_dir: str = None) -> list:
    """Get all şerh entries for a tapu record."""
    conn = get_connection(app_data_dir)
    rows = conn.execute(
        "SELECT * FROM serh_entries WHERE tapu_record_id = ? "
        "ORDER BY icra_dairesi, dosya_no, yevmiye_tarih",
        (tapu_record_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_serh_entries_grouped(tapu_record_id: int, app_data_dir: str = None) -> dict:
    """Get şerh entries grouped by İcra Dairesi."""
    entries = get_serh_entries(tapu_record_id, app_data_dir)
    grouped = {}
    for entry in entries:
        dairesi = entry["icra_dairesi"]
        if dairesi not in grouped:
            grouped[dairesi] = []
        grouped[dairesi].append(entry)
    return grouped
