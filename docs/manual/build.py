"""User manual build: python docs/manual/build.py  (needs Google Chrome and pypdf).
Edit manual.html, then rebuild; writes GPCL_Finance_User_Manual.pdf at the repo root.
Builds the TOC from headings, renders with headless Chrome, reads back heading
page numbers, re-renders with the numbers filled in.
"""
import html, re, subprocess, sys
from pathlib import Path
from pypdf import PdfReader

HERE = Path(__file__).parent
SRC = HERE / "manual.html"
REPO = HERE.parents[1]
LOGO = (REPO / "public" / "logo.jpg").as_uri()
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "GPCL_Finance_User_Manual.pdf"

src = SRC.read_text(encoding="utf-8").replace("LOGO_PATH", LOGO)
items = []
for m in re.finditer(r'<(h1) class="chapter" id="([^"]+)"><span class="num">([^<]+)</span>(.*?)</h1>|<h2 id="([^"]+)">(.*?)</h2>', src):
    if m.group(1):
        items.append(("ch", m.group(2), f"{m.group(3)}&nbsp;&nbsp;{m.group(4)}", m.group(3) + re.sub("<[^>]+>", "", m.group(4))))
    else:
        items.append(("sec", m.group(5), m.group(6), re.sub("<[^>]+>", "", m.group(6))))

def toc(pages):
    rows = []
    for kind, hid, label, _ in items:
        pg = pages.get(hid, "00")
        rows.append(f'<a href="#{hid}" class="row {kind}"><span>{label}</span><span class="dots"></span><span class="pg">{pg}</span></a>')
    return "\n".join(rows)

def render(pages, out):
    doc = src.replace('<div id="toc-body"></div>', f'<div id="toc-body">{toc(pages)}</div>')
    tmp = HERE / "_render.html"
    tmp.write_text(doc, encoding="utf-8")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    "--allow-file-access-from-files", f"--print-to-pdf={out}", tmp.as_uri()],
                   check=True, capture_output=True)

def norm(s):
    s = html.unescape(s)
    return re.sub(r"[^a-z0-9]+", "", s.lower())

def locate(pdf):
    texts = [norm(p.extract_text() or "") for p in PdfReader(str(pdf)).pages]
    pages = {}
    start = next(i for i, t in enumerate(texts) if "thismanualexplainseveryscreen" in t)
    cur = start
    for kind, hid, _, plain in items:
        key = norm(plain)[:40]
        for i in range(cur, len(texts)):
            if key and key in texts[i]:
                pages[hid] = i + 1
                cur = i
                break
        else:
            print("NOT FOUND:", plain)
    return pages, len(texts)

first = HERE / "_pass1.pdf"  # scratch file, removed below
render({}, first)
pages, n = locate(first)
render(pages, OUT)
pages2, n2 = locate(OUT)
first.unlink(missing_ok=True)
(HERE / "_render.html").unlink(missing_ok=True)
print(f"pages: {n2}; toc entries: {len(items)}; stable: {pages == pages2}")
