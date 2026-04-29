import sys
sys.path.insert(0, 'python-backend')
from tapu_parser import parse_tapu_pdf

pdf_path = sys.argv[1] if len(sys.argv) > 1 else r'Erdal Barın.pdf'
result = parse_tapu_pdf(pdf_path)
print("Total:", result["total_entries"])
print()

# Check previously problematic entries and specifically requested dosya numbers
check_indices = [14, 16, 66, 79]
found_target_dosya = 0
for i, e in enumerate(result['entries']):
    idx = i + 1
    if e['dosya_no'] in ('2018/863', '2020/8189', '2022/5639', '2020/6449'):
        print("FOUND REQUESTED DOSYA:")
        print("  Index:", idx)
        print("  Type:", e["type"])
        print("  Icra:", e["icra_dairesi"])
        print("  Dosya:", e["dosya_no"])
        print("  Yevmiye:", e["yevmiye_no"])
        print()
        found_target_dosya += 1
        
    if idx in check_indices:
        print("Entry", idx)
        print("  Type:", e["type"])
        print("  Icra:", e["icra_dairesi"])
        print("  Dosya:", e["dosya_no"])
        print("  Bedel:", e["bedel"])
        print("  Alacakli:", e["alacakli"])
        print("  Yevmiye:", e["yevmiye_no"])
        print()
        
print(f"Found {found_target_dosya} of the requested dosya numbers.")
