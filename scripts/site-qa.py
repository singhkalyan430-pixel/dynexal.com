#!/usr/bin/env python3
"""Static QA checks for the Dynexal GitHub Pages site."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_PATHS = {
    "admin-reviews.html",
    "review-admin.html",
    "payment-success.html",
}

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []
        self.scripts = []
        self.h1_count = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        if tag == "script" and attrs.get("src"):
            self.scripts.append(attrs["src"])
        if tag == "h1":
            self.h1_count += 1

def local_target(value):
    if not value or value.startswith(("#", "mailto:", "tel:", "javascript:")):
        return None
    parsed = urlparse(value)
    if parsed.scheme or parsed.netloc:
        return None
    path = unquote(parsed.path)
    if not path:
        return None
    return path.lstrip("/")

errors = []
html_files = sorted(ROOT.rglob("*.html"))

for page in html_files:
    parser = PageParser()
    try:
        parser.feed(page.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"{page.relative_to(ROOT)}: HTML read/parse error: {exc}")
        continue

    seen = set()
    for ident in parser.ids:
        if ident in seen:
            errors.append(f"{page.relative_to(ROOT)}: duplicate id '{ident}'")
        seen.add(ident)

    for href in parser.links + parser.scripts:
        target = local_target(href)
        if not target:
            continue
        target_path = (ROOT / target).resolve() if href.startswith("/") else (page.parent / target).resolve()
        try:
            target_path.relative_to(ROOT.resolve())
        except ValueError:
            errors.append(f"{page.relative_to(ROOT)}: path escapes site root: {href}")
            continue
        if not target_path.exists():
            errors.append(f"{page.relative_to(ROOT)}: missing local target '{href}'")

# Sitemap checks.
sitemap = ROOT / "sitemap.xml"
if sitemap.exists():
    try:
        tree = ET.parse(sitemap)
        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        for loc in tree.findall(".//sm:loc", ns):
            url = (loc.text or "").strip()
            path = urlparse(url).path.lstrip("/")
            if path in PRIVATE_PATHS:
                errors.append(f"sitemap.xml: private page must not be indexed: {path}")
            if path and not (ROOT / path).exists():
                errors.append(f"sitemap.xml: target does not exist: {path}")
    except Exception as exc:
        errors.append(f"sitemap.xml: invalid XML: {exc}")
else:
    errors.append("sitemap.xml: file is missing")

if errors:
    print("Dynexal static QA: FAILED")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print(f"Dynexal static QA: PASS ({len(html_files)} HTML pages checked)")
