#!/usr/bin/env python3
"""Generate the crawlable (SEO / AEO / GEO) layer of the website from js/data.js.

Called automatically by update_catalog.py, so adding a book in catalog/books.csv (or in the admin page) also
refreshes everything below. It can also be run on its own:  python3 build_seo.py

It writes:
  * book/<id>/index.html        one static page per book (title, ISBN, price, schema.org Book data, social preview)
  * category/<slug>/index.html  one page per subject
  * grade/<slug>/index.html     one page per class (Nursery, LKG, UKG, Class 1 ... Class 8)
  * sitemap.xml, robots.txt, llms.txt, 404.html
  * the SEO blocks between the SEO:* markers in index.html (head tags, JSON-LD, FAQ, book directory)

Settings (public URL, addresses, verification codes) live in catalog/site.json.
"""
import datetime
import html
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
SITE_JSON = ROOT / "catalog" / "site.json"
DATA_JS = ROOT / "js" / "data.js"
GRADES = ["Nursery", "LKG", "UKG"] + [f"Grade {i}" for i in range(1, 13)]
GENERATED_DIRS = ("book", "category", "grade")
FONTS = ("https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800"
         "&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap")
AI_BOTS = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "PerplexityBot",
           "Google-Extended", "Applebot-Extended", "CCBot", "Bingbot", "DuckDuckBot"]

_dims = {}


def esc(s):
    return html.escape(str(s), quote=True)


def plain(s):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s))).strip()


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def trim(text, n):
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= n:
        return text
    return text[: n - 1].rsplit(" ", 1)[0].rstrip(",;:- ") + "\u2026"


def ld(obj):
    body = json.dumps(obj, ensure_ascii=False, indent=2).replace("</", "<\\/")
    return f'<script type="application/ld+json">\n{body}\n</script>'


def img_size(rel):
    if rel not in _dims:
        try:
            with Image.open(ROOT / rel) as im:
                _dims[rel] = im.size
        except OSError:
            _dims[rel] = (0, 0)
    return _dims[rel]


# ------------------------------------------------------------------ data helpers
def level_tokens(level):
    out = []
    for part in (p.strip() for p in level.split("/")):
        m = re.fullmatch(r"Grade\s*(\d+)\s*(?:-|\u2013|to)\s*(?:Grade\s*)?(\d+)", part, re.I)
        if m:
            out += [f"Grade {i}" for i in range(int(m[1]), int(m[2]) + 1)]
        elif part == "Pre-Primary":
            out += ["Nursery", "LKG", "UKG"]
        else:
            out.append(part)
    return out


def grade_slug(g):
    return slugify(g)


def grade_name(g):
    if g in ("Nursery", "LKG", "UKG"):
        return g
    return "Class " + g.split()[-1]


def grade_long(g):
    return {"Nursery": "Nursery", "LKG": "LKG (Lower Kindergarten)", "UKG": "UKG (Upper Kindergarten)"}.get(
        g, f"Class {g.split()[-1]} (Grade {g.split()[-1]})")


def is_hindi(b):
    return bool(re.search(r"[\u0900-\u097F]", b["title"])) or "Hindi" in b["category"]


def age_range(b):
    nums = re.findall(r"\d+", b.get("age_group", ""))
    return (int(nums[0]), int(nums[-1])) if nums else None


def price_num(b):
    return int(re.sub(r"\D", "", b["price"]) or 0)


def rupee(n):
    return "\u20B9" + f"{n:,}"


class Ctx:
    def __init__(self, data, cfg):
        self.data, self.cfg = data, cfg
        self.site = cfg["site_url"].rstrip("/")
        self.pub = data["publisher"]
        self.books = data["books"]
        self.cats = data["categories"]
        self.by_id = {b["id"]: b for b in self.books}
        self.today = datetime.date.today().isoformat()
        self.logo = "assets/img/logo.png"
        self.grades = [g for g in GRADES if any(g in level_tokens(b["level"]) for b in self.books)]
        top = self.grades[-1] if self.grades else "Grade 8"
        self.range_text = "Nursery to " + grade_name(top).replace("Class", "Grade") if top.startswith("Grade") \
            else "Nursery to " + top
        self.phone_all = [self.pub.get("phone"), self.pub.get("phone_alt")]

    def url(self, path=""):
        return f"{self.site}/{path}"

    def book_url(self, b):
        return self.url(f"book/{b['id']}/")

    def cat_url(self, c):
        return self.url(f"category/{c['id']}/")

    def grade_url(self, g):
        return self.url(f"grade/{grade_slug(g)}/")

    def books_in_grade(self, g):
        return [b for b in self.books if g in level_tokens(b["level"])]

    def address(self, key):
        a = self.cfg[key]
        return {"@type": "PostalAddress", "streetAddress": a["street"], "addressLocality": a["city"],
                "addressRegion": a["region"], "postalCode": a["postal_code"], "addressCountry": "IN"}


# ------------------------------------------------------------------ schema.org nodes
def org_node(c, full=True):
    node = {"@type": "Organization", "@id": c.url("#organization"), "name": c.pub["name"], "url": c.url(),
            "logo": {"@type": "ImageObject", "url": c.url(c.logo), "width": img_size(c.logo)[0],
                     "height": img_size(c.logo)[1]}}
    if not full:
        return node
    node.update({
        "legalName": c.cfg["legal_name"],
        "description": "Carmel Publications is a children's book publisher, established in %s, publishing illustrated "
                       "English and Hindi learning books for %s." % (c.cfg["founding_year"], c.range_text),
        "slogan": c.pub.get("tagline", ""),
        "foundingDate": c.cfg["founding_year"],
        "email": c.pub["email"],
        "telephone": c.pub["phone"],
        "address": c.address("head_office"),
        "location": [
            {"@type": "Place", "name": "Head office", "address": c.address("head_office")},
            {"@type": "Place", "name": "Branch office", "address": c.address("branch_office")},
        ],
        "contactPoint": [{"@type": "ContactPoint", "contactType": "customer service", "telephone": t,
                          "email": c.pub["email"], "areaServed": "IN", "availableLanguage": ["English", "Hindi"]}
                         for t in c.phone_all if t],
        "areaServed": {"@type": "Country", "name": "India"},
        "knowsAbout": [x["name"] for x in c.cats],
        "identifier": {"@type": "PropertyValue", "propertyID": "Udyam Registration Number",
                       "value": c.cfg["udyam"]},
    })
    if c.cfg.get("same_as"):
        node["sameAs"] = c.cfg["same_as"]
    return node


def book_node(c, b):
    node = {"@type": "Book", "@id": c.book_url(b) + "#book", "url": c.book_url(b), "name": b["title"],
            "description": b["description"] or b["subtitle"],
            "image": c.url(b["cover_front_jpg"]),
            "publisher": {"@id": c.url("#organization")},
            "inLanguage": "hi" if is_hindi(b) else "en",
            "genre": b["category"],
            "educationalLevel": b["level"],
            "isPartOf": {"@type": "BookSeries", "name": b["collection"]},
            "offers": {"@type": "Offer", "url": c.book_url(b), "priceCurrency": "INR", "price": str(price_num(b)),
                       "seller": {"@id": c.url("#organization")}}}
    if b.get("subtitle"):
        node["alternativeHeadline"] = b["subtitle"]
    if b.get("isbn"):
        node["isbn"] = b["isbn"].replace("-", "")
    if b.get("pages"):
        node["numberOfPages"] = b["pages"]
    if b.get("year"):
        node["datePublished"] = str(b["year"])
    ar = age_range(b)
    if ar:
        node["audience"] = {"@type": "PeopleAudience", "suggestedMinAge": ar[0], "suggestedMaxAge": ar[1]}
    return node


def breadcrumb(c, trail):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i, "name": name, "item": url} for i, (name, url) in enumerate(trail, 1)]}


def item_list(c, books, name):
    return {"@type": "ItemList", "name": name, "numberOfItems": len(books), "itemListElement": [
        {"@type": "ListItem", "position": i, "url": c.book_url(b), "name": b["title"]} for i, b in enumerate(books, 1)]}


# ------------------------------------------------------------------ static page shell
def head_social(c, title, desc, url, image_rel, kind="website"):
    w, h = img_size(image_rel)
    img = c.url(image_rel)
    size = f'\n  <meta property="og:image:width" content="{w}">\n  <meta property="og:image:height" content="{h}">' if w else ""
    return f"""<meta property="og:type" content="{kind}">
  <meta property="og:site_name" content="{esc(c.pub['name'])}">
  <meta property="og:locale" content="en_IN">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(desc)}">
  <meta property="og:url" content="{esc(url)}">
  <meta property="og:image" content="{esc(img)}">{size}
  <meta property="og:image:alt" content="{esc(title)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(title)}">
  <meta name="twitter:description" content="{esc(desc)}">
  <meta name="twitter:image" content="{esc(img)}">"""


def verification_tags(c):
    out = []
    if c.cfg.get("google_site_verification"):
        out.append(f'<meta name="google-site-verification" content="{esc(c.cfg["google_site_verification"])}">')
    if c.cfg.get("bing_site_verification"):
        out.append(f'<meta name="msvalidate.01" content="{esc(c.cfg["bing_site_verification"])}">')
    return "\n  ".join(out)


def contact_block(c):
    p = c.pub
    tel = lambda n: f'<a href="tel:{re.sub(r"[^0-9+]", "", n)}">{esc(n)}</a>'  # noqa: E731
    return (f'<address class="sp-address"><strong>{esc(p["name"])}</strong><br>'
            f'Head office: {esc(p["head_office"])}<br>Branch office: {esc(p["branch_office"])}<br>'
            f'Phone: {tel(p["phone"])}, {tel(p["phone_alt"])} &middot; Landline: {esc(p["landline"])}<br>'
            f'Email: <a href="mailto:{esc(p["email"])}">{esc(p["email"])}</a></address>')


def page(c, depth, *, title, desc, path, body, graph, image_rel, kind="website", robots="index, follow"):
    root = "../" * depth
    url = c.url(path)
    nav = "".join(f'<a href="{root}{h}">{t}</a>' for t, h in [
        ("Home", ""), ("Catalogue", "#catalogue"), ("Book Finder", "#finder"), ("About", "#about"), ("FAQ", "#faq")])
    logo_w, logo_h = img_size(c.logo)
    return f"""<!DOCTYPE html>
<html lang="en-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}">
  <meta name="robots" content="{robots}, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="{esc(url)}">
  <link rel="alternate" hreflang="en-IN" href="{esc(url)}">
  <link rel="alternate" hreflang="x-default" href="{esc(url)}">
  <meta name="theme-color" content="#3155E7">
  {verification_tags(c)}
  {head_social(c, title, desc, url, image_rel, kind)}
  <link rel="icon" type="image/png" href="{root}assets/img/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="{FONTS}" rel="stylesheet">
  <link rel="stylesheet" href="{root}css/style.css">
  <link rel="stylesheet" href="{root}css/pages.css">
  {ld({"@context": "https://schema.org", "@graph": graph})}
</head>
<body class="seo-page">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="sp-header">
    <div class="container sp-header-inner">
      <a href="{root}" aria-label="Carmel Publications - Home"><img src="{root}{c.logo}" alt="Carmel Publications" width="{logo_w}" height="{logo_h}" class="sp-logo"></a>
      <nav aria-label="Main" class="sp-nav">{nav}</nav>
    </div>
  </header>
  <main id="main" class="container sp-main">
{body}
  </main>
  <footer class="sp-footer">
    <div class="container">
      {contact_block(c)}
      <p class="sp-footer-links"><a href="{root}">Home</a> &middot; <a href="{root}#catalogue">Catalogue</a> &middot; <a href="{root}#directory">All books</a> &middot; <a href="{root}sitemap.xml">Sitemap</a></p>
      <p class="sp-copy">&copy; {datetime.date.today().year} Carmel Publications. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>
"""


def crumbs_html(trail, root):
    parts = []
    for i, (name, href) in enumerate(trail):
        last = i == len(trail) - 1
        parts.append(f"<span aria-current=\"page\">{esc(name)}</span>" if last else f'<a href="{href}">{esc(name)}</a>')
    return '    <nav class="sp-breadcrumb" aria-label="Breadcrumb">' + " <span aria-hidden=\"true\">/</span> ".join(parts) + "</nav>"


def card(c, b, root):
    w, h = img_size(b["cover_front_jpg"])
    dims = f' width="{w}" height="{h}"' if w else ""
    return f"""      <article class="sp-card">
        <a class="sp-card-cover" href="{root}book/{b['id']}/" tabindex="-1" aria-hidden="true"><img src="{root}{b['cover_front_webp']}" alt="Cover of {esc(b['title'])}"{dims} loading="lazy" decoding="async"></a>
        <h3><a href="{root}book/{b['id']}/">{esc(b['title'])}</a></h3>
        <p class="sp-card-sub">{esc(b['subtitle'])}</p>
        <p class="sp-card-meta"><span>{esc(b['level'])}</span><strong>{esc(b['price'])}</strong></p>
      </article>"""


def cards(c, books, root):
    return '    <div class="sp-grid">\n' + "\n".join(card(c, b, root) for b in books) + "\n    </div>"


# ------------------------------------------------------------------ page builders
def book_page(c, b):
    cat = next((x for x in c.cats if x["id"] == b["category_slug"]), None)
    ar = age_range(b)
    age_txt = f"{ar[0]}\u2013{ar[1]} years" if ar else ""
    facts = [("Publisher", c.pub["name"]), ("Subject", b["category"]), ("Series", b["collection"]),
             ("Class / grade", b["level"]), ("Age group", age_txt), ("ISBN-13", b.get("isbn", "")),
             ("Price", b["price"]), ("Language", "Hindi" if is_hindi(b) else "English"),
             ("Pages", str(b["pages"]) if b.get("pages") else ""), ("Format", b.get("format", "")),
             ("Year", str(b.get("year", "")))]
    rows = "\n".join(f"        <div><dt>{k}</dt><dd>{esc(v)}</dd></div>" for k, v in facts if v)
    sentence = (f"<strong>{esc(b['title'])}</strong> is a {esc(b['category'])} book from Carmel Publications "
                f"for {esc(b['level'])}" + (f" (ages {age_txt})" if age_txt else "") + ". ")
    if b.get("isbn"):
        sentence += f"Its ISBN-13 is {esc(b['isbn'])}. "
    sentence += f"The price is {esc(b['price'])}."
    hl = "".join(f"<li>{esc(h)}</li>" for h in b.get("highlights", []))
    related = [x for x in c.books if x["collection_slug"] == b["collection_slug"] and x["id"] != b["id"]]
    if len(related) < 3:
        related += [x for x in c.books if x["category_slug"] == b["category_slug"] and x not in related
                    and x["id"] != b["id"]]
    related = related[:6]
    w, h = img_size(b["cover_front_jpg"])
    dims = f' width="{w}" height="{h}"' if w else ""
    grade_links = " &middot; ".join(f'<a href="../../grade/{grade_slug(g)}/">{esc(grade_name(g))} books</a>'
                                    for g in level_tokens(b["level"]) if g in c.grades)
    trail_html = [("Home", "../../"), (b["category"], f"../../category/{b['category_slug']}/"), (b["title"], "")]
    body = f"""{crumbs_html(trail_html, "../../")}
    <article class="sp-book">
      <div class="sp-book-cover">
        <picture><source srcset="../../{b['cover_front_webp']}" type="image/webp"><img src="../../{b['cover_front_jpg']}" alt="Front cover of {esc(b['title'])}{' - ' + esc(b['subtitle']) if b.get('subtitle') else ''}, a book by Carmel Publications"{dims} fetchpriority="high"></picture>
      </div>
      <div class="sp-book-info">
        <p class="sp-eyebrow">{esc(b['category'])} &middot; {esc(b['level'])}</p>
        <h1>{esc(b['title'])}</h1>
        {f'<p class="sp-subtitle">{esc(b["subtitle"])}</p>' if b.get('subtitle') else ''}
        <p class="sp-answer">{sentence}</p>
        <dl class="sp-facts">
{rows}
        </dl>
        <div class="sp-actions">
          <a class="btn btn-primary" href="../../?book={b['id']}">View in catalogue &amp; request a specimen copy</a>
          <a class="btn btn-outline" href="tel:{re.sub(r'[^0-9+]', '', c.pub['phone'])}">Call {esc(c.pub['phone'])}</a>
        </div>
      </div>
    </article>
    <section class="sp-section">
      <h2>About {esc(b['title'])}</h2>
      <p>{esc(b['description'])}</p>
      {f'<h3>What children learn</h3><ul class="sp-list">{hl}</ul>' if hl else ''}
      <p class="sp-more">More from this series: <a href="../../category/{b['category_slug']}/">all {esc(b['category'])} books</a>{' &middot; ' + grade_links if grade_links else ''}.</p>
    </section>
    {'<section class="sp-section"><h2>Related books</h2>' + chr(10) + cards(c, related, "../../") + '</section>' if related else ''}"""
    title = f"{b['title']} | Carmel Publications"
    desc = trim(f"{b['title']}" + (f" \u2013 {b['subtitle']}" if b.get("subtitle") else "") +
                f". {b['category']} book for {b['level']}" + (f" (ages {age_txt})" if age_txt else "") +
                f" by Carmel Publications. " + (f"ISBN {b['isbn']}. " if b.get("isbn") else "") + f"Price {b['price']}.", 158)
    graph = [org_node(c, full=False),
             {"@type": "WebPage", "@id": c.book_url(b) + "#webpage", "url": c.book_url(b), "name": title,
              "description": desc, "inLanguage": "en-IN", "isPartOf": {"@id": c.url("#website")},
              "primaryImageOfPage": {"@type": "ImageObject", "url": c.url(b["cover_front_jpg"])},
              "breadcrumb": {"@id": c.book_url(b) + "#breadcrumb"}, "mainEntity": {"@id": c.book_url(b) + "#book"}},
             book_node(c, b),
             dict(breadcrumb(c, [("Home", c.url()), (b["category"], c.cat_url({"id": b["category_slug"]})),
                                 (b["title"], c.book_url(b))]), **{"@id": c.book_url(b) + "#breadcrumb"})]
    return page(c, 2, title=title, desc=desc, path=f"book/{b['id']}/", body=body, graph=graph,
                image_rel=b["cover_front_jpg"], kind="book")


def listing_page(c, *, kind, slug, h1, intro_html, intro_text, books, title, desc, trail_name, extra_html=""):
    path = f"{kind}/{slug}/"
    body = f"""{crumbs_html([("Home", "../../"), (trail_name, "")], "../../")}
    <header class="sp-listing-head">
      <h1>{esc(h1)}</h1>
      <p class="sp-answer">{intro_html}</p>
    </header>
{cards(c, books, "../../")}
{extra_html}"""
    graph = [org_node(c, full=False),
             {"@type": "CollectionPage", "@id": c.url(path) + "#webpage", "url": c.url(path), "name": title,
              "description": desc, "inLanguage": "en-IN", "isPartOf": {"@id": c.url("#website")},
              "about": intro_text, "mainEntity": {"@id": c.url(path) + "#list"}},
             dict(item_list(c, books, h1), **{"@id": c.url(path) + "#list"}),
             breadcrumb(c, [("Home", c.url()), (trail_name, c.url(path))])]
    return path, page(c, 2, title=title, desc=desc, path=path, body=body, graph=graph,
                      image_rel=books[0]["cover_front_jpg"] if books else c.logo)


def price_span(books):
    prices = [price_num(b) for b in books]
    return (min(prices), max(prices)) if prices else (0, 0)


def category_pages(c):
    out = {}
    for cat in c.cats:
        books = [b for b in c.books if b["category_slug"] == cat["id"]]
        if not books:
            continue
        lo, hi = price_span(books)
        grades = [g for g in c.grades if any(g in level_tokens(b["level"]) for b in books)]
        gtxt = grade_name(grades[0]) if len(grades) == 1 else f"{grade_name(grades[0])} to {grade_name(grades[-1])}"
        series = sorted({b["collection"] for b in books})
        intro = (f"{esc(cat['description'])} Carmel Publications has {len(books)} {esc(cat['name'])} "
                 f"book{'s' if len(books) != 1 else ''} for {esc(gtxt)}, priced from {rupee(lo)}"
                 + (f" to {rupee(hi)}" if hi != lo else "") + ".")
        gl = " &middot; ".join(f'<a href="../../grade/{grade_slug(g)}/">{esc(grade_name(g))}</a>' for g in grades)
        extra = (f'    <section class="sp-section"><h2>Series in this subject</h2><p>{esc(", ".join(series))}.</p>'
                 f'<p class="sp-more">Browse by class: {gl}.</p></section>')
        title = f"{cat['name']} Books for {gtxt} | Carmel Publications"
        desc = trim(f"{len(books)} {cat['name']} books for {gtxt} from Carmel Publications: "
                    + ", ".join(b["title"] for b in books[:4]) + (" and more." if len(books) > 4 else ".") +
                    f" Prices from {rupee(lo)}.", 158)
        p, h = listing_page(c, kind="category", slug=cat["id"], h1=f"{cat['name']} Books", intro_html=intro,
                            intro_text=plain(intro), books=books, title=title, desc=desc, trail_name=cat["name"],
                            extra_html=extra)
        out[p] = h
    return out


def grade_pages(c):
    out = {}
    for g in c.grades:
        books = c.books_in_grade(g)
        lo, hi = price_span(books)
        cats = [x["name"] for x in c.cats if any(b["category_slug"] == x["id"] for b in books)]
        intro = (f"Carmel Publications has {len(books)} book{'s' if len(books) != 1 else ''} for "
                 f"{esc(grade_long(g))}, covering {esc(', '.join(cats))}. Prices range from {rupee(lo)}"
                 + (f" to {rupee(hi)}" if hi != lo else "") + ".")
        title = f"{grade_name(g)} Books ({grade_long(g)}) | Carmel Publications"
        desc = trim(f"{len(books)} books for {grade_long(g)} from Carmel Publications \u2013 " + ", ".join(cats)
                    + f". Prices from {rupee(lo)}. Full details, ISBNs and prices.", 158)
        others = " &middot; ".join(f'<a href="../{grade_slug(x)}/">{esc(grade_name(x))}</a>' for x in c.grades if x != g)
        extra = f'    <section class="sp-section"><p class="sp-more">Other classes: {others}.</p></section>'
        p, h = listing_page(c, kind="grade", slug=grade_slug(g), h1=f"{grade_name(g)} Books", intro_html=intro,
                            intro_text=plain(intro), books=books, title=title, desc=desc,
                            trail_name=f"{grade_name(g)} books", extra_html=extra)
        out[p] = h
    return out


# ------------------------------------------------------------------ FAQ (answer-engine content) and directory
def faq_items(c):
    p, books = c.pub, c.books
    g = lambda name: c.books_in_grade(name)  # noqa: E731

    def list_titles(bs, n=4):
        names = [b["title"] for b in bs[:n]]
        return ", ".join(names) + (" and more" if len(bs) > n else "")

    def grade_line(gr):
        bs = g(gr)
        return f'{grade_name(gr)} ({len(bs)}): <a href="grade/{grade_slug(gr)}/">{esc(list_titles(bs, 3))}</a>.'

    pre = [x for x in ("Nursery", "LKG", "UKG") if x in c.grades]
    primary = [x for x in c.grades if x.startswith("Grade")]
    hindi = [b for b in books if is_hindi(b)]
    lo_b, hi_b = min(books, key=price_num), max(books, key=price_num)
    nep = [b for b in books if "NEP" in b["description"] or any("NEP" in h for h in b.get("highlights", []))]
    nep_series = list(dict.fromkeys(b["collection"] for b in nep))[:6]
    tel = f'{esc(p["phone"])} or {esc(p["phone_alt"])}'
    cats = ", ".join(x["name"] for x in c.cats)

    return [
        ("What is Carmel Publications?",
         f"Carmel Publications is a children's book publisher established in {c.cfg['founding_year']}. Its head office "
         f"is in Jalandhar, Punjab and its branch office is in Mulanthuruthy, Ernakulam, Kerala. It publishes "
         f"{len(books)} illustrated English and Hindi learning books for {esc(c.range_text)}, covering {esc(cats)}."),
        ("Which Carmel Publications books are there for Nursery, LKG and UKG?",
         "Carmel's pre-primary range includes " + " ".join(grade_line(x) for x in pre)),
        ("Which Carmel Publications books are there for Class 1 to Class 8?",
         "The primary and middle range includes " + " ".join(grade_line(x) for x in primary)),
        ("Does Carmel Publications publish Hindi books?",
         f"Yes. Carmel's Hindi titles include {esc(list_titles(hindi, 8))}. See the "
         f'<a href="category/{next((x["id"] for x in c.cats if "Hindi" in x["name"]), "")}/">Hindi Language &amp; Literature</a> '
         "page for the full list."),
        ("How much do Carmel Publications books cost?",
         f"The prices shown for Carmel books range from {rupee(price_num(lo_b))} ({esc(lo_b['title'])}) to "
         f"{rupee(price_num(hi_b))} ({esc(hi_b['title'])}). Each book page lists its price and ISBN."),
        ("Are Carmel Publications books based on NEP and NCF?",
         f"{len(nep)} Carmel titles carry a \u201cBased on NEP and NCF\u201d (NEP 2020 / NCF 2023) mark on the cover, "
         f"including the series {esc(', '.join(nep_series))}."),
        ("How can schools, preschools and bookshops request specimen copies?",
         f"Use the \u201cRequest specimen copies\u201d form on this website, which prepares an email to {esc(p['email'])}, "
         f"or call {tel}."),
        ("Where can I buy Carmel Publications books?",
         f"This website is a catalogue and does not take online payments. For availability and orders, call {tel} "
         f"or email {esc(p['email'])}."),
        ("Where is Carmel Publications located and how can I contact it?",
         f"Head office: {esc(p['head_office'])}. Branch office: {esc(p['branch_office'])}. Phone: {tel}. "
         f"Landline: {esc(p['landline'])}. Email: {esc(p['email'])}."),
    ]


def faq_block(c):
    items = faq_items(c)
    html_items = "\n".join(
        f'          <details class="faq-item"><summary>{esc(q)}</summary><div class="faq-answer"><p>{a}</p></div></details>'
        for q, a in items)
    return f"""<!-- SEO:FAQ:BEGIN (generated by build_seo.py) -->
    <section class="faq-section" id="faq" aria-labelledby="faqTitle">
      <div class="container">
        <div class="section-header text-center">
          <span class="badge badge-primary section-badge">FAQ</span>
          <h2 class="section-title" id="faqTitle">Questions about Carmel Publications</h2>
          <p class="section-subtitle">Quick answers about our books, prices, classes and how to order.</p>
        </div>
        <div class="faq-list">
{html_items}
        </div>
      </div>
    </section>

    <section class="directory-section" id="directory" aria-labelledby="directoryTitle">
      <div class="container">
        <h2 class="directory-title" id="directoryTitle">All Carmel Publications books</h2>
        <p class="directory-lead">Every title by subject, with class and price. Or browse by class:
          {" &middot; ".join(f'<a href="grade/{grade_slug(g)}/">{esc(grade_name(g))}</a>' for g in c.grades)}.</p>
        <div class="directory-grid">
{chr(10).join(_dir_col(c, cat) for cat in c.cats)}
        </div>
      </div>
    </section>
    <!-- SEO:FAQ:END -->"""


def _dir_col(c, cat):
    books = [b for b in c.books if b["category_slug"] == cat["id"]]
    lis = "".join(f'<li><a href="book/{b["id"]}/">{esc(b["title"])}</a> <span>{esc(b["level"])} &middot; {esc(b["price"])}</span></li>'
                  for b in books)
    return (f'          <div class="directory-col"><h3><a href="category/{cat["id"]}/">{esc(cat["name"])}</a></h3>'
            f'<ul>{lis}</ul></div>')


# ------------------------------------------------------------------ index.html head block
def index_head(c):
    n = len(c.books)
    title = "Carmel Publications | Children's Books, Nursery to Grade 8"
    desc = trim(f"{n} illustrated English & Hindi learning books for {c.range_text} \u2013 alphabet, maths, handwriting, "
                f"rhymes, GK & moral values \u2013 from Carmel Publications, Jalandhar.", 160)
    faqs = [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": plain(a)}}
            for q, a in faq_items(c)]
    graph = [
        org_node(c),
        {"@type": "WebSite", "@id": c.url("#website"), "url": c.url(), "name": c.pub["name"], "inLanguage": "en-IN",
         "description": desc, "publisher": {"@id": c.url("#organization")},
         "potentialAction": {"@type": "SearchAction", "target": {"@type": "EntryPoint",
                             "urlTemplate": c.url("?q={search_term_string}")}, "query-input": "required name=search_term_string"}},
        {"@type": "WebPage", "@id": c.url("#webpage"), "url": c.url(), "name": title, "description": desc,
         "inLanguage": "en-IN", "isPartOf": {"@id": c.url("#website")}, "about": {"@id": c.url("#organization")},
         "primaryImageOfPage": {"@type": "ImageObject", "url": c.url(c.logo)}},
        {"@type": "FAQPage", "@id": c.url("#faq"), "mainEntity": faqs},
        dict(item_list(c, c.books, "Carmel Publications books"), **{"@id": c.url("#books")}),
    ]
    return f"""<!-- SEO:BEGIN (generated by build_seo.py - edit catalog/site.json, not this block) -->
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta name="author" content="Carmel Publications">
  <link rel="canonical" href="{esc(c.url())}">
  <link rel="alternate" hreflang="en-IN" href="{esc(c.url())}">
  <link rel="alternate" hreflang="x-default" href="{esc(c.url())}">
  <meta name="geo.region" content="IN-PB">
  <meta name="geo.placename" content="Jalandhar, Punjab, India">
  <meta name="theme-color" content="#3155E7">
  {verification_tags(c)}
  {head_social(c, title, desc, c.url(), c.logo)}
  {ld({"@context": "https://schema.org", "@graph": graph})}
  <!-- SEO:END -->"""


# ------------------------------------------------------------------ sitemap, robots, llms.txt, 404
def sitemap(c, pages):
    def entry(loc, images=()):
        imgs = "".join(f"<image:image><image:loc>{esc(i[0])}</image:loc><image:title>{esc(i[1])}</image:title></image:image>"
                       for i in images)
        return f"  <url><loc>{esc(loc)}</loc><lastmod>{c.today}</lastmod>{imgs}</url>"
    rows = [entry(c.url(), [(c.url(c.logo), "Carmel Publications logo")])]
    rows += [entry(c.url(p)) for p in pages if p.startswith(("category/", "grade/"))]
    rows += [entry(c.book_url(b), [(c.url(b["cover_front_jpg"]), f"Cover of {b['title']}")]) for b in c.books]
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' + "\n".join(rows) + "\n</urlset>\n")


def robots(c):
    allow = "\n\n".join(f"User-agent: {b}\nAllow: /" for b in AI_BOTS)
    return (f"# Carmel Publications - everything public may be crawled, including by search and AI assistants.\n"
            f"User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /catalog/\nDisallow: /books_image/\n\n{allow}\n\n"
            f"Sitemap: {c.url('sitemap.xml')}\n")


def llms_txt(c):
    p = c.pub
    lines = [f"# {p['name']}", "",
             f"> {p['name']} is a children's book publisher established in {c.cfg['founding_year']}, with its head "
             f"office in Jalandhar, Punjab and a branch office in Mulanthuruthy, Ernakulam, Kerala (India). It "
             f"publishes {len(c.books)} illustrated English and Hindi learning books for {c.range_text}.", "",
             "## Contact", f"- Email: {p['email']}", f"- Phone: {p['phone']}, {p['phone_alt']}",
             f"- Landline: {p['landline']}", f"- Head office: {p['head_office']}",
             f"- Branch office: {p['branch_office']}", "",
             "## How to order",
             "The website is a catalogue and does not take online payments. Schools, preschools, bookshops and parents "
             "can request specimen copies or ask about availability by phone or email.", "",
             "## Subjects"]
    lines += [f"- [{x['name']}]({c.cat_url(x)}): {x['description']}" for x in c.cats]
    lines += ["", "## Classes"] + [f"- [{grade_name(g)}]({c.grade_url(g)})" for g in c.grades]
    lines += ["", "## All books (title, class, ISBN-13, price)"]
    for b in c.books:
        lines.append(f"- [{b['title']}]({c.book_url(b)}): {b['level']}" + (f", ISBN {b['isbn']}" if b.get("isbn") else "")
                     + f", {b['price']}")
    return "\n".join(lines) + "\n"


def not_found(c):
    body = """    <h1>Page not found</h1>
    <p class="sp-answer">Sorry, we could not find that page. Try the <a href="./">home page</a>, the
      <a href="./#catalogue">catalogue</a> or the <a href="./#directory">list of all books</a>.</p>"""
    return page(c, 0, title="Page not found | Carmel Publications", desc="Page not found.", path="404.html",
                body=body, graph=[org_node(c, full=False)], image_rel=c.logo, robots="noindex, follow")


# ------------------------------------------------------------------ driver
def replace_block(text, begin, end, new):
    pat = re.compile(re.escape(begin) + r".*?" + re.escape(end), re.S)
    if not pat.search(text):
        raise ValueError(f"marker {begin!r} not found in index.html")
    return pat.sub(lambda _: new, text, count=1)


def build(data):
    cfg = json.loads(SITE_JSON.read_text(encoding="utf-8"))
    c = Ctx(data, cfg)

    pages = {}
    for b in c.books:
        pages[f"book/{b['id']}/index.html"] = book_page(c, b)
    for path, h in {**category_pages(c), **grade_pages(c)}.items():
        pages[path + "index.html"] = h

    for d in GENERATED_DIRS:
        shutil.rmtree(ROOT / d, ignore_errors=True)
    for rel, h in pages.items():
        out = ROOT / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(h, encoding="utf-8")

    (ROOT / "sitemap.xml").write_text(sitemap(c, [p[: -len("index.html")] for p in pages]), encoding="utf-8")
    (ROOT / "robots.txt").write_text(robots(c), encoding="utf-8")
    (ROOT / "llms.txt").write_text(llms_txt(c), encoding="utf-8")
    (ROOT / "404.html").write_text(not_found(c), encoding="utf-8")

    index = ROOT / "index.html"
    text = index.read_text(encoding="utf-8")
    text = replace_block(text, "<!-- SEO:BEGIN", "<!-- SEO:END -->", index_head(c))
    text = replace_block(text, "<!-- SEO:FAQ:BEGIN", "<!-- SEO:FAQ:END -->", faq_block(c))
    index.write_text(text, encoding="utf-8")
    print(f"SEO - {len(pages)} static pages, sitemap.xml, robots.txt, llms.txt and index.html updated "
          f"for {c.site}/")


if __name__ == "__main__":
    raw = DATA_JS.read_text(encoding="utf-8")
    build(json.loads(raw[raw.index("{"): raw.rindex("}") + 1]))
    sys.exit(0)
