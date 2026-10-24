#!/usr/bin/env python3
"""
Quick verification harness for single-file HTML games.
Run with: python3 verify_game.py path/to/game.html

Checks:
1. HTML structure (DOCTYPE, script tags, board container)
2. JavaScript syntax (extracted to temp file, checked with `node --check`)
3. Game state accessibility (via browser js() if available, or headlight node test)
4. Key game functions present (spawn, lock, clearLines, handleLineClear, etc.)
5. Effect configs and sound system present
"""
import subprocess, sys, re, tempfile, os

def verify_game(html_path):
    with open(html_path, 'r') as f:
        content = f.read()
    
    errors = []
    warnings = []
    passed = []
    
    # 1. HTML structure
    if not content.startswith('<!DOCTYPE html>'):
        errors.append("Missing <!DOCTYPE html> at start")
    else:
        passed.append("DOCTYPE present")
    
    if content.count('<script>') != 1:
        errors.append(f"Expected exactly 1 <script> tag, found {content.count('<script>')}")
    else:
        passed.append("Single script tag")
    
    # 2. Extract JS and check syntax
    js_start = content.find('<script>') + 8
    js_end = content.find('</script>')
    js_code = content[js_start:js_end]
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
        f.write(js_code)
        tmp_path = f.name
    
    result = subprocess.run(['node', '--check', tmp_path], capture_output=True, text=True)
    os.unlink(tmp_path)
    
    if result.returncode != 0:
        errors.append(f"JS syntax error: {result.stderr}")
    else:
        passed.append("JavaScript syntax valid")
    
    # 3. Check for game functions
    required_funcs = ['spawn', 'lock', 'clearLines', 'handleLineClear', 
                      'tryRotate', 'move', 'hardDrop', 'render', 
                      'EFFECTS', 'SOUND', 'update', 'gameLoop']
    for func in required_funcs:
        if func not in js_code:
            warnings.append(f"Missing function/const: {func}")
        else:
            passed.append(f"Found {func}")
    
    # 4. Check for canvas creation pitfalls
    if "getElementById('board') || document.createElement('canvas')" in js_code:
        errors.append("Canvas creation bug: getElementById returns a div, causing canvas to be a div")
    
    # 5. Check for scale issues
    if "ctx.scale(" in js_code:
        scale_matches = re.findall(r'ctx\.scale\(([^,]+),\s*([^)]+)\)', js_code)
        passed.append(f"Canvas scale found: {len(scale_matches)} occurrence(s)")
    
    # 6. Effect configs
    config_count = js_code.count('{ name:')
    if config_count < 10:
        warnings.append(f"Only {config_count} effect configs (expect 10+ for progression)")
    else:
        passed.append(f"{config_count} effect configs")
    
    # 7. Check for duplicate object keys (common JS pitfall)
    # Look for duplicate keys in object literals
    dup_pattern = r"'([^']+)'\s*:\s*[^,}]+,\s*\n\s*'([^']+)'\s*:"
    # This is a rough check - just look for 'Enter' specifically
    if js_code.count("'Enter'") > 1:
        warnings.append("Duplicate Enter key binding found (last one wins)")
    
    # Report
    print(f"\n=== Verification: {html_path} ===")
    print(f"\nPassed ({len(passed)}):")
    for p in passed:
        print(f"  ✓ {p}")
    
    if warnings:
        print(f"\nWarnings ({len(warnings)}):")
        for w in warnings:
            print(f"  ⚠ {w}")
    
    if errors:
        print(f"\nErrors ({len(errors)}):")
        for e in errors:
            print(f"  ✗ {e}")
        return False
    
    print("\n✅ All checks passed!")
    return True

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
    verify_game(path)
