#!/usr/bin/env python3
# =============================================================================
# CEx — build the temporary cex.koeln homepage from the live CEx homepage
# -----------------------------------------------------------------------------
# The placeholder is not a redesign. It is the real homepage with the section
# that depends on unpublished subpages taken out and the six services relaid as
# a vertical list that keeps their original films.
#
# WHERE THE WORDS COME FROM. WordPress has been the single source of truth for
# CEx since 2026-08-05, so the copy is lifted from a snapshot of the live
# homepage's post_content, not from ../github-cx/index.html. The static repo is
# a historical record: on 2026-08-04 it still carried the pre-remediation text
# ("Governance", "Sprints", "Change", headings without the brand name in them),
# and a page built from it would have quietly shipped copy the client had
# already had rewritten and signed off.
#
# WHERE EVERYTHING ELSE COMES FROM. Stylesheets, script.js, the fonts, the two
# legal pages and the media files still come from ../github-cx — the WordPress
# theme ships the identical files, and these are the ones on disk here.
#
#   python3 build.py
# =============================================================================
import html
import json
import re
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "github-cx"                      # theme assets
SNAPS = HERE.parent / "wordpress-cex" / "_homepage-snapshots"

src_lines = (SRC / "index.html").read_text(encoding="utf-8").splitlines(keepends=True)

snapshots = sorted(SNAPS.glob("homepage-*.json"))
assert snapshots, f"no homepage snapshot in {SNAPS}"
SNAPSHOT = snapshots[-1]                             # newest by filename date
wp = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
content = wp["content"]

# The snapshot writes the theme folder as a placeholder; here it is just media/.
content = content.replace("{{THEME_URI}}/media/", "media/")


def sections(markup):
    """Split post_content into its top-level <section> blocks, keyed by id.

    The homepage has no nested sections, so every '<section' in the string opens
    a new top-level one and the previous block ends where the next begins. The
    last one ends at </main>.
    """
    starts = [m.start() for m in re.finditer(r"<section\b", markup)]
    assert starts, "no sections in the snapshot"
    ends = starts[1:] + [markup.index("</main>")]
    out = {}
    for start, end in zip(starts, ends):
        chunk = markup[start:end].rstrip() + "\n"
        key = re.search(r'<section\b[^>]*\bid="([^"]+)"', chunk)
        if not key:                                  # the hero carries no id
            key = re.search(r'<section\b[^>]*\bclass="([^" ]+)', chunk)
        out[key.group(1)] = chunk
    return out


SEC = sections(content)

HERO = SEC["top"]
TRUSTBAND = SEC["trustband"]
CAPS = SEC["capabilities"]        # parsed apart below, not emitted as-is
JOURNEY = SEC["journey"]
BENEFITS = SEC["benefits"]
OUTCOMES = SEC["outcomes"]
FAQ = SEC["faq"]
TEAM = SEC["team"]
FINAL_CTA = SEC["kontakt"]
FOOTER = content[content.index("<footer"):].rstrip() + "\n"

# One page has no sitemap to link to, and rewriting the link to #leistungen would
# put a label on it that lies about where it goes.
FOOTER = re.sub(r'<a href="/sitemap/"[^>]*>Sitemap</a>', "", FOOTER)
assert "Sitemap</a>" not in FOOTER, "the footer Sitemap link changed shape"

# "themen" is deliberately dropped: it is a list of links to roughly 28 subpages
# that this one-page site does not carry.

# --- sanity: each block must still be the section it is named after ----------
for name, chunk, marker in [
    ("HERO", HERO, 'class="hero"'),
    ("TRUSTBAND", TRUSTBAND, 'class="trustband"'),
    ("CAPS", CAPS, 'id="capabilities"'),
    ("JOURNEY", JOURNEY, 'id="journey"'),
    ("BENEFITS", BENEFITS, 'id="benefits"'),
    ("OUTCOMES", OUTCOMES, 'id="outcomes"'),
    ("FAQ", FAQ, 'id="faq"'),
    ("TEAM", TEAM, 'class="cx-trust"'),
    ("FINAL_CTA", FINAL_CTA, "final-cta"),
    ("FOOTER", FOOTER, "<footer"),
]:
    assert marker in chunk, f"{name}: snapshot block no longer contains {marker!r}"

# =============================================================================
# Services — same six, same films, stacked vertically instead of in the grid
# =============================================================================
# The sixth card is <article class="cap-card cap-card--secondary"> — the pillar-2
# variant. Matching on "cap-card reveal" alone silently drops it.
CARD_RE = re.compile(
    r'<article class="cap-card[^"]*">(.*?)</article>', re.S)
FIELD = {
    "poster": re.compile(r'poster="([^"]+)"'),
    "video": re.compile(r'<source data-src="([^"]+)"'),
    "index": re.compile(r'<div class="cap-card__index">(.*?)</div>', re.S),
    "tag": re.compile(r'<div class="cap-card__tag">(.*?)</div>', re.S),
    "title": re.compile(r'<h3 class="cap-card__title">(.*?)</h3>', re.S),
    "copy": re.compile(r'<p class="cap-card__copy">(.*?)</p>', re.S),
    "list": re.compile(r'<ul class="cap-card__list">(.*?)</ul>', re.S),
}

cards = []
for raw in CARD_RE.findall(CAPS):
    card = {}
    for key, rx in FIELD.items():
        m = rx.search(raw)
        card[key] = m.group(1).strip() if m else ""
    cards.append(card)

assert len(cards) == 6, f"expected 6 capability cards, parsed {len(cards)}"

# Which pillar each card belongs to. Read off the page rather than hardcoded:
# the pillar bands sit between the card grids, so every card after a band
# belongs to it.
bands = [(m.start(),
          re.search(r'caps__pillar-num">(.*?)<', m.group(0), re.S).group(1).strip(),
          re.search(r'caps__pillar-title">(.*?)<', m.group(0), re.S).group(1).strip())
         for m in re.finditer(r'<div class="caps__pillar\b.*?</div>\s*</div>', CAPS, re.S)]
assert bands, "no pillar bands found in the capabilities section"

PILLAR = []
for m in CARD_RE.finditer(CAPS):
    current = [b for b in bands if b[0] < m.start()][-1]
    PILLAR.append(f"{current[1]} — {current[2]}")
assert len(PILLAR) == len(cards)

rows = []
last_pillar = None
for card, pillar in zip(cards, PILLAR):
    if pillar != last_pillar:
        num, _, title = pillar.partition(" — ")
        rows.append(
            '        <div class="svc__pillar">\n'
            f'          <span class="svc__pillar-num">{html.escape(num)}</span>\n'
            '          <span class="svc__pillar-divider" aria-hidden="true"></span>\n'
            f'          <span class="svc__pillar-title">{html.escape(title)}</span>\n'
            "        </div>\n"
        )
        last_pillar = pillar

    items = re.findall(r"<li>(.*?)</li>", card["list"], re.S)
    li = "\n".join(f"              <li>{i.strip()}</li>" for i in items)

    rows.append(f"""        <article class="svc reveal">
          <div class="svc__media">
            <video class="cap-card__video svc__video" muted loop playsinline preload="none"
                   disablepictureinpicture poster="{card['poster']}">
              <source data-src="{card['video']}" type="video/mp4" />
            </video>
            <div class="svc__media-overlay" aria-hidden="true"></div>
            <div class="svc__index" aria-hidden="true">{card['index']}</div>
          </div>
          <div class="svc__body">
            <div class="svc__tag">{card['tag']}</div>
            <h3 class="svc__title">{card['title']}</h3>
            <p class="svc__copy">{card['copy']}</p>
            <ul class="svc__list">
{li}
            </ul>
            <a href="#kontakt" class="link-arrow svc__link">
              <span>Dazu ein Erstgespräch</span>
              <span class="link-arrow__icon" aria-hidden="true">
                <svg viewBox="0 0 16 16" fill="none"><path d="M3 8h9M9 5l3 3-3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter" /></svg>
              </span>
            </a>
          </div>
        </article>
""")

# The heading and the lead come off the live page too, so the wording here can
# never drift from the wording the client signed off.
INTRO_H2 = re.search(r'<h2 class="h-section">.*?</h2>', CAPS, re.S).group(0)
INTRO_LEAD = re.search(r'<p class="h-lead">.*?</p>', CAPS, re.S).group(0)

SERVICES = f"""    <section class="section section--white svc-section" id="leistungen">
      <div class="container">
        <div class="section__intro reveal">
          <div class="eyebrow"><span class="eyebrow__bar" aria-hidden="true"></span><span class="eyebrow__index">02</span><span>Leistungen</span></div>
          <div class="section__intro-grid">
            {INTRO_H2}
            {INTRO_LEAD}
          </div>
        </div>

        <div class="svc-list">
{''.join(rows)}        </div>
      </div>
    </section>
"""


# =============================================================================
# Sticky bottom call to action. Markup lives here, behaviour in cex-koeln.js,
# looks in placeholder.css.
# =============================================================================
ARROW = ('<svg viewBox="0 0 16 16" fill="none" aria-hidden="true">'
         '<path d="M3 8h9M9 5l3 3-3 3" stroke="currentColor" stroke-width="1.8" '
         'stroke-linecap="square" stroke-linejoin="miter"/></svg>')

DOCK = f"""  <div class="cta-dock" aria-label="Kontakt">
    <div class="cta-dock__inner">
      <p class="cta-dock__copy">
        Erstgespräch, 30 Minuten, kostenlos.
        <span>Sagen Sie uns, wo Sie stehen.</span>
      </p>
      <div class="cta-dock__actions">
        <a class="cta-dock__btn cta-dock__btn--ghost" href="tel:+4917624161674">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3h3l1.2 3-1.6 1.2a9 9 0 0 0 3.2 3.2L10 8.8 13 10v3a10 10 0 0 1-10-10Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="miter"/></svg>
          <span>Anrufen</span>
        </a>
        <a class="cta-dock__btn cta-dock__btn--primary" href="#kontakt">
          <span>Erstgespräch anfragen</span>
          {ARROW}
        </a>
      </div>
    </div>
  </div>
"""

# =============================================================================
# Header — the production one without the drawer, because the pages it opens
# onto are not published yet. script.js bails out when the drawer is absent.
# =============================================================================
HEADER = """  <header class="cx-header">
    <nav class="nav" id="nav" aria-label="Hauptnavigation">
      <div class="nav__inner">

        <div class="nav__lead">
          <a href="/" class="nav__brand" aria-label="CEx — zur Startseite">
            <img src="media/cex-logo.png" alt="CEx" width="120" height="48" srcset="media/cex-logo-2x.png 2x">
          </a>
          <ul class="nav__primary">
            <li><a href="#leistungen">Leistungen</a></li>
            <li><a href="#journey">Vorgehen</a></li>
            <li><a href="#team">Ansprechpartner</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
        </div>

        <div class="nav__slot" role="presentation"></div>

        <div class="nav__actions">
          <a href="#kontakt" class="btn btn--accent btn--small nav__cta" data-cta-label="Erstgespräch anfragen">
            <span class="nav__cta-text">Erstgespräch anfragen</span>
            <span class="btn__icon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="M3 8h9M9 5l3 3-3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter"/></svg></span>
          </a>
        </div>

      </div>
    </nav>
  </header>
"""

# =============================================================================
# Head
# =============================================================================
TITLE = "CEx | Unternehmensberatung Köln für Prozesse, Projekte, KI"
DESC = ("CEx berät aus Köln zu Prozessoptimierung, Projektmanagement, "
        "Digitalisierung, Change Management, KI und Enterprise Architecture — "
        "Senior-Beratung für komplexe IT- und Digitalisierungsvorhaben.")

# The share card is not the search result, and it must not be written like one.
# Slack, WhatsApp, LinkedIn and iMessage all print the site name on its own line
# above the title, so a title that opens with "CEx |" says CEx twice; and all of
# them wrap the description to three or four dense lines, so a keyword list
# reads as noise at the size it is actually seen. These two strings say the same
# thing as TITLE and DESC in the shape a card can hold — and the headline is the
# one already burnt into the picture, so card and image read as one object.
# TITLE and DESC stay exactly as they are: they are the search result.
SHARE_TITLE = "Komplexe Veränderungen, klare Umsetzung"
SHARE_DESC = ("Unternehmensberatung aus Köln für Prozesse, Projekte, "
              "Digitalisierung, Change, KI und Enterprise Architecture.")

ORG_LD = """{
  "@context": "https://schema.org",
  "@type": ["Organization", "ProfessionalService"],
  "@id": "https://cex.koeln/#organization",
  "name": "CEx",
  "legalName": "CEx UG (haftungsbeschränkt)",
  "url": "https://cex.koeln/",
  "logo": "https://cex.koeln/media/cex-logo-512.png",
  "image": "https://cex.koeln/media/cex-og-1200x630.jpg",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Stolberger Straße 90 a",
    "postalCode": "50825",
    "addressLocality": "Köln",
    "addressRegion": "Nordrhein-Westfalen",
    "addressCountry": "DE"
  },
  "telephone": "+49 176 24161674",
  "vatID": "DE459231559",
  "email": "kontakt@cex.koeln",
  "areaServed": "DACH",
  "founder": [
    { "@type": "Person", "name": "Johannes Reusch" },
    { "@type": "Person", "name": "Hans-Helmut Scheel" }
  ]
}"""

WEBPAGE_LD = """{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://cex.koeln/#webpage",
  "url": "https://cex.koeln/",
  "name": "CEx | Unternehmensberatung Köln für Prozesse, Projekte, KI",
  "inLanguage": "de-DE",
  "isPartOf": {
    "@type": "WebSite",
    "@id": "https://cex.koeln/#website",
    "name": "CEx",
    "url": "https://cex.koeln/"
  },
  "publisher": { "@id": "https://cex.koeln/#organization" }
}"""

# The FAQ markup is built from the questions and answers that are actually on
# this page, rather than copied from anywhere. Google penalises FAQ markup that
# does not match the visible text, and the static repo's copy of it is a week
# behind the live wording.
def plain(fragment):
    text = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


qa = []
for item in re.findall(r"<details class=\"faq-item[^\"]*\">(.*?)</details>", FAQ, re.S):
    q = re.search(r'<span class="faq-summary__text">(.*?)</span>', item, re.S)
    a = re.search(r'<div class="faq-item__body">(.*?)</div>', item, re.S)
    assert q and a, "an FAQ item is missing its question or its answer"
    qa.append((plain(q.group(1)), plain(a.group(1))))

assert len(qa) >= 5, f"only {len(qa)} FAQ entries parsed"

FAQ_LD = json.dumps({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": "https://cex.koeln/#faq",
    "mainEntity": [
        {"@type": "Question", "name": q,
         "acceptedAnswer": {"@type": "Answer", "text": a}}
        for q, a in qa
    ],
}, ensure_ascii=False, indent=2)

CSS = [
    "styles.css", "cx-design-system.css", "polish.css",
    "cx-hero.css", "cx-components.css", "founders.css", "placeholder.css",
]
V = "20260811c"

OG_IMAGE = f"https://cex.koeln/media/cex-og-1200x630.jpg?v={V}"
OG_ALT = ("Kölner Dom und Hohenzollernbrücke, darüber der Satz "
          "Komplexe Veränderungen, klare Umsetzung")

def head_shell(title, desc, canonical, extra_ld=(), body_class="", noindex=False,
               share_title=None, share_desc=None):
    """The one <head> every page on this site uses.

    share_title/share_desc are what the link preview shows. They default to the
    search-result pair, because on most pages the two jobs want the same words.
    """
    share_title = share_title or title
    share_desc = share_desc or desc
    ld = "\n".join(f'  <script type="application/ld+json">\n{block}\n  </script>'
                   for block in extra_ld)
    robots = "noindex, follow" if noindex else "index, follow"
    return f"""<!doctype html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <meta name="robots" content="{robots}" />
  <meta name="theme-color" content="#1E2327" />
  <link rel="canonical" href="{canonical}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="CEx" />
  <meta property="og:locale" content="de_DE" />
  <meta property="og:title" content="{share_title}" />
  <meta property="og:description" content="{share_desc}" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:image" content="{OG_IMAGE}" />
  <meta property="og:image:secure_url" content="{OG_IMAGE}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="{OG_ALT}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{share_title}" />
  <meta name="twitter:description" content="{share_desc}" />
  <meta name="twitter:image" content="{OG_IMAGE}" />
  <meta name="twitter:image:alt" content="{OG_ALT}" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />

  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
  <link rel="icon" type="image/png" sizes="32x32" href="media/cex-favicon-32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="media/cex-favicon-16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="media/cex-apple-touch.png" />
  <link rel="manifest" href="site.webmanifest" />

  <link rel="preload" href="fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin />
{chr(10).join(f'  <link rel="stylesheet" href="{c}?v={V}" />' for c in CSS)}
  <script defer src="script.js?v={V}"></script>
  <script defer src="cex-koeln.js?v={V}"></script>

{ld}
</head>
<!--
    cex-migrated-page is not decoration. polish.css scopes 140 rules behind it,
    including the entire top bar — drop the class and the nav renders as a bare
    bulleted list. cex-static-site is what script.js checks before it takes over
    the contact forms.
  -->
  <body class="cex-migrated-page cex-static-site {body_class}cex-placeholder">
  <a class="skip-link" href="#main">Zum Inhalt springen</a>

"""

head = head_shell(TITLE, DESC, "https://cex.koeln/",
                  extra_ld=(ORG_LD, WEBPAGE_LD, FAQ_LD), body_class="home ",
                  share_title=SHARE_TITLE, share_desc=SHARE_DESC)

page = (
    head
    + HEADER
    + "\n  <main id=\"main\">\n"
    + HERO
    + "\n"
    + TRUSTBAND
    + "\n"
    + SERVICES
    + "\n"
    + JOURNEY
    + "\n"
    + BENEFITS
    + "\n"
    + OUTCOMES
    + "\n"
    + FAQ
    + "\n"
    + TEAM
    + "\n"
    + FINAL_CTA
    + "\n  </main>\n\n"
    + DOCK
    + "\n"
    + FOOTER
    + "\n</body>\n</html>\n"
)

# --- rewrite the links that point at pages this site does not carry ---------
# WordPress writes root-relative paths. Only three of them exist here.
KEPT = {"/", "impressum.html", "datenschutz.html"}


def rewrite_links(markup, prefix=""):
    """prefix is "/" on the legal pages, where an in-page anchor has to travel
    back to the homepage before it means anything."""
    markup = markup.replace('href="/#contact"', f'href="{prefix}#kontakt"')
    markup = markup.replace('href="#contact"', f'href="{prefix}#kontakt"')
    markup = markup.replace('href="#capabilities"', f'href="{prefix}#leistungen"')
    markup = markup.replace('href="/impressum/"', 'href="impressum.html"')
    markup = markup.replace('href="/datenschutz/"', 'href="datenschutz.html"')

    # Everything else under / is one of the ~40 unpublished subpages, at any
    # depth. A named list would silently miss a new one, so this catches the
    # shape instead.
    return re.sub(
        r'href="(/[^"#]*)"',
        lambda m: m.group(0) if m.group(1) in KEPT else f'href="{prefix}#leistungen"',
        markup)


page = rewrite_links(page)

(HERE / "index.html").write_text(page, encoding="utf-8")

# --- no dead links may survive ----------------------------------------------
# <a> only. <link rel="stylesheet"> also uses href and is checked separately,
# against the filesystem, further down.
hrefs = set(re.findall(r'<a\b[^>]*?href="([^"]+)"', page))
allowed_local = {"/", "impressum.html", "datenschutz.html", "./datenschutz.html"}
dead = [h for h in hrefs
        if not h.startswith(("#", "http", "tel:", "mailto:"))
        and h not in allowed_local]
assert not dead, f"links to pages this site does not have: {sorted(dead)}"

# Every in-page anchor must land on something.
ids = set(re.findall(r'\bid="([^"]+)"', page))
missing = sorted({h[1:] for h in hrefs if h.startswith("#") and len(h) > 1} - ids)
assert not missing, f"anchors with no target on the page: {missing}"

print(f"index.html  {len(page):,} bytes  ·  {len(cards)} services  ·  "
      f"{len(hrefs)} links, 0 dead, 0 broken anchors")


# =============================================================================
# Assets — copy across only what this page actually asks for. The production
# media folder is 66 MB; the placeholder needs a fraction of it.
# =============================================================================
CSS_FILES = ["styles.css", "cx-design-system.css", "polish.css",
             "cx-hero.css", "cx-components.css", "founders.css"]

for name in CSS_FILES + ["favicon.svg"]:
    shutil.copy2(SRC / name, HERE / name)

# --- script.js, verbatim ----------------------------------------------------
# The consent dialog is the production one, unchanged: script.js injects the
# markup, opens it on the first visit and writes the answer to localStorage
# under cxPrivacyConsent.v1. Nothing on this page reads a cookie, and nothing
# optional loads before the visitor has answered.
shutil.copy2(SRC / "script.js", HERE / "script.js")

shutil.copytree(SRC / "fonts", HERE / "fonts", dirs_exist_ok=True)

# --- the legal pages, which German law requires a live site to carry --------
# Written for this deployment rather than copied from the production site: the
# hosting, the storage and the third countries are all different here, and a
# privacy notice that describes someone else's stack is worse than none.


def legal_chrome(markup):
    """The shared header and footer, seen from a legal page.

    Every in-page anchor in them points at a section of the HOMEPAGE, so it has
    to travel back to / first. The hand-written body is left alone — its own
    anchors are real ids on the page it sits on.
    """
    return re.sub(r'href="#', 'href="/#', rewrite_links(markup, prefix="/"))


# The fourth field is the card title. The site name is already printed above it
# in every messenger, so repeating "| CEx Unternehmensberatung Köln" there just
# spends the one readable line on the word CEx twice.
LEGAL = [
    ("impressum.html", "Impressum | CEx Unternehmensberatung Köln",
     "Impressum der CEx UG (haftungsbeschränkt), Stolberger Straße 90 a, "
     "50825 Köln — Anbieterkennzeichnung nach § 5 DDG.",
     "Impressum"),
    ("datenschutz.html", "Datenschutzerklärung | CEx Unternehmensberatung Köln",
     "Wie CEx personenbezogene Daten auf cex.koeln verarbeitet: Hosting, "
     "Einwilligung, Kontaktanfragen, Ihre Rechte, KI-Transparenz.",
     "Datenschutzerklärung"),
]

for name, title, desc, share_title in LEGAL:
    body = (HERE / "legal" / name.replace(".html", "-body.html")
            ).read_text(encoding="utf-8")
    body = body[body.index("<main"):body.index("</main>") + len("</main>")]

    legal = (
        head_shell(title, desc, f"https://cex.koeln/{name}",
                   body_class="cex-legal-page ", share_title=share_title)
        + legal_chrome(HEADER)
        + "\n"
        + body
        + "\n"
        + legal_chrome(FOOTER)
        + "\n</body>\n</html>\n"
    )
    (HERE / name).write_text(legal, encoding="utf-8")

    # Same two checks the homepage gets: no link to a page that is not here,
    # and no anchor without a target.
    lhrefs = set(re.findall(r'<a\b[^>]*?href="([^"]+)"', legal))
    lids = set(re.findall(r'\bid="([^"]+)"', legal))
    ldead = [h for h in lhrefs
             if not h.startswith(("#", "/", "http", "tel:", "mailto:"))
             and h.split("#")[0] not in {"impressum.html", "datenschutz.html"}]
    lmissing = sorted({h[1:] for h in lhrefs if h.startswith("#") and len(h) > 1}
                      - lids)
    assert not ldead, f"{name}: links to pages this site does not have: {sorted(ldead)}"
    assert not lmissing, f"{name}: anchors with no target: {lmissing}"
    print(f"{name:18} {len(legal):,} bytes  ·  {len(lhrefs)} links, 0 dead, "
          f"0 broken anchors")

# --- every media file the HTML or the CSS names ------------------------------
wanted = set()
for page_file in ["index.html", "impressum.html", "datenschutz.html"]:
    text = (HERE / page_file).read_text(encoding="utf-8")
    wanted |= set(re.findall(r'media/[A-Za-z0-9._@/-]+\.[A-Za-z0-9]+', text))
for css_file in CSS_FILES + ["placeholder.css"]:
    text = (HERE / css_file).read_text(encoding="utf-8")
    for url in re.findall(r'url\(\s*["\']?([^"\')]+)', text):
        if "media/" in url:
            wanted.add("media/" + url.split("media/", 1)[1])

# The share cards and the icons are referenced by absolute URL in the head, so
# the scan above cannot see them.
wanted |= {
    "media/cex-og-1200x630.jpg", "media/cex-thumbnail-1200x1200.jpg",
    "media/cex-favicon-16.png", "media/cex-favicon-32.png",
    "media/cex-apple-touch.png", "media/cex-favicon-192.png",
    "media/cex-favicon-512.png", "media/cex-favicon.svg",
    "media/cex-logo.png", "media/cex-logo-2x.png", "media/cex-logo-on-dark.png",
    "media/cex-logo-512.png", "media/cex-hero-still.jpg",
}

(HERE / "media").mkdir(exist_ok=True)
copied = missing_media = 0
for rel in sorted(wanted):
    source = SRC / rel
    if not source.exists():
        missing_media += 1          # generated later by render-share-cards.sh
        continue
    shutil.copy2(source, HERE / rel)
    copied += 1

# --- the share-card source, so the cards stay rebuildable --------------------
(HERE / "scripts").mkdir(exist_ok=True)
for name in ["og-image-source.html", "render-share-cards.sh"]:
    shutil.copy2(SRC / "scripts" / name, HERE / "scripts" / name)

total = sum(f.stat().st_size for f in HERE.rglob("*") if f.is_file())
print(f"assets      {copied} media files copied, {missing_media} to be generated  ·  "
      f"site total {total / 1_048_576:.1f} MB")
