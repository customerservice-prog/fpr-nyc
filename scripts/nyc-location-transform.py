#!/usr/bin/env python3
from pathlib import Path
import os, re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)

RENAMES = {
    "lib/scAddonMatching.ts": "lib/nycAddonMatching.ts",
    "lib/scDeliveryInput.ts": "lib/nycDeliveryInput.ts",
    "lib/scSharedGallery.ts": "lib/nycSharedGallery.ts",
    "lib/scWeddingArtworkServer.ts": "lib/nycWeddingArtworkServer.ts",
    "lib/scWeddingImages.ts": "lib/nycWeddingImages.ts",
}
for src, dst in RENAMES.items():
    s, d = ROOT/src, ROOT/dst
    if s.exists() and not d.exists():
        d.parent.mkdir(parents=True, exist_ok=True)
        s.rename(d)

REPLACEMENTS = [
    ("@/lib/scAddonMatching", "@/lib/nycAddonMatching"),
    ("@/lib/scDeliveryInput", "@/lib/nycDeliveryInput"),
    ("@/lib/scSharedGallery", "@/lib/nycSharedGallery"),
    ("@/lib/scWeddingArtworkServer", "@/lib/nycWeddingArtworkServer"),
    ("@/lib/scWeddingImages", "@/lib/nycWeddingImages"),
    ("SC_WEDDING_IMAGES", "NYC_WEDDING_IMAGES"),
    ("SC_WEDDING_ITEM_TO_PACKAGE", "NYC_WEDDING_ITEM_TO_PACKAGE"),
    ("readScWeddingArtwork", "readNycWeddingArtwork"),
    ("SC_SHARED_GALLERY", "NYC_SHARED_GALLERY"),
    ("scSharedGallery", "nycSharedGallery"),
    ("SC_ADDON", "NYC_ADDON"),
    ("scAddon", "nycAddon"),
    ("ScAddon", "NycAddon"),
    ("scDelivery", "nycDelivery"),
    ("ScDelivery", "NycDelivery"),
    ("Friendly Party Rental SC", "Friendly Party Rental NYC"),
    ("Friendly Party Rental South Carolina", "Friendly Party Rental NYC"),
    ("friendlypartyrentalsc.com", "fpr-nyc-production.up.railway.app"),
    ("864-610-5324", "315-884-1498"),
    ("8646105324", "3158841498"),
    ("+18646105324", "+13158841498"),
    ("Greenville, SC", "Riverdale, NY"),
    ("Greenville SC", "Riverdale NY"),
    ("Upstate South Carolina", "Downstate New York"),
    ("Upstate SC", "Downstate New York"),
    ("South Carolina", "Downstate New York"),
]

TEXT_EXTS = {".ts",".tsx",".js",".jsx",".cjs",".mjs",".json",".md",".yml",".yaml",".toml",".txt",".css"}
SKIP_DIRS = {".git","node_modules",".next","dist"}
for p in ROOT.rglob("*"):
    if not p.is_file() or p.suffix.lower() not in TEXT_EXTS:
        continue
    if any(part in SKIP_DIRS for part in p.parts):
        continue
    try:
        data = p.read_text()
    except UnicodeDecodeError:
        continue
    new = data
    for old, repl in REPLACEMENTS:
        new = new.replace(old, repl)
    if new != data:
        p.write_text(new)

# Core BUSINESS identity must never claim a storefront or Google profile.
utils = ROOT/"lib/utils.ts"
if utils.exists():
    s = utils.read_text()
    s = s.replace("name: 'Friendly Party Rental SC'", "name: 'Friendly Party Rental NYC'")
    s = re.sub(r"emailHref:\s*'[^']*'", "emailHref: 'mailto:customerservice@friendlypartyrental.com?subject=%5BNYC%20%2F%20Downstate%5D%20rental%20inquiry'", s)
    s = re.sub(r"address:\s*'[^']*'", "address: ''", s)
    s = re.sub(r"serviceArea:\s*'[^']*'", "serviceArea: 'Riverdale, selected Bronx neighborhoods & Lower Westchester'", s)
    s = re.sub(r"mapUrl:\s*'[^']*'", "mapUrl: ''", s)
    s = re.sub(r"googleProfile:\s*'[^']*'", "googleProfile: ''", s)
    s = s.replace("Riverdale, NY and surrounding Downstate New York communities", "Riverdale, selected Bronx neighborhoods, and Lower Westchester")
    utils.write_text(s)

# Homepage metadata: use NYC location language, not source-location copy.
home = ROOT/"app/(public)/page.tsx"
if home.exists():
    s = home.read_text()
    s = re.sub(
        r"export const metadata\s*=\s*nycPageMetadata\([^\n]+\)",
        "export const metadata = nycPageMetadata('/','Party Rentals in Riverdale, the Bronx & Lower Westchester | Friendly Party Rental NYC','Rent tents, tables, chairs, inflatables, linens, lighting and wedding equipment from Friendly Party Rental NYC with delivery across Riverdale, selected Bronx neighborhoods and Lower Westchester.')",
        s,
        count=1,
    )
    s = s.replace(".replace(' — Riverdale, NY','')", ".replace(' — Riverdale, NY','')")
    home.write_text(s)

# Category structured-data service areas.
catlayout = ROOT/"app/(public)/category/[slug]/layout.tsx"
if catlayout.exists():
    s = catlayout.read_text()
    s = re.sub(
        r"areaServed:\[[^\]]+\]\.map\(name=>\(\{'@type':'Place',name:name\+'[^']*'\}\)\)",
        "areaServed:['Riverdale','Fieldston','Kingsbridge','The Bronx','Yonkers','Mount Vernon','New Rochelle','Bronxville','Tuckahoe','Eastchester','Pelham'].map(name=>({'@type':'Place',name}))",
        s,
    )
    catlayout.write_text(s)

# Admin order city chooser should be NYC service areas, not Greenville list.
order_new = ROOT/"app/admin/orders/new/page.tsx"
if order_new.exists():
    s = order_new.read_text()
    s = re.sub(
        r"const LOCAL_CITIES\s*=\s*\[[^\]]*\]",
        'const LOCAL_CITIES = ["Riverdale","Fieldston","Kingsbridge","Bronx","Yonkers","Mount Vernon","New Rochelle","Bronxville","Tuckahoe","Eastchester","Pelham"]',
        s,
        count=1,
        flags=re.S,
    )
    order_new.write_text(s)

# Admin/local rank defaults: Riverdale city reference, not a storefront.
rank = ROOT/"app/api/admin/local-rank/route.ts"
if rank.exists():
    s = rank.read_text()
    s = s.replace("Approximate Greenville city-center point", "Approximate Riverdale service-area reference point")
    s = re.sub(r"const CENTER_LAT\s*=\s*[-\d.]+", "const CENTER_LAT = 40.8872", s)
    s = re.sub(r"const CENTER_LON\s*=\s*[-\d.]+", "const CENTER_LON = -73.8992", s)
    rank.write_text(s)

# Remove fake map default from visual builder.
vb = ROOT/"app/admin/settings/visual-builder/page.tsx"
if vb.exists():
    s = vb.read_text().replace('address: "Riverdale, NY 29601"', 'address: ""')
    vb.write_text(s)

# Make API/marketing origins runtime-configured, never hardcoded SC/temporary-domain assumptions.
for rel in [
    "app/admin/marketing/campaigns/page.tsx",
    "app/api/admin/marketing-autopilot/route.ts",
    "app/api/admin/orders/[id]/send-quote/route.ts",
]:
    p = ROOT/rel
    if p.exists():
        s = p.read_text()
        s = s.replace("'https://fpr-nyc-production.up.railway.app'", "(process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_BASE_URL || '')")
        s = s.replace('"https://fpr-nyc-production.up.railway.app"', "(process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_BASE_URL || '')")
        p.write_text(s)

# Rename SC test files to NYC names and update obvious terminology.
tests = ROOT/"tests"
if tests.exists():
    for p in sorted(tests.glob("sc-*")):
        dest = p.with_name("nyc-" + p.name[3:])
        if not dest.exists():
            p.rename(dest)
    for p in tests.glob("nyc-*"):
        if not p.is_file(): continue
        try: s = p.read_text()
        except UnicodeDecodeError: continue
        s = s.replace("SC_", "NYC_").replace("scPageMetadata", "nycPageMetadata").replace("scUrl", "nycUrl")
        s = s.replace("sc-domain:fpr-nyc-production.up.railway.app", "https://fpr-nyc-production.up.railway.app/")
        s = s.replace("Greenville", "Riverdale").replace("Upstate South Carolina", "Downstate New York").replace("Upstate SC", "Downstate New York")
        s = s.replace("[South Carolina]", "[NYC / Downstate]").replace("SOUTH CAROLINA", "NYC / DOWNSTATE NEW YORK")
        p.write_text(s)

# Package/test naming.
pkg = ROOT/"package.json"
if pkg.exists():
    s = pkg.read_text()
    s = s.replace('"name": "friendly-party-rental"', '"name": "friendly-party-rental-nyc"')
    s = s.replace("test:sc-ranking", "test:nyc-ranking").replace("test:sc-discovery", "test:nyc-discovery").replace("test:sc-identity", "test:nyc-identity")
    s = s.replace("tests/sc-ranking-readiness.test.cjs", "tests/nyc-ranking-readiness.test.cjs")
    s = s.replace("tests/sc-discovery-readiness.test.cjs", "tests/nyc-discovery-readiness.test.cjs")
    s = s.replace("tests/sc-identity-sync.test.cjs", "tests/nyc-identity-sync.test.cjs")
    pkg.write_text(s)

# Workflows: rename display copy and avoid hardcoded site domain for cron calls.
wfdir = ROOT/".github/workflows"
if wfdir.exists():
    for p in wfdir.glob("*"):
        if not p.is_file(): continue
        s = p.read_text()
        s = s.replace("Greenville", "NYC / Downstate").replace("South Carolina", "NYC / Downstate")
        s = s.replace("https://fpr-nyc-production.up.railway.app", "${{ secrets.NYC_SITE_ORIGIN }}")
        p.write_text(s)
    scwf = wfdir/"sc-branding-check.yml"
    if scwf.exists():
        dest = wfdir/"nyc-branding-check.yml"
        scwf.rename(dest)

# .env example: no SC property/domain, keep index off by default.
env = ROOT/".env.example"
if env.exists():
    s = env.read_text()
    s = re.sub(r"^GSC_SITE_URL=.*$", "GSC_SITE_URL=", s, flags=re.M)
    if "PUBLIC_INDEXABLE=" not in s:
        s += "\nPUBLIC_INDEXABLE=false\n"
    if "NYC_DELIVERY_FEES_JSON=" not in s:
        s += "NYC_DELIVERY_FEES_JSON={}\n"
    env.write_text(s)

print("NYC localization transform complete")
