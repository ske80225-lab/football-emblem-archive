"""_work/parsed.json ＋ 日本語表記 ＋ 形の目視分類 から js/data/clubs.js の末尾にクラブを追記する。

入力（tools/_work/）:
  parsed.json  … fetch_clubs.py の出力
  ja.txt       … 1行1クラブ「idx|クラブ名|都市|スタジアム|愛称」（idx は parsed.json の並び順）
  shapes.txt   … 「idx 形コード;idx 形コード;...」形コード c=円形 s=盾型 t=縦長 w=横長 a=動物・人物 l=文字 o=その他
usage: python3 append_clubs.py
"""
import json, os, re, unicodedata
HERE = os.path.dirname(os.path.abspath(__file__))
CLUBS_JS = os.path.join(HERE, "..", "js", "data", "clubs.js")
os.chdir(os.path.join(HERE, "_work"))
o = json.load(open("parsed.json"))
ja = {}
for line in open("ja.txt"):
    p = line.rstrip("\n").split("|")
    if len(p) == 5: ja[int(p[0])] = p[1:]
CODE = {"c": "circle", "s": "shield", "t": "tall", "w": "wide", "o": "other", "a": "animal", "l": "letter"}
shp = {}
for part in open("shapes.txt").read().strip().split(";"):
    i, code = part.split(); sh = [CODE[ch] for ch in code]
    if len(sh) > 1 and sh[0] == "other": sh = sh[1:]
    shp[int(i)] = sh

src = open(CLUBS_JS).read()
ids = set(re.findall(r'id: "([^"]+)"', src))

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"\(.*?\)", "", s)
    s = re.sub(r"\b(F\.?C\.?|A\.?F\.?C\.?|CF|S\.?C\.?|S\.?K\.?|F\.?K\.?|N\.?K\.?|P\.?F\.?C\.?|O\.?F\.?C\.?|CS|CSM|ACS|SCM|AFC|ASC|FCV)\b", "", s)
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

out = []
for i, x in enumerate(o):
    name, city, stad, nick = ja[i]
    cid = slug(x["enTitle"] or x["key"])
    if cid in ids: cid = f'{cid}-{x["country"]}'
    while cid in ids: cid += "-2"
    ids.add(cid)
    out.append({"id": cid, "name": name, "country": x["country"], "division": x["division"], "city": city,
                "founded": x["founded"], "nickname": nick or None, "stadium": stad or None, "capacity": x["capacity"],
                "colors": x.get("colors") or ["other"], "shapes": shp[i], "motif": None, "emblem": x["emblem"]})

master = open(os.path.join(HERE, "..", "js", "master.js")).read()
JA = dict(re.findall(r'key: "(\w+)",\s*name: "([^"]+)"', master))
js = lambda v: json.dumps(v, ensure_ascii=False)
arr = lambda a: "[" + ", ".join(js(v) for v in a) + "]"
L = []; cur = None
for c in out:
    g = (c["country"], c["division"])
    if g != cur: cur = g; L.append(f"\n  /* ---------- {JA[g[0]]} {g[1]}部 ---------- */")
    L.append(f'''  {{
    id: {js(c["id"])}, name: {js(c["name"])}, country: {js(c["country"])}, division: {c["division"]},
    city: {js(c["city"])}, founded: {js(c["founded"])}, nickname: {js(c["nickname"])},
    stadium: {js(c["stadium"])}, capacity: {js(c["capacity"])},
    colors: {arr(c["colors"])}, shapes: {arr(c["shapes"])}, motif: {js(c["motif"])},
    emblem: {js(c["emblem"])},
    titles: [],
  }},''')
assert src.rstrip().endswith("];")
for g in {(c["country"], c["division"]) for c in out}:
    assert f"{JA[g[0]]} {g[1]}部 ---" not in src, f"already exists: {g}"
src = src.rstrip()[:-2].rstrip() + "\n" + "\n".join(L) + "\n];\n"
open(CLUBS_JS, "w").write(src)
from collections import Counter
print(len(out), Counter((c["country"], c["division"]) for c in out))
print([c["id"] for c in out][:12])
