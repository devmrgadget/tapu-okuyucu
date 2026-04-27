# -*- coding: utf-8 -*-
"""
Excel Export Module for Tapu Okuyucu.
Exports şerh entries to Excel format.
"""

import os
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter


def export_to_excel(grouped_entries: dict, malik_name: str, tapu_date: str,
                    output_path: str) -> str:
    """
    Export grouped şerh entries to an Excel file.
    grouped_entries: dict with İcra Dairesi as key and list of entries as value
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Şerh Listesi"

    # Styles
    header_font = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    subheader_font = Font(name="Calibri", size=12, bold=True, color="FFFFFF")
    subheader_fill = PatternFill(start_color="2E75B6", end_color="2E75B6", fill_type="solid")
    col_header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    col_header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    data_font = Font(name="Calibri", size=10)
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    row = 1

    # Title
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=7)
    cell = ws.cell(row=row, column=1, value=f"Tapu Şerh Listesi - {malik_name}")
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal="center")
    row += 1

    # Date info
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=7)
    cell = ws.cell(row=row, column=1, value=f"Tapu Kayıt Tarihi: {tapu_date}")
    cell.font = Font(name="Calibri", size=11, italic=True)
    cell.alignment = Alignment(horizontal="center")
    row += 2

    # Column headers reference
    columns = ["Tür", "Dosya No", "Tarih", "Bedel (TL)", "Alacaklı", "Yevmiye Tarih", "Yevmiye No"]

    for dairesi, entries in grouped_entries.items():
        # İcra Dairesi header
        ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=7)
        cell = ws.cell(row=row, column=1, value=f"📁 {dairesi}")
        cell.font = subheader_font
        cell.fill = subheader_fill
        cell.alignment = Alignment(horizontal="left")
        row += 1

        # Column headers
        for col_idx, col_name in enumerate(columns, 1):
            cell = ws.cell(row=row, column=col_idx, value=col_name)
            cell.font = col_header_font
            cell.fill = col_header_fill
            cell.alignment = Alignment(horizontal="center")
            cell.border = thin_border
        row += 1

        # Data rows
        for entry in entries:
            values = [
                entry.get("type", ""),
                entry.get("dosya_no", ""),
                entry.get("tarih", ""),
                entry.get("bedel", ""),
                entry.get("alacakli", ""),
                entry.get("yevmiye_tarih", ""),
                entry.get("yevmiye_no", ""),
            ]
            for col_idx, val in enumerate(values, 1):
                cell = ws.cell(row=row, column=col_idx, value=val)
                cell.font = data_font
                cell.border = thin_border
                cell.alignment = Alignment(horizontal="left", wrap_text=True)
            row += 1

        row += 1  # Empty row between groups

    # Auto-adjust column widths
    for col_idx in range(1, 8):
        column_letter = get_column_letter(col_idx)
        max_length = 15
        for r in range(1, row):
            cell_value = ws.cell(row=r, column=col_idx).value
            if cell_value:
                max_length = max(max_length, len(str(cell_value)))
        ws.column_dimensions[column_letter].width = min(max_length + 2, 40)

    wb.save(output_path)
    return output_path


def export_comparison_to_excel(comparison: dict, malik_name: str,
                               old_date: str, new_date: str,
                               output_path: str) -> str:
    """Export comparison results to Excel."""
    wb = Workbook()

    # Removed sheet
    ws_removed = wb.active
    ws_removed.title = "Kaldırılan Hacizler"
    _write_comparison_sheet(ws_removed, comparison["removed"],
                            f"Kaldırılan Hacizler ({old_date} → {new_date})",
                            "FF6B6B", malik_name)

    # Remaining sheet
    ws_remaining = wb.create_sheet("Devam Eden Hacizler")
    _write_comparison_sheet(ws_remaining, comparison["remaining"],
                            f"Devam Eden Hacizler",
                            "FFA726", malik_name)

    # Added sheet
    ws_added = wb.create_sheet("Yeni Eklenen Hacizler")
    _write_comparison_sheet(ws_added, comparison["added"],
                            f"Yeni Eklenen Hacizler ({new_date})",
                            "51CF66", malik_name)

    wb.save(output_path)
    return output_path


def _write_comparison_sheet(ws, entries, title, color, malik_name):
    """Helper to write a comparison sheet."""
    header_font = Font(name="Calibri", size=13, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color=color, end_color=color, fill_type="solid")
    col_header_font = Font(name="Calibri", size=10, bold=True)
    thin_border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )

    row = 1
    columns = ["İcra Dairesi", "Tür", "Dosya No", "Tarih", "Bedel (TL)", "Alacaklı", "Yevmiye Tarih", "Yevmiye No"]

    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=len(columns))
    cell = ws.cell(row=row, column=1, value=f"{title} - {malik_name}")
    cell.font = header_font
    cell.fill = header_fill
    row += 2

    for col_idx, col_name in enumerate(columns, 1):
        cell = ws.cell(row=row, column=col_idx, value=col_name)
        cell.font = col_header_font
        cell.border = thin_border
    row += 1

    for entry in entries:
        values = [
            entry.get("icra_dairesi", ""),
            entry.get("type", ""),
            entry.get("dosya_no", ""),
            entry.get("tarih", ""),
            entry.get("bedel", ""),
            entry.get("alacakli", ""),
            entry.get("yevmiye_tarih", ""),
            entry.get("yevmiye_no", ""),
        ]
        for col_idx, val in enumerate(values, 1):
            cell = ws.cell(row=row, column=col_idx, value=val)
            cell.border = thin_border
        row += 1
