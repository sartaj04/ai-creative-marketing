
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.utils.json_repair import repair_json

def test_json_repair():
    print("Testing json_repair...")
    
    cases = [
        ('{"a": 1}', {"a": 1}, "Simple valid JSON"),
        ('```json\n{"a": 1}\n```', {"a": 1}, "Markdown block"),
        ('{"a": 1,}', {"a": 1}, "Trailing comma"),
        ('{"a": True, "b": None}', {"a": True, "b": None}, "Python literals"),
        ('Some text\n{"a": 1}\nMore text', {"a": 1}, "Embedded JSON"),
        ('{"a": "missing quote}', None, "Missing closing quote (hard case, expects None or best effort)"), 
        # Note: My simple repair might not handle missing quotes perfectly, but implementation returns None on fail
    ]
    
    passed = 0
    for input_str, expected, desc in cases:
        try:
            result = repair_json(input_str)
            if result == expected:
                print(f"PASS: {desc}")
                passed += 1
            elif expected is None and result is None:
                print(f"PASS: {desc}")
                passed += 1
            else:
                print(f"FAIL: {desc}")
                print(f"  Input: {input_str}")
                print(f"  Got: {result}")
                print(f"  Expected: {expected}")
        except Exception as e:
            print(f"ERROR: {desc} - {e}")

    print(f"Passed {passed}/{len(cases)}")

if __name__ == "__main__":
    test_json_repair()
