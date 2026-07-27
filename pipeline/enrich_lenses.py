#!/usr/bin/env python3
"""C1 enrichment: add description / focuses / links / region to curated lens entries.
Idempotent merge — only fills fields that are absent, so re-running is safe and
already-seeded entries (e.g. the Media six) keep their content. Run, then build_datasets.py."""
import json, os
from tracked_io import write_json
HERE = os.path.dirname(os.path.abspath(__file__))
L = os.path.normpath(os.path.join(HERE, '..', 'content', 'lenses'))
def w(url): return [{"label": "Website", "url": url}]
def wr(url, region="global", focuses=None, desc=None):
    e = {"links": w(url), "region": [region] if isinstance(region, str) else region}
    if focuses: e["focuses"] = focuses
    if desc: e["description"] = desc
    return e

ORGS = {
 "patagonia": {"description": "Outdoor apparel and gear company, now steward-owned via a purpose trust that directs profit to environmental causes.", "focuses": ["Apparel & gear", "Steward-owned", "B Corp", "Environment"], "links": w("https://www.patagonia.com/"), "region": ["global"]},
 "equal-exchange": {"description": "A worker-owned cooperative that pioneered fair trade in coffee, chocolate, and food, governed one-member-one-vote.", "focuses": ["Coffee & food", "Worker co-op", "Fair Trade"], "links": w("https://equalexchange.coop/"), "region": ["US", "global"]},
 "dr-bronners": {"description": "Family-owned maker of castile soaps, mission-bound with capped executive pay and regenerative, fair-trade sourcing.", "focuses": ["Personal care", "Family-owned", "Regenerative", "Fair Trade"], "links": w("https://www.drbronner.com/"), "region": ["global"]},
 "ecosia": {"description": "A steward-owned search engine that puts profit into planting trees and publishes monthly financials.", "focuses": ["Search", "Steward-owned", "Tree-planting"], "links": w("https://www.ecosia.org/"), "region": ["global"]},
 "riverford": {"description": "An employee-owned UK organic farm and veg-box service, owned by its staff since 2018.", "focuses": ["Organic food", "Employee-owned", "UK"], "links": w("https://www.riverford.co.uk/"), "region": ["UK"]},
 "triodos": {"description": "An ethical bank that finances only sustainable projects and publishes every loan it makes.", "focuses": ["Banking", "Transparent", "Sustainability-only"], "links": w("https://www.triodos.com/"), "region": ["EU", "UK"]},
 "coop-group": {"description": "One of the world's largest consumer co-operatives — member-owned grocery, funeral, and legal services in the UK.", "focuses": ["Grocery & retail", "Member-owned co-op", "UK"], "links": w("https://www.coop.co.uk/"), "region": ["UK"]},
 "fairphone": {"description": "A social enterprise building modular, repairable phones with fairer materials and an open supply chain.", "focuses": ["Electronics", "Repairable", "Fair materials"], "links": w("https://www.fairphone.com/"), "region": ["EU", "global"]},
 "tonys": {"description": "A chocolate company on a mission to end slavery in cocoa, with a mission-locked golden share and traceable beans.", "focuses": ["Chocolate", "Mission-locked", "Slave-free cocoa"], "links": w("https://tonyschocolonely.com/"), "region": ["global"]},
 "numi": {"description": "An organic, fair-trade tea company, founder-led and B Corp certified, with disclosed sourcing.", "focuses": ["Tea", "Organic", "Fair Trade", "B Corp"], "links": w("https://numitea.com/"), "region": ["US", "global"]},
 "allbirds": {"description": "A publicly traded public-benefit corporation making footwear from natural materials, labeling each product's carbon footprint.", "focuses": ["Footwear", "Public-benefit corp", "Carbon-labeled"], "links": w("https://www.allbirds.com/"), "region": ["global"]},
 "ben-jerrys": {"description": "An ice-cream maker owned by Unilever but governed by an independent board that protects its social mission.", "focuses": ["Ice cream", "Independent mission board", "Fairtrade"], "links": w("https://www.benjerry.com/"), "region": ["global"]},
}

INITIATIVES = {
 "against-malaria": {"description": "A GiveWell top charity that funds and tracks insecticide-treated bed nets to prevent malaria, publishing every distribution.", "focuses": ["Global health", "Bed nets", "Evidence-backed"], "links": w("https://www.againstmalaria.com/"), "region": ["global"]},
 "givedirectly": {"description": "Delivers donations as direct, unconditional cash transfers to people in poverty, backed by randomized trials.", "focuses": ["Poverty", "Direct cash", "RCT-backed"], "links": w("https://www.givedirectly.org/"), "region": ["global"]},
 "msf": {"description": "Provides frontline medical care in crises and conflict zones, and speaks out about what it witnesses.", "focuses": ["Humanitarian medicine", "Crisis response", "Independent"], "links": w("https://www.msf.org/"), "region": ["global"]},
 "red-cross": {"description": "Disaster response, emergency aid, and the blood supply — with deep volunteer and blood-donation involvement.", "focuses": ["Disaster relief", "Blood supply", "Volunteer"], "links": w("https://www.redcross.org/"), "region": ["US"]},
 "eff": {"description": "Defends digital privacy, free expression, and innovation through litigation, advocacy, and open-source tools.", "focuses": ["Digital rights", "Privacy", "Open-source tools"], "links": w("https://www.eff.org/"), "region": ["global"]},
 "wikimedia": {"description": "The nonprofit behind Wikipedia and its sister projects — free, openly licensed knowledge for everyone.", "focuses": ["Free knowledge", "Wikipedia", "Open"], "links": w("https://wikimediafoundation.org/"), "region": ["global"]},
 "open-food-facts": {"description": "The open, community food database (ODbL) whose data powers tools like this one.", "focuses": ["Open data", "Food", "Community"], "links": w("https://world.openfoodfacts.org/"), "region": ["global"]},
 "mozilla-foundation": {"description": "Champions a healthy, open internet and user privacy, and stewards open-source projects like Firefox.", "focuses": ["Open internet", "Privacy", "Open-source"], "links": w("https://foundation.mozilla.org/"), "region": ["global"]},
 "internet-archive-org": {"description": "A nonprofit digital library preserving the web, books, audio, and software for free public access.", "focuses": ["Digital preservation", "Open access", "Library"], "links": w("https://archive.org/"), "region": ["global"]},
 "creative-commons": {"description": "Builds and stewards the open licenses that let creators share work freely and legally.", "focuses": ["Open licensing", "Creative sharing", "Infrastructure"], "links": w("https://creativecommons.org/"), "region": ["global"]},
 "partners-in-health": {"description": "Builds long-term health systems and delivers care for the world's poorest communities.", "focuses": ["Global health equity", "Health systems", "Care delivery"], "links": w("https://www.pih.org/"), "region": ["global"]},
 "trevor-project": {"description": "Provides 24/7 crisis support and suicide prevention for LGBTQ young people.", "focuses": ["Youth crisis support", "LGBTQ", "Suicide prevention"], "links": w("https://www.thetrevorproject.org/"), "region": ["US"]},
}

SERVICES = {
 "signal": wr("https://signal.org/"), "element-matrix": wr("https://element.io/"), "threema": wr("https://threema.ch/"),
 "imessage": wr("https://www.apple.com/imessage/"), "telegram": wr("https://telegram.org/"), "whatsapp": wr("https://www.whatsapp.com/"),
 "proton-mail": wr("https://proton.me/mail"), "tuta": wr("https://tuta.com/"), "fastmail": wr("https://www.fastmail.com/"),
 "gmail": wr("https://www.google.com/gmail/"), "tor-browser": wr("https://www.torproject.org/"), "firefox": wr("https://www.mozilla.org/firefox/"),
 "brave": wr("https://brave.com/"), "safari": wr("https://www.apple.com/safari/"), "chrome": wr("https://www.google.com/chrome/"),
 "edge": wr("https://www.microsoft.com/edge"), "duckduckgo": wr("https://duckduckgo.com/"), "startpage": wr("https://www.startpage.com/"),
 "kagi": wr("https://kagi.com/"), "google-search": wr("https://www.google.com/"), "mastodon": wr("https://joinmastodon.org/"),
 "bluesky": wr("https://bsky.app/"), "x-twitter": wr("https://x.com/"), "instagram": wr("https://www.instagram.com/"),
 "tiktok": wr("https://www.tiktok.com/"), "proton-drive": wr("https://proton.me/drive"), "nextcloud": wr("https://nextcloud.com/"),
 "google-drive": wr("https://www.google.com/drive/"), "obsidian": wr("https://obsidian.md/"), "standard-notes": wr("https://standardnotes.com/"),
 "notion": wr("https://www.notion.so/"), "openstreetmap": wr("https://www.openstreetmap.org/"), "google-maps": wr("https://www.google.com/maps"),
 "jitsi": wr("https://jitsi.org/"), "zoom": wr("https://zoom.us/"),
}

MEDIA = {
 # already-seeded six: region only (links/description preserved)
 "wikipedia": {"region": ["global"]}, "mit-ocw": {"region": ["global"]}, "sep": {"region": ["global"]},
 "freecodecamp": {"region": ["global"]}, "3blue1brown": {"region": ["global"]}, "our-world-in-data": {"region": ["global"]},
 # the rest: website + region
 "khan-academy": wr("https://www.khanacademy.org/"), "gutenberg": wr("https://www.gutenberg.org/"), "arxiv": wr("https://arxiv.org/"),
 "internet-archive": wr("https://archive.org/"), "open-yale": wr("https://oyc.yale.edu/"), "odin-project": wr("https://www.theodinproject.com/"),
 "edx": wr("https://www.edx.org/"), "coursera": wr("https://www.coursera.org/"), "ted": wr("https://www.ted.com/"),
 "crashcourse": wr("https://thecrashcourse.com/"), "britannica": wr("https://www.britannica.com/"), "bbc-bitesize": wr("https://www.bbc.co.uk/bitesize", ["UK", "global"]),
 "pubmed": wr("https://pubmed.ncbi.nlm.nih.gov/"), "jstor": wr("https://www.jstor.org/"), "stack-exchange": wr("https://stackexchange.com/"),
 "librivox": wr("https://librivox.org/"), "standard-ebooks": wr("https://standardebooks.org/"), "anki": wr("https://apps.ankiweb.net/"),
 "duolingo": wr("https://www.duolingo.com/"), "codecademy": wr("https://www.codecademy.com/"), "brilliant": wr("https://brilliant.org/"),
 "udemy": wr("https://www.udemy.com/"), "linkedin-learning": wr("https://www.linkedin.com/learning/"), "masterclass": wr("https://www.masterclass.com/"),
 "youtube-edu": wr("https://www.youtube.com/"),
}

WORK = {
 "organizations-mission.json": ORGS,
 "initiatives-causes.json": INITIATIVES,
 "digital-services.json": SERVICES,
 "media-learning.json": MEDIA,
}

total = 0
for fn, ents in WORK.items():
    path = os.path.join(L, fn)
    ds = json.load(open(path, encoding='utf-8'))
    n = 0
    for prod in ds['products']:
        e = ents.get(prod['code'])
        if not e:
            continue
        for k, v in e.items():
            prod.setdefault(k, v)  # idempotent: never overwrite existing fields
        n += 1
    write_json(path, ds, ensure_ascii=False, indent=1)
    missing = [p['code'] for p in ds['products'] if p['code'] not in ents]
    print(f'  {fn}: enriched {n}/{len(ds["products"])}' + (f' (no map for: {missing})' if missing else ''))
    total += n
print(f'Enriched {total} entries.')
