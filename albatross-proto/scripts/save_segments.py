#!/usr/bin/env python3
"""
Save segments JSON into the repository's data/ directory.
Usage:
  python3 scripts/save_segments.py path/to/albatross_segments.json
Or, pipe JSON on stdin:
  cat albatross_segments.json | python3 scripts/save_segments.py
This will write to data/saved_segments.json (create the data/ dir if missing).
The script validates the JSON is an array of {start,end,box} objects.
"""
import sys
import json
from pathlib import Path

OUT_PATH = Path(__file__).resolve().parents[1] / 'data' / 'saved_segments.json'


def load_json_from_stdin_or_file(path_arg):
    if not path_arg:
        # read from stdin
        raw = sys.stdin.read()
    else:
        p = Path(path_arg)
        if not p.exists():
            print(f"Error: file not found: {path_arg}", file=sys.stderr)
            sys.exit(2)
        raw = p.read_text()
    try:
        data = json.loads(raw)
    except Exception as e:
        print(f"Error: failed to parse JSON: {e}", file=sys.stderr)
        sys.exit(3)
    return data


def validate_segments(seg):
    if not isinstance(seg, list):
        return False
    for s in seg:
        if not isinstance(s, dict):
            return False
        if 'start' not in s or 'end' not in s or 'box' not in s:
            return False
        if not (isinstance(s['start'], (int, float)) and isinstance(s['end'], (int, float))):
            return False
        if not isinstance(s['box'], int):
            return False
        if not (0 <= s['start'] < s['end'] <= 1):
            # allow small numerical noise but require start < end and within [0,1]
            return False
    return True


def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    segs = load_json_from_stdin_or_file(arg)
    if not validate_segments(segs):
        print("Error: JSON does not validate as an array of {start,end,box} with 0<=start<end<=1 and integer box", file=sys.stderr)
        sys.exit(4)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(segs, indent=2))
    print(f"Saved {len(segs)} segments to {OUT_PATH}")


if __name__ == '__main__':
    main()
