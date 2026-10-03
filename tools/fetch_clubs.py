"""Wikipedia からリーグ所属クラブ → 詳細 → エンブレム → 色解析 までを段階実行する。

usage（tools/ で実行。中間ファイルは tools/_work/ に出る）:
  python3 fetch_clubs.py teams    # LEAGUES の各シーズン記事から候補クラブを抽出 → _work/teams_raw.json
  （_work/teams.json を手で作る：{"<country>-<div>": {"teams": [英語版記事名, ...]}}）
  python3 fetch_clubs.py fetch    # 英語版・日本語版の情報とエンブレムURLを取得 → _work/parsed.json
  python3 fetch_clubs.py analyze  # エンブレム画像から色を推定（要 Pillow）→ _work/parsed.json に追記
詳しい手順は ../CLAUDE.md を参照。
"""
import json, os, re, sys, time, io, colorsys, urllib.request, urllib.parse
os.makedirs(os.path.join(os.path.dirname(__file__), "_work"), exist_ok=True)
os.chdir(os.path.join(os.path.dirname(__file__), "_work"))
from html.parser import HTMLParser

UA = {"User-Agent": "EmblemZukanPersonal/0.1 (personal hobby project; python-urllib)"}
# 追加したいリーグをここに書く（country キーは js/master.js の COUNTRIES と一致させる）
LEAGUES = [
    ("england", 3, "2026–27 EFL League One"),
]

def api(params, host="en"):
    u = f"https://{host}.wikipedia.org/w/api.php?" + urllib.parse.urlencode({**params, "format": "json", "formatversion": 2})
    for i in range(6):
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30))
            time.sleep(1.0); return r
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(10 * (i + 1)); continue
            raise
    raise RuntimeError("rate limited")

class Rows(HTMLParser):
    def __init__(s): super().__init__(); s.rows = []; s.cur = None; s.intable = 0
    def handle_starttag(s, t, a):
        a = dict(a)
        if t == "table" and ("wikitable" in (a.get("class") or "") or s.intable): s.intable += 1
        if not s.intable: return
        if t == "tr": s.cur = []
        if t == "a" and s.cur is not None and a.get("href", "").startswith("/wiki/") and ":" not in a["href"][6:]:
            s.cur.append(urllib.parse.unquote(a["href"][6:]).replace("_", " "))
    def handle_endtag(s, t):
        if t == "table" and s.intable: s.intable -= 1
        if t == "tr" and s.cur is not None:
            if s.cur: s.rows.append(s.cur)
            s.cur = None

def teams():
    out = {}
    for c, d, page in LEAGUES:
        r = api({"action": "parse", "page": page, "prop": "sections", "redirects": 1})
        if "error" in r: print("MISSING", page); out[f"{c}-{d}"] = {"page": page, "teams": []}; continue
        secs = r["parse"]["sections"]; found = {}
        for key in ("Stadiums and locations", "Teams", "Clubs", "League table", "Regular season", "Standings"):
            for s in secs:
                if s["line"].strip().lower().startswith(key.lower()) and s["index"] and key not in found:
                    html = api({"action": "parse", "page": page, "prop": "text", "section": s["index"], "redirects": 1})["parse"]["text"]
                    p = Rows(); p.feed(html)
                    seen = []
                    for row in p.rows:
                        x = row[0]
                        if x not in seen and not re.search(r"^\d{4}|List of|league|Liga|Division|cup$", x, re.I): seen.append(x)
                    found[key] = seen
        out[f"{c}-{d}"] = {"page": page, "candidates": found}
        print(c, d, {k: len(v) for k, v in found.items()}, flush=True)
    json.dump(out, open("teams_raw.json", "w"), ensure_ascii=False, indent=1)

def batch_query(ts, host, extra):
    res = {}
    for i in range(0, len(ts), 20):
        ch = ts[i:i + 20]; cont = {}; pages = {}
        while True:
            r = api({"action": "query", "titles": "|".join(ch), "redirects": 1, **extra, **cont}, host)
            q = r.get("query", {}); m = {}
            for x in q.get("normalized", []): m[x["to"]] = x["from"]
            for x in q.get("redirects", []): m[x["to"]] = m.get(x["from"], x["from"])
            for p in q.get("pages", []):
                cur = pages.setdefault(m.get(p["title"], p["title"]), {"title": p["title"]})
                for k, v in p.items():
                    if isinstance(v, list): cur.setdefault(k, []).extend(v)
                    else: cur.setdefault(k, v)
            if "continue" in r: cont = r["continue"]
            else: break
        res.update(pages); print(host, len(res), flush=True)
    return res

def field(box, names):
    box = box.replace("\r", "")
    for n in names:
        m = re.search(r"(?:^|\n)[ \t]*\|?[ \t]*" + re.escape(n) + r"[ \t]*=[ \t]*(.*?)(?=\n[ \t]*\||\|[ \t]*\n|\n[ \t]*\}\}|\Z)", box, re.S)
        if m and m.group(1).strip(" |\n"): return m.group(1).strip(" |\n")
    return ""

def clean(s):
    s = re.sub(r"<ref[^>]*/>|<ref[^>]*>.*?</ref>", "", s, flags=re.S)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"\[\[(?:File|Image|ファイル|画像):[^\]]*\]\]", "", s)
    s = re.sub(r"\{\{(?:flagicon|flag|colorbox)[^}]*\}\}", "", s, flags=re.I)
    for _ in range(3): s = re.sub(r"\{\{(?:nowrap|lang|small|nobr)\|(?:[a-z-]+\|)?([^{}]*)\}\}", r"\1", s, flags=re.I)
    s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"'{2,}", "", s); s = re.sub(r"<br\s*/?>|\n", " / ", s); s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", " ", s).strip(" /,;")

def year(s):
    m = re.search(r"\b(18\d\d|19\d\d|20[0-2]\d)\b", s); return int(m.group(1)) if m else None

def cap(s):
    s = re.sub(r"<ref.*?(</ref>|/>)", "", s, flags=re.S)
    m = re.search(r"\d{1,3}(?:[,.\s]\d{3})+|\d{3,6}", s); return int(re.sub(r"\D", "", m.group(0))) if m else None

def fetch():
    d = json.load(open("teams.json"))
    rows = [(k.split("-")[0], int(k.split("-")[1]), t) for k, v in d.items() for t in v["teams"]]
    titles = [t for _, _, t in rows]
    en = batch_query(titles, "en", {"prop": "revisions|langlinks", "rvprop": "content", "rvslots": "main", "lllang": "ja"})
    out = []
    for c, dv, t in rows:
        p = en.get(t, {})
        txt = p.get("revisions", [{}])[0].get("slots", {}).get("main", {}).get("content", "")
        m = re.search(r"\{\{\s*(Infobox[ _]football[ _]club|Football club infobox)", txt, re.I)
        box = txt[m.start():m.start() + 6000] if m else txt[:6000]
        out.append({"key": t, "country": c, "division": dv, "enTitle": p.get("title"), "box": box,
                    "ja": (p.get("langlinks") or [{}])[0].get("title")})
    ja = batch_query([x["ja"] for x in out if x["ja"]], "ja", {"prop": "revisions", "rvprop": "content", "rvslots": "main"})
    for x in out:
        j = ""
        if x["ja"]:
            txt = ja.get(x["ja"], {}).get("revisions", [{}])[0].get("slots", {}).get("main", {}).get("content", "")
            i = txt.find("{{サッカークラブ"); j = txt[i:i + 6000] if i >= 0 else ""
        b = x["box"]
        img = field(b, ["image", "logo", "crest", "current_crest"])
        img = re.sub(r"\{\{!\}\}.*$", "", img)
        img = re.sub(r"^\[\[|\]\]$", "", img); img = re.sub(r"^(File|Image):", "", img).split("|")[0].strip()
        if "<!--" in img or not re.search(r"\.(svg|png|jpe?g|gif)$", img, re.I): img = ""
        jst = field(j, ["スタジアム", "ホームスタジアム"])
        links = re.findall(r"\[\[(?!File:|ファイル:|画像:)(?:[^|\]]*\|)?([^\]]*)\]\]", jst)
        x.update(name=re.sub(r"\s*\(.*?\)$", "", x["ja"]) if x["ja"] else "",
                 nickJa=clean(field(j, ["愛称"])), nickEn=clean(field(b, ["nickname", "nicknames"])),
                 founded=year(clean(field(j, ["創設", "設立", "創立"]))) or year(field(b, ["founded", "founded_date"])),
                 cityJa=clean(field(j, ["ホームタウン", "本拠地"])),
                 stadiumJa=(links[-1] if links else clean(jst)), stadiumEn=clean(field(b, ["ground", "stadium"])),
                 capacity=cap(field(b, ["capacity"])) or cap(field(j, ["キャパ", "収容人数"])), image=img)
        del x["box"]
    files = sorted({"File:" + x["image"].replace("_", " ") for x in out if x["image"]})
    url = {}
    for i in range(0, len(files), 50):
        r = api({"action": "query", "titles": "|".join(files[i:i + 50]), "prop": "imageinfo", "iiprop": "url", "iiurlwidth": 400})
        norm = {n["to"]: n["from"] for n in r["query"].get("normalized", [])}
        for p in r["query"]["pages"]:
            ii = p.get("imageinfo")
            if ii: url[norm.get(p["title"], p["title"])] = (ii[0].get("thumburl") or ii[0]["url"]).split("?")[0]
    for x in out:
        x["emblem"] = url.get("File:" + x["image"].replace("_", " ")) if x["image"] else None
    json.dump(out, open("parsed.json", "w"), ensure_ascii=False, indent=0)
    print("done", len(out), "no emblem:", [x["key"] for x in out if not x["emblem"]])

def cls(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255); h *= 360
    if v < 0.22 or (s < 0.25 and v < 0.4): return "black"
    if s < 0.16: return "white" if v > 0.8 else "other"
    if s < 0.3 and v > 0.85: return "white"
    if h < 14 or h >= 335: return "red"
    if h < 42: return "orange" if v > 0.65 and s > 0.5 else ("red" if h < 22 else "other")
    if h < 70: return "yellow"
    if h < 170: return "green"
    if h < 258: return "blue"
    if h < 300: return "purple"
    return "red" if v < 0.6 else "purple"

def colors_of(data):
    from PIL import Image
    im = Image.open(io.BytesIO(data)).convert("RGBA"); im.thumbnail((120, 120))
    W, H = im.size; px = im.load()
    trans = sum(1 for x in range(W) for y in range(H) if px[x, y][3] < 100) > W * H * 0.03
    cnt = {}
    for x in range(W):
        for y in range(H):
            r, g, b, a = px[x, y]
            if (trans and a < 128) or (not trans and r > 235 and g > 235 and b > 235): continue
            c = cls(r, g, b); cnt[c] = cnt.get(c, 0) + 1
    tot = sum(cnt.values()) or 1
    return [c for c, n in sorted(cnt.items(), key=lambda t: -t[1]) if n / tot >= 0.06][:4] or ["other"]

def analyze():
    o = json.load(open("parsed.json"))
    for x in o:
        if not x["emblem"] or x.get("colors"): continue
        u = x["emblem"].replace("/500px-", "/120px-")
        for i in range(5):
            try:
                x["colors"] = colors_of(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read()); break
            except urllib.error.HTTPError as e:
                if e.code == 429: time.sleep(5 * (i + 1)); continue
                if "/120px-" in u: u = x["emblem"]; continue
                print("ERR", x["key"], e); break
            except Exception as e: print("ERR", x["key"], e); break
        time.sleep(0.25)
    json.dump(o, open("parsed.json", "w"), ensure_ascii=False, indent=0)
    print("analyzed", sum(1 for x in o if x.get("colors")), "/", len(o))

{"teams": teams, "fetch": fetch, "analyze": analyze}[sys.argv[1]]()
