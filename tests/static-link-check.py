from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://dynexal.com"

class Collector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = []
        self.title = ""
        self.h1 = 0
        self.meta_description = False
        self.in_title = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"a", "link"} and attrs.get("href"):
            self.links.append((tag, attrs["href"]))
        if tag in {"script", "img", "iframe", "source"} and attrs.get("src"):
            self.links.append((tag, attrs["src"]))
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        if tag == "h1":
            self.h1 += 1
        if tag == "meta" and attrs.get("name", "").lower() == "description" and attrs.get("content", "").strip():
            self.meta_description = True
        if tag == "title":
            self.in_title = True
    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
    def handle_data(self, data):
        if self.in_title:
            self.title += data

html_files = sorted(p for p in ROOT.rglob("*.html") if ".git" not in p.parts and "node_modules" not in p.parts and p.name != "404.html")
errors = []
checked_links = 0

for page in html_files:
    parser = Collector()
    parser.feed(page.read_text(encoding="utf-8", errors="replace"))
    if not parser.title.strip():
        errors.append(f"SEO: missing <title> in {page.relative_to(ROOT)}")
    if parser.h1 != 1:
        errors.append(f"SEO: expected exactly 1 <h1> in {page.relative_to(ROOT)}, found {parser.h1}")
    if not parser.meta_description:
        errors.append(f"SEO: missing meta description in {page.relative_to(ROOT)}")
    duplicates = sorted({x for x in parser.ids if parser.ids.count(x) > 1})
    if duplicates:
        errors.append(f"HTML: duplicate id(s) in {page.relative_to(ROOT)}: {', '.join(duplicates)}")

    for _, raw in parser.links:
        raw = raw.strip()
        if not raw or raw.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
            continue
        parsed = urlparse(raw)
        if parsed.scheme or parsed.netloc:
            if parsed.netloc and parsed.netloc.lower() not in {"dynexal.com", "www.dynexal.com"}:
                continue
            target_path = unquote(parsed.path)
            target = ROOT / target_path.lstrip("/")
        else:
            target = (page.parent / unquote(parsed.path)).resolve()
        if target.is_dir():
            target = target / "index.html"
        if parsed.path and not target.exists():
            errors.append(f"BROKEN LINK: {page.relative_to(ROOT)} -> {raw}")
        checked_links += 1

sitemap = ROOT / "sitemap.xml"
if not sitemap.exists() or sitemap.stat().st_size == 0:
    errors.append("SEO: sitemap.xml is missing or empty")
else:
    sitemap_text = sitemap.read_text(encoding="utf-8", errors="replace")
    sitemap_urls = set(re.findall(r"<loc>(https://dynexal\.com/[^<]*)</loc>", sitemap_text))
    expected = set()
    for page in html_files:
        rel = page.relative_to(ROOT).as_posix()
        expected.add(BASE + "/" if rel == "index.html" else BASE + "/" + rel)
    missing = sorted(expected - sitemap_urls)
    if missing:
        errors.append("SEO: sitemap missing HTML URL(s): " + ", ".join(missing[:10]))

print(f"Static audit: {len(html_files)} HTML pages, {checked_links} local/external links inspected.")
if errors:
    print("\nFAILURES:")
    print("\n".join(f"- {e}" for e in errors))
    raise SystemExit(1)
print("Static audit PASSED: no broken local links, duplicate IDs, or basic SEO omissions detected.")
