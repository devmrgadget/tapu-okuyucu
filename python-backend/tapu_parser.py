# -*- coding: utf-8 -*-
"""
Tapu Kaydı PDF Parser
Extracts şerh (annotation) information from Turkish land registry PDFs.
Groups results by İcra Dairesi (Execution Office).

Supported şerh types:
  - İcrai Haciz (enforcement lien)
  - İhtiyati Haciz (precautionary lien)
  - Kamu Haczi (public/tax lien)
  - Satış (sale notice by execution office)
  - İİK 150/c (mortgage enforcement notice)
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


def _clean_block(block: str, malik_name: str = "") -> str:
    """
    Remove PDF page footer/header artifacts from within a block.
    These occur when a şerh entry spans across a page boundary.

    Full artifact pattern (all lines are optional except the malik name):
      ERDAL                          <- malik first name
      BARIN                          <- malik last name
      Serdivan -                     <- location
      10-10-2019 16:41 -             <- yevmiye date/time
      12065                          <- yevmiye number
      5 / 23                         <- page number
      BİLGİ AMAÇLIDIR                <- watermark
    """
    cleaned = block

    # If we know the malik name, remove full page-break artifact
    if malik_name:
        name_parts = malik_name.strip().split()
        if len(name_parts) >= 2:
            # Build a flexible pattern for the malik name split across lines
            name_pat = r'\s*' + r'\s*\n\s*'.join(re.escape(p) for p in name_parts) + r'\s*\n'
            # Full artifact: name + location + yevmiye + page num + watermark
            full_artifact = (
                name_pat +
                r'(?:\s*\S+\s*-\s*\n)?'                          # Location "Serdivan -"
                r'(?:\s*\d{1,2}-\d{1,2}-\d{4}\s+\d{1,2}:\d{2}\s*-\s*\n)?'  # Yevmiye date "10-10-2019 16:41 -"
                r'(?:\s*\d+\s*\n)?'                               # Yevmiye number "12065"
                r'(?:\s*\d+\s*/\s*\d+\s*\n)?'                    # Page number "5 / 23"
                r'(?:\s*BİLGİ AMAÇLIDIR\s*\n?)?'                 # Watermark
            )
            cleaned = re.sub(full_artifact, '\n', cleaned, flags=re.IGNORECASE)

    # Remove page number + watermark lines
    cleaned = re.sub(
        r'\n\s*\d+\s*/\s*\d+\s*\n\s*BİLGİ AMAÇLIDIR\s*\n?',
        '\n',
        cleaned
    )
    # Also remove standalone watermark
    cleaned = re.sub(r'\nBİLGİ AMAÇLIDIR\s*\n?', '\n', cleaned)
    # Remove standalone page numbers at end of line
    cleaned = re.sub(r'\n\s*\d+\s*/\s*\d+\s*\n', '\n', cleaned)
    return cleaned


def _normalize_icra_dairesi(raw: str) -> str:
    """Normalize İcra Dairesi name for consistent grouping."""
    icra_dairesi = re.sub(r'\s+', ' ', raw).strip()

    # Normalize text to uppercase with Turkish characters
    icra_dairesi = icra_dairesi.replace('i', 'İ').replace('ı', 'I').upper()

    # Remove PDF footer/watermark artifacts that may get sandwiched
    icra_dairesi = re.sub(r'BİLGİ AMAÇLIDIR\.?', '', icra_dairesi)
    icra_dairesi = re.sub(r'\d+\s*/\s*\d+', '', icra_dairesi)  # Page numbers
    icra_dairesi = re.sub(r'\d{1,2}-\d{1,2}-\d{4}', '', icra_dairesi)  # Dates
    icra_dairesi = re.sub(r'\d{1,2}:\d{2}', '', icra_dairesi)  # Times
    icra_dairesi = re.sub(r'[-\_]', ' ', icra_dairesi)  # Hyphens to spaces
    icra_dairesi = re.sub(r'\s+', ' ', icra_dairesi).strip()

    # Normalize "MÜDÜRLÜĞÜ" to "DAİRESİ" and fix common typos
    icra_dairesi = icra_dairesi.replace('MÜDÜRLÜĞÜ', 'DAİRESİ')
    icra_dairesi = icra_dairesi.replace('İCRRA', 'İCRA')

    # Collapse garbage between İCRA and DAİRESİ (e.g. malik names)
    icra_dairesi = re.sub(
        r'(İCRA)\s+(?!(?:VE|İFLAS|SATIŞ|GAYRİMENKUL|HUKUK|CEZA)\s).*?(DAİRESİ)',
        r'\1 \2', icra_dairesi
    )

    # Standardize numbering: "3 İCRA", "3.İCRA", "3. İCRA" -> "3. İCRA"
    icra_dairesi = re.sub(r'(\d)\.?\s*İCRA', r'\1. İCRA', icra_dairesi)

    return icra_dairesi


def extract_serh_entries(text: str, malik_name: str = "") -> list:
    """
    Extract all şerh (annotation) entries from the tapu record.
    Supports: İcrai Haciz, İhtiyati Haciz, Kamu Haczi, Satış, İİK 150/c.

    Each entry contains:
    - type: İcrai Haciz / İhtiyati Haciz / Kamu Haczi / Satış / İİK 150/c
    - icra_dairesi: Name of the execution office
    - tarih: Date of the haciz yazısı
    - dosya_no: File/case number
    - bedel: Amount in TL
    - alacakli: Creditor name
    - yevmiye_tarih: Yevmiye registration date
    - yevmiye_no: Yevmiye number
    """
    entries = []

    # Normalize text
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")

    # Yevmiye pattern - appears after the haciz entry
    # Added negative lookahead \b(?!\s*/) to prevent capturing partial page numbers
    yevmiye_pattern = re.compile(
        r"(\d{1,2}-\d{1,2}-\d{4})\s+\d{1,2}:\d{2}\s*-\s*(\d+)\b(?!\s*/)"
    )

    # Split text into şerh blocks
    # Each block starts with "Şerh" or "Serh"
    # Also stop at "REHİN BİLGİLERİ" or "İpotek" sections to avoid capturing
    # mortgage data
    # First, truncate at the mortgage/rehin section
    cut_markers = [
        r'MÜLKİYETE AİT REHİN BİLGİLERİ',
        r'Rehine Ait Şerh Beyan',
    ]
    serh_text = normalized
    for marker in cut_markers:
        cut_match = re.search(marker, serh_text)
        if cut_match:
            serh_text = serh_text[:cut_match.start()]

    blocks = re.split(r'\n\s*(?:Şerh|Serh)\s*\n', serh_text)

    for block in blocks:
        # ── Extract yevmiye info FIRST (before cleaning) ────
        yevmiye_matches = yevmiye_pattern.findall(block)
        if yevmiye_matches:
            # Take the last yevmiye match in the block (most relevant)
            yevmiye_tarih = yevmiye_matches[-1][0]
            yevmiye_no = yevmiye_matches[-1][1]
        else:
            # Fallback for page-split yevmiye (date and number separated by page break)
            # Date stays on page 1 footer, number goes to end of block on page 2
            date_match = re.search(r"(\d{1,2}-\d{1,2}-\d{4})\s+\d{1,2}:\d{2}\s*-", block)
            num_match = re.search(r"\n\s*(\d+)\s*$", block)
            if date_match and num_match:
                yevmiye_tarih = date_match.group(1)
                yevmiye_no = num_match.group(1)
            else:
                yevmiye_tarih = ""
                yevmiye_no = ""

        # Clean page break artifacts from within the block
        block = _clean_block(block, malik_name)

        # ── Determine type ──────────────────────────────────
        haciz_type = ""
        if re.search(r"[İI]crai\s+Haciz", block, re.IGNORECASE):
            haciz_type = "İcrai Haciz"
        elif re.search(r"[İI]htiyati\s+Haciz", block, re.IGNORECASE):
            haciz_type = "İhtiyati Haciz"
        elif re.search(r"Kamu\s+Haczi", block, re.IGNORECASE):
            haciz_type = "Kamu Haczi"
        elif re.search(r"satışına\s+gidilmiştir", block, re.IGNORECASE):
            haciz_type = "Satış"
        elif re.search(r"İİK\s+150/c", block, re.IGNORECASE):
            haciz_type = "İİK 150/c"
        else:
            continue

        # ── Extract İcra Dairesi ────────────────────────────
        icra_dairesi = ""

        if haciz_type in ("İcrai Haciz", "İhtiyati Haciz"):
            icra_match = re.search(
                r"(?:[İI]crai|[İI]htiyati)\s+Haciz\s*:\s+(.+?)\s+(?:nin|n[ıi]n)\s",
                block, re.IGNORECASE | re.DOTALL
            )
            if icra_match:
                icra_dairesi = _normalize_icra_dairesi(icra_match.group(1))
            else:
                continue
        elif haciz_type == "Kamu Haczi":
            # Kamu Haczi : 054251 GÜMRÜKÖNU Vergi Dairesi nin ...
            icra_match = re.search(
                r"Kamu\s+Haczi\s*:\s+(.+?)\s+(?:nin|n[ıi]n)\s",
                block, re.IGNORECASE | re.DOTALL
            )
            if icra_match:
                raw = icra_match.group(1).strip()
                # Clean numeric prefixes like "054251"
                raw = re.sub(r'^\d+\s+', '', raw)
                icra_dairesi = _normalize_icra_dairesi(raw)
                # For Vergi Dairesi, keep the original name style
                if 'VERGİ' in icra_dairesi or 'VERG' in icra_dairesi:
                    icra_dairesi = re.sub(r'\s+', ' ', icra_dairesi).strip()
            else:
                continue
        elif haciz_type == "Satış":
            # SAKARYA 3. İCRA DAİRESİ nin ... satışına gidilmiştir.
            icra_match = re.search(
                r"(.+?)\s+(?:nin|n[ıi]n)\s+\d{1,2}/\d{1,2}/\d{4}",
                block, re.IGNORECASE | re.DOTALL
            )
            if icra_match:
                icra_dairesi = _normalize_icra_dairesi(icra_match.group(1))
            else:
                icra_dairesi = "BİLİNMEYEN"
        elif haciz_type == "İİK 150/c":
            # İİK 150/c ... ANADOLU 16. İCRA MÜDÜRLÜĞÜ nin ...
            icra_match = re.search(
                r"(.+?)\s+(?:nin|n[ıi]n)\s+\d{1,2}/\d{1,2}/\d{4}",
                block, re.IGNORECASE | re.DOTALL
            )
            if icra_match:
                # Extract just the office name from the matched text
                raw = icra_match.group(1)
                # Look for the office name pattern within
                office_match = re.search(
                    r"([A-ZÇĞIİÖŞÜa-zçğıiöşü0-9\s.]+(?:İCRA|icra)\s+(?:MÜDÜRLÜĞÜ|DAİRESİ|Müdürlüğü|Dairesi))",
                    raw, re.IGNORECASE
                )
                if office_match:
                    icra_dairesi = _normalize_icra_dairesi(office_match.group(1))
                else:
                    icra_dairesi = _normalize_icra_dairesi(raw)
            else:
                icra_dairesi = "BİLİNMEYEN"

        # ── Extract tarih (date from the haciz yazısı) ──────
        tarih_match = re.search(
            r"(\d{1,2}/\d{1,2}/\d{4})\s+tarih",
            block
        )
        tarih = tarih_match.group(1) if tarih_match else ""

        # ── Extract dosya no ────────────────────────────────
        # Handle cases like "2018/27046ESAS" (no space) and "2018/283 ESAS"
        dosya_match = re.search(
            r"tarih\s+(\d{4}/\d+)\s*",
            block
        )
        dosya_no = dosya_match.group(1) if dosya_match else ""

        # For Satış type, dosya may use TLMT. format
        if not dosya_no and haciz_type == "Satış":
            dosya_match = re.search(r"tarih\s+(\d{4}/\d+)", block)
            dosya_no = dosya_match.group(1) if dosya_match else ""

        # ── Extract bedel (amount) ──────────────────────────
        # Look for bedel in proper context to avoid false positives
        bedel = ""
        # Try "bedel ile" pattern first (İcrai Haciz)
        bedel_match = re.search(
            r"([\d,.]+)\s+TL\s+bedel",
            block, re.IGNORECASE
        )
        if bedel_match:
            bedel = bedel_match.group(1)
        else:
            # Try "Borç : AMOUNT TL" pattern (İhtiyati Haciz, Kamu Haczi)
            bedel_match = re.search(
                r"Bor[çc]\s*:\s*([\d,.]+)\s+TL",
                block, re.IGNORECASE
            )
            if bedel_match:
                bedel = bedel_match.group(1)
            else:
                # Generic fallback - but only if not a Satış type
                # (Satış entries don't have bedel)
                if haciz_type not in ("Satış", "İİK 150/c"):
                    bedel_match = re.search(r"([\d,.]+)\s+TL", block)
                    bedel = bedel_match.group(1) if bedel_match else ""

        # ── Extract alacaklı ────────────────────────────────
        alacakli = ""
        # Try standard pattern: "Alacaklı : NAME lehine"
        alacakli_match = re.search(
            r"Alacakl[ıi]\s*:\s*(.+?)\s+lehine",
            block, re.IGNORECASE | re.DOTALL
        )
        if alacakli_match:
            alacakli = re.sub(r'\s+', ' ', alacakli_match.group(1)).strip()
            alacakli = re.sub(r'\s*T\.C\.NO:\d+\s*', '', alacakli).strip()
            alacakli = alacakli.rstrip(',').strip()
        else:
            # Try parenthesized pattern: "(Alacaklı : NAME )"
            alacakli_match = re.search(
                r"Alacakl[ıi]\s*:\s*(.+?)\s*\)",
                block, re.IGNORECASE | re.DOTALL
            )
            if alacakli_match:
                alacakli = re.sub(r'\s+', ' ', alacakli_match.group(1)).strip()
                alacakli = re.sub(r'\s*T\.C\.NO:\d+\s*', '', alacakli).strip()
                alacakli = alacakli.rstrip(',').strip()

        # Clean page-break malik artifacts from alacaklı
        # e.g. "Tok Kardeşler Yapı ERDAL BARIN Serdivan -"
        if alacakli and malik_name:
            # Dynamically remove the malik name from alacaklı
            name_parts = malik_name.strip().split()
            if len(name_parts) >= 2:
                # Build pattern from malik name (case-insensitive)
                name_pattern = r'\s+' + r'\s+'.join(re.escape(p) for p in name_parts) + r'.*$'
                alacakli = re.sub(name_pattern, '', alacakli, flags=re.IGNORECASE).strip()
            # Remove "Serdivan -" or similar location artifacts
            alacakli = re.sub(
                r'\s+Serdivan\s*-.*$', '', alacakli, flags=re.IGNORECASE
            ).strip()
            # Remove numeric residue like "054251"
            alacakli = re.sub(r'^\d{4,}\s+', '', alacakli).strip()

        # (yevmiye info is already extracted above)

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
    entries = extract_serh_entries(text, malik_name)
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
    Compare two tapu records to find removed and remaining şerh entries.
    Uses icra_dairesi + dosya_no + yevmiye_no as unique key to track
    individual annotations even when they share the same dosya number.
    """
    def make_key(entry):
        return f"{entry['icra_dairesi']}|{entry['dosya_no']}|{entry['yevmiye_no']}"

    # Build lookup: key -> list of entries (handle duplicates)
    old_lookup = {}
    for e in old_entries:
        key = make_key(e)
        if key not in old_lookup:
            old_lookup[key] = []
        old_lookup[key].append(e)

    new_lookup = {}
    for e in new_entries:
        key = make_key(e)
        if key not in new_lookup:
            new_lookup[key] = []
        new_lookup[key].append(e)

    removed = []
    remaining = []
    added = []

    # Check old entries against new
    for key, old_list in old_lookup.items():
        if key not in new_lookup:
            # All entries with this key were removed
            removed.extend(old_list)
        else:
            new_count = len(new_lookup[key])
            old_count = len(old_list)
            # Match up to the minimum count as remaining
            matched = min(old_count, new_count)
            remaining.extend(old_list[:matched])
            # If old had more, the extras were removed
            if old_count > new_count:
                removed.extend(old_list[matched:])

    # Check new entries for additions
    for key, new_list in new_lookup.items():
        if key not in old_lookup:
            added.extend(new_list)
        else:
            old_count = len(old_lookup[key])
            new_count = len(new_list)
            # If new has more, the extras are additions
            if new_count > old_count:
                added.extend(new_list[old_count:])

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
