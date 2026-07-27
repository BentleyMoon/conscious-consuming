#!/usr/bin/env python3
"""C3: add an 'economical' (affordability) criterion to the curated lenses where buying-cost is
meaningful — Services, Media, Organizations. NOT Initiatives (giving, not buying) and NOT food
(food affordability comes from real Open Prices via fetch_prices.py). Idempotent. Run, then build."""
import json, os
from tracked_io import write_json
HERE = os.path.dirname(os.path.abspath(__file__))
L = os.path.normpath(os.path.join(HERE, '..', 'content', 'lenses'))

# tier -> (economical score 0-100 higher=more affordable, provenance text)
TIER = {
    "free":     (100, "free"),
    "freemium": (85,  "free tier; paid upgrades"),
    "$":        (75,  "$ — inexpensive"),
    "paid$":    (65,  "paid, low cost"),
    "$$":       (55,  "$$ — mid-range"),
    "paid$$":   (45,  "paid subscription"),
    "$$$":      (33,  "$$$ — premium"),
}

SERVICES = {  # digital tools — mostly free; honest, so affordability rarely discriminates here
    "signal": "free", "element-matrix": "free", "threema": "$", "imessage": "free", "telegram": "free",
    "whatsapp": "free", "proton-mail": "freemium", "tuta": "freemium", "fastmail": "paid$", "gmail": "free",
    "tor-browser": "free", "firefox": "free", "brave": "free", "safari": "free", "chrome": "free",
    "edge": "free", "duckduckgo": "free", "startpage": "free", "kagi": "paid$$", "google-search": "free",
    "mastodon": "free", "bluesky": "free", "x-twitter": "freemium", "instagram": "free", "tiktok": "free",
    "proton-drive": "freemium", "nextcloud": "free", "google-drive": "freemium", "obsidian": "free",
    "standard-notes": "freemium", "notion": "freemium", "openstreetmap": "free", "google-maps": "free",
    "jitsi": "free", "zoom": "freemium",
}
MEDIA = {
    "wikipedia": "free", "mit-ocw": "free", "khan-academy": "free", "sep": "free", "gutenberg": "free",
    "arxiv": "free", "internet-archive": "free", "our-world-in-data": "free", "open-yale": "free",
    "freecodecamp": "free", "odin-project": "free", "3blue1brown": "free", "edx": "freemium",
    "coursera": "freemium", "ted": "free", "crashcourse": "free", "britannica": "freemium",
    "bbc-bitesize": "free", "pubmed": "free", "jstor": "paid$$", "stack-exchange": "free",
    "librivox": "free", "standard-ebooks": "free", "anki": "free", "duolingo": "freemium",
    "codecademy": "freemium", "brilliant": "paid$$", "udemy": "$", "linkedin-learning": "paid$$",
    "masterclass": "$$$", "youtube-edu": "free",
}
ORGS = {  # affordability of the organization's products
    "patagonia": "$$$", "equal-exchange": "$$", "dr-bronners": "$$", "ecosia": "free", "riverford": "$$",
    "triodos": "$$", "coop-group": "$$", "fairphone": "$$$", "tonys": "$$", "numi": "$$",
    "allbirds": "$$$", "ben-jerrys": "$$",
}

# new "Most affordable" preset per lens (weights reference that lens's real criteria keys)
PRESET = {
    "digital-services.json": {"economical": 5, "privacy": 2, "openness": 2, "respect": 1, "portability": 1, "accessibility": 1},
    "media-learning.json":   {"economical": 5, "educational": 3, "openness": 2, "depth": 1, "calm": 1, "accessibility": 1},
    "organizations-mission.json": {"economical": 5, "certification": 2, "ownership": 2, "transparency": 1, "environment": 1, "longevity": 1},
}
WORK = {"digital-services.json": SERVICES, "media-learning.json": MEDIA, "organizations-mission.json": ORGS}

for fn, tiers in WORK.items():
    path = os.path.join(L, fn)
    ds = json.load(open(path, encoding='utf-8'))
    keys = [c["key"] for c in ds["criteria"]]
    if "economical" not in keys:
        ds["criteria"].append({"key": "economical", "label": "Economical", "source": "curated"})
    ds["meta"]["presets"].setdefault("Most affordable", {"w": PRESET[fn], "x": []})
    n = 0
    for p in ds["products"]:
        t = tiers.get(p["code"])
        if not t:
            continue
        score, prov = TIER[t]
        p.setdefault("scores", {}).setdefault("economical", score)
        p.setdefault("provenance", {}).setdefault("economical", prov)
        p.setdefault("price", {"tier": t})
        n += 1
    write_json(path, ds, ensure_ascii=False, indent=1)
    print(f"  {fn}: economical added to {n}/{len(ds['products'])} entries")
print("Done. (Initiatives intentionally omitted; food affordability via Open Prices.)")
