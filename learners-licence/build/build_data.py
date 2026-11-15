#!/usr/bin/env python3
"""Builds data/bank.js (questions + sign catalogue) and data/img.js (images as data URIs).

Inputs are the extracted sign metadata (signs_raw.json) and the WebP crops made from the
user's own manual and test papers. Paths are passed on the command line:
    python3 build_data.py <signs_raw.json> <webp_dir> <out_dir>
"""
import base64, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import signs_meta as M
import questions as QS

raw_path, webp_dir, out_dir = sys.argv[1:4]
raw = json.load(open(raw_path))

def clean(name):
    name = re.sub(r"\s+", " ", name).strip()
    name = re.sub(r"(\w)- (\w)", lambda m: m.group(1) + ("-" if m.group(0) in ("on- r", "e- a", "r- d") else "") + m.group(2), name)
    name = name.replace("“", "'").replace("”", "'").replace("‘", "'").replace("’", "'")
    return name

def cat_of(n):
    for cid, title, group, a, b in M.CATS:
        if a <= n <= b:
            return cid
    raise ValueError(n)

signs = {}
for n in range(1, 496):
    r = raw[str(n)]
    name = M.NAME.get(n) or clean(r["name"])
    name = name[0].upper() + name[1:]
    s = {"n": n, "name": name, "cat": cat_of(n), "w": r["w"], "h": r["h"]}
    if n in M.MEAN:
        s["mean"] = M.MEAN[n]
    if n in M.CORE:
        s["core"] = 1
    signs[n] = s

# sanity checks
names = {}
for s in signs.values():
    names.setdefault(s["name"].lower(), []).append(s["n"])
dups = {k: v for k, v in names.items() if len(v) > 1}
bad = [s["name"] for s in signs.values() if "- " in s["name"] or "  " in s["name"]]
used = set()
for q in QS.BANK:
    assert 0 <= q["a"] < len(q["o"]), q["id"]
    assert len(q["o"]) == 3, q["id"]
    for im in q.get("img", []):
        used.add(im)
    for o in q["o"]:
        if "img" in o:
            used.add(o["img"])
ids = [q["id"] for q in QS.BANK]
assert len(ids) == len(set(ids)), "duplicate ids"

imgs = {}
for f in sorted(os.listdir(webp_dir)):
    if not f.endswith(".webp"):
        continue
    key = f[:-5]
    imgs[key] = "data:image/webp;base64," + base64.b64encode(open(os.path.join(webp_dir, f), "rb").read()).decode()
missing = [u for u in used if u not in imgs]
assert not missing, missing

data = {
    "cats": [{"id": c, "title": t, "group": g, "from": a, "to": b} for c, t, g, a, b in M.CATS],
    "signs": [signs[n] for n in range(1, 496)],
    "confuse": M.CONFUSE,
    "q": QS.BANK,
}
os.makedirs(out_dir, exist_ok=True)
with open(os.path.join(out_dir, "bank.js"), "w") as f:
    f.write("window.LL_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
with open(os.path.join(out_dir, "img.js"), "w") as f:
    f.write("window.LL_IMG=" + json.dumps(imgs, separators=(",", ":")) + ";\n")

from collections import Counter
print("questions:", len(QS.BANK), dict(Counter(q.get("src") for q in QS.BANK)))
print("by section:", dict(Counter(q["sec"] for q in QS.BANK)))
print("pen mark differs:", [q["id"] for q in QS.BANK if q.get("pen") is not None and q["pen"] != q["a"]])
print("not high confidence:", [(q["id"], q["conf"]) for q in QS.BANK if q["conf"] != "high"])
print("signs:", len(signs), "core:", sum(1 for s in signs.values() if s.get("core")), "with meaning:", sum(1 for s in signs.values() if s.get("mean")))
print("duplicate names:", dups)
print("odd names:", bad)
print("bank.js KB", os.path.getsize(os.path.join(out_dir, "bank.js")) // 1024, "img.js KB", os.path.getsize(os.path.join(out_dir, "img.js")) // 1024)
