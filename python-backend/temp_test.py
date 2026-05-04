import sys
import json
from tapu_parser import extract_text_from_pdf, parse_tapu_pdf

pdf_path = r"c:\Users\mehme\Masaüstü\Mehmet Emin\tapu_okuyucu\ismet akdemir 14.04.pdf"
result = parse_tapu_pdf(pdf_path)

print("Malik Name:", result["malik_name"])

# Let's see the raw block that corresponds to the first 7294 entry
text = extract_text_from_pdf(pdf_path)
normalized = text.replace("\r\n", "\n").replace("\r", "\n")
blocks = normalized.split("Şerh\n")
for block in blocks:
    if "7294" in block and "6761" in block:
        print("\n--- RAW BLOCK ---")
        print(block.strip())
        break
