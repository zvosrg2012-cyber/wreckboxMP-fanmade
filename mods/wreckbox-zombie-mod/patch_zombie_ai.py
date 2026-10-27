#!/usr/bin/env python3
"""Patch WreckboxMP 1.9.2's embedded, XOR-obfuscated game core in-place.

Run from the game folder:
    python patch_zombie_ai.py index.html
This edits the core script inside index.html; it does not inject a runtime mod.
A backup named index.html.before-zombie-ai-patch is created first.
"""
from __future__ import annotations

import base64
import re
import shutil
import sys
from pathlib import Path

MARKER = b'function Gx(t,e){if(O<=0)return void px(t,t.vx,-12,B(-.4,.4));'
PATCH = MARKER + (
    b'if(t.zomb&&"idle"===t.state&&(!t.act||"zomb"!==t.act.kind)){'
    b't.act={kind:"zomb",mode:"hunt",tgt:null,t:0,re:0,x:null,run:!1,'
    b'skip:null,skipT:0,lx:null,ly:0,lostT:0};'
    b't.state="act";t.pose="";t.vx=0;}'
)

def main() -> int:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "index.html")
    if not path.is_file():
        print(f"File not found: {path}", file=sys.stderr)
        return 2

    raw = path.read_bytes()
    script_matches = list(re.finditer(rb'<script>(.*?)</script>', raw, re.S))
    if not script_matches:
        print("Could not find the embedded game script.", file=sys.stderr)
        return 2

    # The game's final inline script is XOR-obfuscated and base64-encoded.
    match = script_matches[-1]
    wrapper = match.group(1)
    key_match = re.search(rb'const k=(\[[^\]]+\])', wrapper)
    data_match = re.search(rb's=atob\("([^"]+)"\)', wrapper)
    if not key_match or not data_match:
        print("Embedded core format does not match the expected 1.9.2 build.", file=sys.stderr)
        return 2

    key = [int(v) for v in re.findall(rb'\d+', key_match.group(1))]
    encrypted = base64.b64decode(data_match.group(1))
    decoded = bytearray(
        value ^ key[i % len(key)] ^ ((i * 31 + (i >> 8)) & 255)
        for i, value in enumerate(encrypted)
    )

    if PATCH in decoded:
        print("Zombie AI patch is already present; no changes made.")
        return 0
    if MARKER not in decoded:
        print("Zombie AI update point not found; file left unchanged.", file=sys.stderr)
        return 2

    decoded = decoded.replace(MARKER, PATCH, 1)
    encrypted_new = bytes(
        value ^ key[i % len(key)] ^ ((i * 31 + (i >> 8)) & 255)
        for i, value in enumerate(decoded)
    )
    replacement = base64.b64encode(encrypted_new)
    wrapper_new = wrapper[:data_match.start(1)] + replacement + wrapper[data_match.end(1):]
    raw_new = raw[:match.start(1)] + wrapper_new + raw[match.end(1):]

    backup = path.with_name(path.name + ".before-zombie-ai-patch")
    if not backup.exists():
        shutil.copy2(path, backup)
    path.write_bytes(raw_new)
    print(f"Patched core zombie AI in {path}. Backup: {backup}")
    print("Test in-game: spawn zombies and check whether they leave idle state and pursue people.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
