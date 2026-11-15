#!/usr/bin/env python3
"""Makes dist/learners-licence-trainer.html: one self-contained file that works offline.

index.html is written as an artifact page body (no doctype/head). This wraps it in a
document skeleton and inlines app.js and the data files.
    python3 build/make_standalone.py
"""
import os, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
page = open(os.path.join(root, "index.html"), encoding="utf-8").read()

def inline(m):
    src = open(os.path.join(root, m.group(1)), encoding="utf-8").read()
    assert "</script" not in src.lower(), m.group(1)
    return "<script>\n" + src + "\n</script>"

page = re.sub(r'<script src="([^"]+)"></script>', inline, page)
skeleton = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}'
            'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>'
            '</head><body>')
os.makedirs(os.path.join(root, "dist"), exist_ok=True)
out = os.path.join(root, "dist", "learners-licence-trainer.html")
open(out, "w", encoding="utf-8").write(skeleton + page + "</body></html>\n")
print(out, os.path.getsize(out) // 1024, "KB")
