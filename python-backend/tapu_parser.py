# -*- coding: utf-8 -*-
"""
Tapu Kaydı PDF Parser
Extracts şerh (annotation) information from Turkish land registry PDFs.
Groups results by İcra Dairesi (Execution Office).
"""

import re
import json
import sys
import fitz  # PyMuPDF


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from a PDF file."""
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    doc.close()
    return full_text


def extract_tapu_date(text: str) -> str:
    """
    Extract the tapu record date from the document header.
    Format: Tarih: 22-4-2026-14:04
    """
    pattern = r"Tarih:\s*(\d{1,2}-\d{1,2}-\d{4}-\d{2}:\d{2})"
    match = re.search(pattern, text)
    if match:
        return match.group(1)
    return ""


def extract_malik_name(text: str) -> str:
    """Extract the malik (owner) name from the document."""
    pattern = r"Kayd[ıi]\s*Olu[şs]turan:\s*(.+)"
    match = re.search(pattern, text)
    if match:
        return match.group(1).strip()
    return ""


def extract_serh_entries(text: str) -> list:
    """
    Extract all şerh (annotation) entries from the tapu record.
    Each entry contains:
    - type: İcrai Haciz / İhtiyati Haciz
    - icra_dairesi: Name of the execution office
    - tarih: Date of the haciz yazısı
    - dosya_no: File/case number
    - bedel: Amount in TL
    - alacakli: Creditor name
    - yevmiye_tarih: Yevmiye registration date
    - yevmiye_no: Yevmiye number
    """
    entries = []

    # Normalize text - replace common OCR issues
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")

    # Pattern to match İcrai Haciz and İhtiyati Haciz entries
    # The PDF has entries like:
    # İcrai Haciz :   SAKARYA 3. İCRA DAİRESİ nin DD/MM/YYYY tarih YYYY/NNNNN [ESAS] sayılı ...
    # ... TL bedel ile Alacaklı : NAME lehine haciz işlenmiştir.
    # ERDAL BARIN
    # Serdivan - DD-MM-YYYY HH:MM - YEVMIYE_NO

    # Main pattern for haciz entries
    serh_pattern = re.compile(
        r"(?:(?:[İI]crai|[İI]htiyati)\s+Haciz)\s*:\s+"  # Type
        r"(.*?)\s*(?:nin|n[ıi]n)\s+"  # İcra Dairesi
        r"(\d{1,2}/\d{1,2}/\d{4})\s+tarih\s+"  # Tarih
        r"(\d{4}/\d+)\s*"  # Dosya No
        r"(?:ESAS\s+)?(?:say[ıi]l[ıi]|sayl)\s+"  # sayılı
        r".*?"  # Haciz Yazısı text
        r"(?:(\d[\d,.]*)\s+TL\s+)?.*?"  # Optional bedel
        r"(?:Alacakl[ıi]\s*:\s*(.*?)\s+lehine|Alacakl[ıi]\s*:\s*(.*?)\s*\))",  # Alacaklı
        re.DOTALL | re.IGNORECASE
    )

    # Yevmiye pattern - appears after the haciz entry
    yevmiye_pattern = re.compile(
        r"(\d{1,2}-\d{1,2}-\d{4})\s+\d{1,2}:\d{2}\s*-\s*(\d+)"
    )

    # Split text into şerh blocks
    # Each block starts with "Şerh" or "Serh"
    blocks = re.split(r'\n\s*(?:Şerh|Serh)\s*\n', normalized)

    for block in blocks:
        # Determine type
        haciz_type = ""
        if re.search(r"[İI]crai\s+Haciz", block, re.IGNORECASE):
            haciz_type = "İcrai Haciz"
        elif re.search(r"[İI]htiyati\s+Haciz", block, re.IGNORECASE):
            haciz_type = "İhtiyati Haciz"
        else:
            continue

        # Extract İcra Dairesi
        icra_match = re.search(
            r"(?:[İI]crai|[İI]htiyati)\s+Haciz\s*:\s+(.+?)\s+(?:nin|n[ıi]n)\s",
            block, re.IGNORECASE | re.DOTALL
        )
        if not icra_match:
            continue

        icra_dairesi_raw = icra_match.group(1).strip()
        # Clean up multi-line icra dairesi names
        icra_dairesi = re.sub(r'\s+', ' ', icra_dairesi_raw).strip()
        
        # Normalize text to uppercase with Turkish characters
        icra_dairesi = icra_dairesi.replace('i', 'İ').replace('ı', 'I').upper()
        
        # Remove PDF footer/watermark artifacts that may get sandwiched
        icra_dairesi = re.sub(r'BİLGİ AMAÇLIDIR\.?', '', icra_dairesi)
        icra_dairesi = re.sub(r'\d+\s*/\s*\d+', '', icra_dairesi) # Sayfa numaraları (8 / 26)
        icra_dairesi = re.sub(r'\d{1,2}-\d{1,2}-\d{4}', '', icra_dairesi) # Tarihler
        icra_dairesi = re.sub(r'\d{1,2}:\d{2}', '', icra_dairesi) # Saatler
        icra_dairesi = re.sub(r'[-\_]', ' ', icra_dairesi) # Tireleri boşluğa çevir
        icra_dairesi = re.sub(r'\s+', ' ', icra_dairesi).strip() # Fazla boşlukları temizle
        
        # Normalize "MÜDÜRLÜĞÜ" to "DAİRESİ" and fix common typos
        icra_dairesi = icra_dairesi.replace('MÜDÜRLÜĞÜ', 'DAİRESİ')
        icra_dairesi = icra_dairesi.replace('İCRRA', 'İCRA')
        
        # Collapse garbage between İCRA and DAİRESİ (e.g. malik names like "ERDAL SERDİVAN")
        # Safely preserves valid execution office terms like VE, İFLAS, SATIŞ
        icra_dairesi = re.sub(r'(İCRA)\s+(?!(?:VE|İFLAS|SATIŞ|GAYRİMENKUL|HUKUK|CEZA)\s).*?(DAİRESİ)', r'\1 \2', icra_dairesi)
        
        # Standardize numbering formatting: "3 İCRA", "3.İCRA" or "3. İCRA" -> "3. İCRA"
        icra_dairesi = re.sub(r'(\d)\.?\s*İCRA', r'\1. İCRA', icra_dairesi)

        # Extract tarih (date from the haciz yazısı)
        tarih_match = re.search(
            r"(\d{1,2}/\d{1,2}/\d{4})\s+tarih",
            block
        )
        tarih = tarih_match.group(1) if tarih_match else ""

        # Extract dosya no
        dosya_match = re.search(
            r"tarih\s+(\d{4}/\d+)",
            block
        )
        dosya_no = dosya_match.group(1) if dosya_match else ""

        # Extract bedel (amount)
        bedel_match = re.search(
            r"([\d,.]+)\s+TL",
            block
        )
        bedel = bedel_match.group(1) if bedel_match else ""

        # Extract alacaklı
        alacakli_match = re.search(
            r"Alacakl[ıi]\s*:\s*(.+?)\s+(?:lehine|T\.C\.)",
            block, re.IGNORECASE | re.DOTALL
        )
        if alacakli_match:
            alacakli = re.sub(r'\s+', ' ', alacakli_match.group(1)).strip()
            # Clean up TC No from alacaklı name
            alacakli = re.sub(r'\s*T\.C\.NO:\d+\s*', '', alacakli).strip()
            # Remove trailing comma
            alacakli = alacakli.rstrip(',').strip()
        else:
            alacakli = ""

        # Extract yevmiye info (date and number)
        # Look for pattern: DD-MM-YYYY HH:MM - NUMBER
        yevmiye_matches = yevmiye_pattern.findall(block)
        if yevmiye_matches:
            # Take the last yevmiye match in the block (most relevant)
            yevmiye_tarih = yevmiye_matches[-1][0]
            yevmiye_no = yevmiye_matches[-1][1]
        else:
            yevmiye_tarih = ""
            yevmiye_no = ""

        entry = {
            "type": haciz_type,
            "icra_dairesi": icra_dairesi,
            "tarih": tarih,
            "dosya_no": dosya_no,
            "bedel": bedel,
            "alacakli": alacakli,
            "yevmiye_tarih": yevmiye_tarih,
            "yevmiye_no": yevmiye_no,
        }
        entries.append(entry)

    return entries


def group_by_icra_dairesi(entries: list) -> dict:
    """Group şerh entries by İcra Dairesi."""
    grouped = {}
    for entry in entries:
        dairesi = entry["icra_dairesi"]
        if dairesi not in grouped:
            grouped[dairesi] = []
        grouped[dairesi].append(entry)
    return grouped


def parse_tapu_pdf(pdf_path: str) -> dict:
    """
    Main parsing function. Returns structured data from a tapu PDF.
    """
    text = extract_text_from_pdf(pdf_path)
    tapu_date = extract_tapu_date(text)
    malik_name = extract_malik_name(text)
    entries = extract_serh_entries(text)
    grouped = group_by_icra_dairesi(entries)

    return {
        "tapu_date": tapu_date,
        "malik_name": malik_name,
        "total_entries": len(entries),
        "entries": entries,
        "grouped": grouped,
    }


def compare_tapu_records(old_entries: list, new_entries: list) -> dict:
    """
    Compare two tapu records to find removed and remaining haciz entries.
    Uses dosya_no + icra_dairesi as unique key.
    """
    def make_key(entry):
        return f"{entry['icra_dairesi']}|{entry['dosya_no']}"

    old_keys = {make_key(e): e for e in old_entries}
    new_keys = {make_key(e): e for e in new_entries}

    removed = []
    remaining = []
    added = []

    for key, entry in old_keys.items():
        if key not in new_keys:
            removed.append(entry)
        else:
            remaining.append(entry)

    for key, entry in new_keys.items():
        if key not in old_keys:
            added.append(entry)

    return {
        "removed": removed,
        "remaining": remaining,
        "added": added,
        "removed_count": len(removed),
        "remaining_count": len(remaining),
        "added_count": len(added),
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "PDF path required"}))
        sys.exit(1)

    result = parse_tapu_pdf(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False, indent=2))
