"""
update-site-files.py: keeps the search-engine files in sync with your data.

Run it from the site folder whenever you:
  - add, remove or rename a product or service (data/products.json), or
  - change your site address ("site" -> "url" in data/config.json)

    python tools/update-site-files.py

What it does:
  1. Writes sitemap.xml: the list of every page, for Google and Bing,
     including the Dari and Pashto versions.
  2. Writes robots.txt: tells search engines where the sitemap is.
  3. Replaces the old site address with the new one in index.html,
     product.html and 404.html (share previews need full addresses).

Needs only Python 3, no extra packages.
"""

import json
import re
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
LANGS = {"en": "en", "fa": "fa-AF", "ps": "ps-AF"}


def page_url(base, path="", lang="en"):
    """Full address of a page in one language (?lang= is added for fa / ps)."""
    url = base + path
    if lang != "en":
        url += ("&" if "?" in url else "?") + f"lang={lang}"
    return url


def sitemap_entry(base, path, today, priority):
    """One <url> block, with links to the same page in the other languages."""
    alternates = "\n".join(
        f'    <xhtml:link rel="alternate" hreflang="{code}" href="{escape(page_url(base, path, lang))}" />'
        for lang, code in LANGS.items()
    )
    return (
        "  <url>\n"
        f"    <loc>{escape(page_url(base, path))}</loc>\n"
        f"    <lastmod>{today}</lastmod>\n"
        f"    <priority>{priority}</priority>\n"
        f"{alternates}\n"
        "  </url>"
    )


def main():
    config = json.loads((ROOT / "data/config.json").read_text(encoding="utf-8"))
    products = json.loads((ROOT / "data/products.json").read_text(encoding="utf-8"))["items"]

    base = config["site"]["url"].strip()
    if not base.startswith("https://"):
        raise SystemExit('"site" -> "url" in data/config.json must start with https://')
    base = base.rstrip("/") + "/"
    today = date.today().isoformat()

    # 1. sitemap.xml
    entries = [sitemap_entry(base, "", today, "1.0")]
    entries += [
        sitemap_entry(base, f"product.html?id={item['id']}", today, "0.8")
        for item in sorted(products, key=lambda i: i.get("order", 999))
    ]
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    print(f"sitemap.xml: {len(entries)} pages, each in {len(LANGS)} languages")

    # 2. robots.txt
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {base}sitemap.xml\n", encoding="utf-8")
    print("robots.txt: written")

    # 3. Site address inside the HTML files
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    match = re.search(r'<link rel="canonical" href="([^"]+)"', index)
    old_base = match.group(1) if match else None
    for name in ("index.html", "product.html", "404.html"):
        path = ROOT / name
        text = path.read_text(encoding="utf-8")
        if old_base and old_base != base and old_base in text:
            path.write_text(text.replace(old_base, base), encoding="utf-8")
            print(f"{name}: address updated {old_base} -> {base}")
    if old_base == base:
        print(f"HTML files: address already {base}")


if __name__ == "__main__":
    main()
