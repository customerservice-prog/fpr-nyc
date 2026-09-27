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
    "lib/scLocalPlanningResources.ts": "lib/nycLocalPlanningResources.ts",
    "components/public/ScHomeSeo.tsx": "components/public/NycHomeSeo.tsx",
    "components/public/ScServiceArea.module.css": "components/public/NycServiceArea.module.css",
    "lib/scSearchReadiness.ts": "lib/nycSearchReadiness.ts",
    "lib/scRentSketch.ts": "lib/nycRentSketch.ts",
    "lib/scItemMedia.ts": "lib/nycItemMedia.ts",
    "lib/scCategoryImages.ts": "lib/nycCategoryImages.ts",
    "lib/scIndexNow.ts": "lib/nycIndexNow.ts",
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
    ("@/lib/scLocalPlanningResources", "@/lib/nycLocalPlanningResources"),
    ("@/components/public/ScHomeSeo", "@/components/public/NycHomeSeo"),
    ("@/components/public/ScServiceArea.module.css", "@/components/public/NycServiceArea.module.css"),
    ("@/lib/scSearchReadiness", "@/lib/nycSearchReadiness"),
    ("./scSearchReadiness", "./nycSearchReadiness"),
    ("@/lib/scRentSketch", "@/lib/nycRentSketch"),
    ("@/lib/scItemMedia", "@/lib/nycItemMedia"),
    ("@/lib/scCategoryImages", "@/lib/nycCategoryImages"),
    ("@/lib/scIndexNow", "@/lib/nycIndexNow"),
    ("SC_STATIC_SEARCH_PATHS", "NYC_STATIC_SEARCH_PATHS"),
    ("SC_RENTSKETCH_TENANT", "NYC_RENTSKETCH_TENANT"),
    ("SC_ITEM_MEDIA", "NYC_ITEM_MEDIA"),
    ("scOrderAccessUrl", "nycOrderAccessUrl"),
    ("normalizeScSearchProperty", "normalizeNycSearchProperty"),
    ("SC_GSC_DOMAIN_PROPERTY", "NYC_GSC_DOMAIN_PROPERTY"),
    ("SC_GSC_URL_PREFIX", "NYC_GSC_URL_PREFIX"),
    ("SC_LOCAL_PLANNING", "NYC_LOCAL_PLANNING"),
    ("ScHomeSeo", "NycHomeSeo"),
    ("ScServiceArea", "NycServiceArea"),
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


# Ensure NYC-local helper files exist.
delivery_input = ROOT/"lib/nycDeliveryInput.ts"
if not delivery_input.exists():
    delivery_input.write_text("""export function deliveryZipFromInput(value: string): string | null {
 const match=value.trim().match(/(?:^|[,\\s])(\\d{5})(?:-\\d{4})?(?:\\s*,?\\s*(?:USA|United States))?\\s*$/i)
 return match?.[1] || null
}
""")
planning = ROOT/"lib/nycLocalPlanningResources.ts"
planning.write_text("""// NYC / Downstate local planning resources intentionally remain empty until each source is verified for this market.
export const NYC_LOCAL_PLANNING: Record<string,{heading:string;body:string;label:string;url:string}> = {}
""")

# Replace SC city pages with actual NYC / Lower Westchester service-area guides.
public_dir = ROOT/"app/(public)"
for p in public_dir.glob("party-rentals-*-sc"):
    if p.is_dir():
        import shutil
        shutil.rmtree(p)
NYC_CITY_PAGES = ["riverdale","fieldston","kingsbridge","bronx","yonkers","mount-vernon","new-rochelle","bronxville","tuckahoe","eastchester","pelham"]
for slug in NYC_CITY_PAGES:
    d = public_dir/f"party-rentals-{slug}-ny"
    d.mkdir(parents=True, exist_ok=True)
    (d/"page.tsx").write_text(
        "import CityRentalGuide,{cityRentalMetadata} from '@/components/public/CityRentalGuide'\n"
        f'export const metadata=cityRentalMetadata("{slug}")\n'
        f'export default function Page(){{return <CityRentalGuide slug="{slug}"/>}}\n'
    )

for name in ["SC-BRAND-FINISHING.md","SC-FINALIZATION-20260921.md","SC-GOOGLE-READINESS-20260921.md","SC-MEDIA-EMAIL-REPAIR.md","SC-SEARCH-REPAIR-20260921.md","SC-STOREFRONT-REPAIR.md"]:
    p=ROOT/name
    if p.exists(): p.unlink()
tmp_tar=ROOT/"tmp/nyc-full-location-source.tar.gz"
if tmp_tar.exists(): tmp_tar.unlink()

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


# Rewrite shared NYC-facing components.
home_seo = ROOT/"components/public/NycHomeSeo.tsx"
home_seo.write_text("""import Link from 'next/link'

export default function NycHomeSeo() {
  return <div className="mt-8 space-y-8">
    <div><h2 className="text-xl font-bold text-dark mb-3">Tent Rentals in Riverdale, the Bronx & Lower Westchester</h2><p className="text-body text-sm">Compare <Link href="/category/tent-rentals" prefetch={false} className="underline">pole tents, frame tents, and canopies</Link> for weddings, graduations, backyard parties, corporate events, and community celebrations. Choose a tent around guest count, seating, serving space, surface, access, and weather needs, then have our team confirm installation requirements for the site.</p></div>
    <div><h2 className="text-xl font-bold text-dark mb-3">Table &amp; Chair Rentals</h2><p className="text-body text-sm">Browse <Link href="/category/table-chair-rentals" prefetch={false} className="underline">banquet tables, round tables, cocktail tables, folding chairs, resin chairs, and Chiavari chairs</Link>. Check the <Link href="/service-area#delivery-estimate" prefetch={false} className="underline">delivery fee for your event ZIP code</Link> while planning your order.</p></div>
    <div><h2 className="text-xl font-bold text-dark mb-3">Bounce Houses &amp; Water Slides</h2><p className="text-body text-sm">Explore <Link href="/category/bounce-house-rentals" prefetch={false} className="underline">bounce houses and water slides</Link>, concessions, yard games, generators, and other event add-ons. Review each item page for setup space, power, water, and other requirements before checkout.</p></div>
    <div><h2 className="text-xl font-bold text-dark mb-3">Wedding Rentals</h2><p className="text-body text-sm">Compare <Link href="/weddings#packages" prefetch={false} className="underline">wedding packages</Link>, tents, tables, chairs, linens, lighting, dance floors, ceremony pieces, and reception equipment, then confirm availability and site requirements with the NYC / Downstate team.</p></div>
    <div><h2 className="text-xl font-bold text-dark mb-3">Riverdale, Bronx &amp; Lower Westchester Delivery</h2><p className="text-body text-sm">Friendly Party Rental NYC serves Riverdale, Fieldston, Kingsbridge, selected Bronx ZIP codes, Yonkers, Mount Vernon, New Rochelle, Bronxville, Tuckahoe, Eastchester, Pelham, and nearby approved areas. <Link href="/service-area" prefetch={false} className="underline">Review the service area and delivery fee checker</Link>, or call <a href="tel:+13158841498" className="underline">315-884-1498</a>.</p></div>
  </div>
}
""")

city = ROOT/"components/public/CityRentalGuide.tsx"
if city.exists():
    x = city.read_text()
    x = x.replace("SC_LOCAL_PLANNING","NYC_LOCAL_PLANNING").replace("@/lib/scLocalPlanningResources","@/lib/nycLocalPlanningResources")
    x = x.replace(", SC", ", NY").replace("Friendly Party Rental SC","Friendly Party Rental NYC")
    x = x.replace("Riverdale team","NYC / Downstate team").replace("data-sc-city-guide","data-nyc-city-guide")
    city.write_text(x)

links = ROOT/"components/public/LocalDeliveryLinks.tsx"
if links.exists():
    links.write_text("""import Link from 'next/link'
import {NYC_SERVICE_AREAS,NYC_PRIORITY_AREAS} from '@/lib/nycServiceAreas'
export default function LocalDeliveryLinks(){return <section className="mt-10 border-t pt-6" aria-label="New York rental delivery areas"><h2 className="text-xl font-bold text-[#0B1F3A]">Rental delivery in Riverdale, the Bronx & Lower Westchester</h2><p className="my-3 text-sm leading-6 text-gray-600">Delivery is available by arrangement for your event address and date. Warehouse customer pickup is not offered. Travel fees are separate from rental prices.</p><nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">{NYC_SERVICE_AREAS.filter(area=>NYC_PRIORITY_AREAS.includes(area.slug)).map(area=><Link href={area.href} prefetch={false} className="text-blue-800 underline" key={area.slug}>{area.name}, NY rentals</Link>)}<Link href="/service-area#communities" prefetch={false} className="font-bold text-blue-800 underline">All NYC / Lower Westchester delivery communities</Link></nav></section>}
""")

checker = ROOT/"components/public/DeliveryFeeChecker.tsx"
if checker.exists():
    x=checker.read_text().replace("@/lib/scDeliveryInput","@/lib/nycDeliveryInput")
    x=x.replace("Greenville delivery checker","NYC / Downstate delivery checker").replace("200 E Broad Street, Greenville, SC 29601","Riverdale, NY 10471")
    checker.write_text(x)

service = ROOT/"app/(public)/service-area/page.tsx"
if service.exists():
    x=service.read_text().replace("@/components/public/ScServiceArea.module.css","@/components/public/NycServiceArea.module.css")
    x=x.replace("name:a.name+', SC'","name:a.name+', New York'").replace("nearby Upstate communities","nearby Bronx and Lower Westchester communities")
    x=x.replace("35 listed communities","11 listed communities").replace("Riverdale plus 34 nearby Upstate areas.","Riverdale plus selected Bronx and Lower Westchester areas.")
    x=x.replace("{area.name}, SC","{area.name}, NY").replace('href="tel:+18646105324"','href="tel:+13158841498"').replace('href="sms:+18646105324"','href="sms:+13158841498"')
    service.write_text(x)

utils = ROOT/"lib/utils.ts"
if utils.exists():
    x=utils.read_text()
    x=re.sub(r"name:\s*'Friendly Party Rental SC'","name: 'Friendly Party Rental NYC'",x)
    x=re.sub(r"emailHref:\s*'[^']*'","emailHref: 'mailto:customerservice@friendlypartyrental.com?subject=%5BNYC%20%2F%20Downstate%5D%20rental%20inquiry'",x)
    x=re.sub(r"address:\s*'[^']*'","address: ''",x)
    x=re.sub(r"serviceArea:\s*'[^']*'","serviceArea: 'Riverdale, selected Bronx neighborhoods & Lower Westchester'",x)
    x=re.sub(r"mapUrl:\s*'[^']*'","mapUrl: ''",x)
    x=re.sub(r"googleProfile:\s*'[^']*'","googleProfile: ''",x)
    utils.write_text(x)

home = ROOT/"app/(public)/page.tsx"
if home.exists():
    x=home.read_text().replace("import ScHomeSeo from '@/components/public/ScHomeSeo'","import NycHomeSeo from '@/components/public/NycHomeSeo'")
    x=x.replace("seoSection={<ScHomeSeo />}","seoSection={<NycHomeSeo />}")
    x=x.replace("Party Rentals in Greenville, SC | Tents, Tables, Chairs & More","Party Rentals in Riverdale, the Bronx & Lower Westchester | Friendly Party Rental NYC")
    x=x.replace("Rent tents, tables, chairs, bounce houses, water slides, linens and wedding equipment in Greenville, SC with delivery and online date availability.","Rent tents, tables, chairs, inflatables, linens, lighting and wedding equipment from Friendly Party Rental NYC with delivery across Riverdale, selected Bronx neighborhoods and Lower Westchester.")
    x=x.replace(".replace(' — Greenville, SC','')",".replace(' — Riverdale, NY','')")
    home.write_text(x)

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

# Preserve inherited workflow files during localization. GitHub Actions tokens cannot
# rewrite workflow files without separate workflows permission, and runtime app identity
# is handled in application/config code instead.

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



# Normalize NYC search/readiness exports and remove stale SC compatibility self-aliases.
search_readiness = ROOT/"lib/nycSearchReadiness.ts"
search_readiness.write_text("""export const NYC_GSC_PROPERTY=(process.env.NYC_GSC_PROPERTY||process.env.GSC_SITE_URL||'').trim()
export function normalizeNycSearchProperty(value:unknown):string|null{
  if(typeof value!=='string'||!value.trim()||!NYC_GSC_PROPERTY)return null
  return value.trim()===NYC_GSC_PROPERTY?NYC_GSC_PROPERTY:null
}
const CATEGORY_SEARCH_NAMES:Record<string,string>={
'tent-rentals':'Tent Rentals','table-chair-rentals':'Table & Chair Rentals','bounce-house-rentals':'Bounce House & Water Slide Rentals','linen-rentals':'Linen Rentals','concession-machine-rentals':'Concession Machine Rentals','beverage-food-service':'Food & Beverage Service Rentals','dance-floor-stage-rentals':'Dance Floor & Stage Rentals','event-lighting-rentals':'Event Lighting Rentals','foam-party-machine-rentals':'Foam Party Machine Rentals','generator-rentals':'Generator Rentals','heater-fan-rentals':'Heater & Fan Rentals','inflatable-movie-screen-rentals':'Inflatable Movie Screen Rentals','party-rental-accessories':'Party Rental Accessories','party-rental-packages':'Party Rental Packages','photobooth-rentals':'Photo Booth Rentals','restroom-rentals':'Restroom Rentals','yard-game-rentals':'Yard Game Rentals','weddings':'Wedding Rentals'}
export function categorySearchName(slug:string,fallback:string):string{return CATEGORY_SEARCH_NAMES[slug]||fallback.replace(/\\s*[—–-]\\s*(?:Riverdale,?\\s*NY|NYC\\s*\\/\\s*Downstate)$/i,'').trim()}
export const NYC_LOCAL_ENTITY_IDENTITY={name:'Friendly Party Rental NYC',phone:'315-884-1498',website:(process.env.NEXT_PUBLIC_SITE_URL||process.env.PUBLIC_BASE_URL||''),primaryMarket:'Riverdale / selected Bronx neighborhoods / Lower Westchester',businessModel:'Delivery-only service-area business; no customer warehouse pickup'} as const
export const NYC_GSC_DOMAIN_PROPERTY=NYC_GSC_PROPERTY
export const NYC_GSC_URL_PREFIX=''
""")

# RentSketch stays intentionally disabled until NYC has its own verified tenant/order entitlement.
rentsketch = ROOT/"lib/nycRentSketch.ts"
rentsketch.write_text("""// NYC customer RentSketch access is deliberately disabled until this location
// has its own server-enforced tenant and order/paid-entitlement integration.
export const NYC_RENTSKETCH_TENANT: string | null = null
export const nycOrderAccessUrl: string | null = null
""")

# Search Console code must use NYC symbols and generic private configuration.
search_console = ROOT/"lib/search-console.ts"
if search_console.exists():
    x=search_console.read_text()
    x=x.replace("from './scSearchReadiness'","from './nycSearchReadiness'")
    x=x.replace("process.env.GNYC_SITE_URL","process.env.GSC_SITE_URL || process.env.NYC_GSC_PROPERTY")
    x=x.replace("GNYC_SITE_URL","GSC_SITE_URL")
    x=x.replace("fpr-nyc-production.up.railway.app domain or its HTTPS root URL-prefix properties","the configured NYC Search Console property")
    search_console.write_text(x)

search_visibility = ROOT/"app/admin/settings/search-visibility/page.tsx"
if search_visibility.exists():
    x=search_visibility.read_text()
    x=x.replace("normalizeScSearchProperty,SC_GSC_DOMAIN_PROPERTY,SC_GSC_URL_PREFIX","normalizeNycSearchProperty,NYC_GSC_DOMAIN_PROPERTY,NYC_GSC_URL_PREFIX")
    x=x.replace("normalizeScSearchProperty","normalizeNycSearchProperty")
    x=x.replace("SC_GSC_DOMAIN_PROPERTY","NYC_GSC_DOMAIN_PROPERTY").replace("SC_GSC_URL_PREFIX","NYC_GSC_URL_PREFIX")
    x=x.replace("process.env.GNYC_SITE_URL","process.env.GSC_SITE_URL || process.env.NYC_GSC_PROPERTY")
    x=x.replace("SC-only <code>GNYC_SITE_URL</code>","NYC <code>GSC_SITE_URL</code>")
    x=x.replace("Use the genuine Riverdale business details and service area for a New York Google Business Profile. This page cannot verify a Business Profile or create local reviews. Do not use New York reviews or an unconfirmed street address as Riverdale evidence.","Search Console reporting is separate from any Google Business Profile. Do not create or claim a physical NYC storefront unless the business actually qualifies for one.")
    search_visibility.write_text(x)

# Sitemaps / IndexNow use NYC constants.
for rel in ["app/sitemap.ts","lib/nycIndexNow.ts"]:
    p=ROOT/rel
    if p.exists():
        x=p.read_text().replace("SC_STATIC_SEARCH_PATHS","NYC_STATIC_SEARCH_PATHS")
        p.write_text(x)

# Delivery is configured per approved NYC ZIP. Preserve the SC checkout data contract
# without inventing a route-mile number.
delivery = ROOT/"lib/delivery.ts"
if delivery.exists():
    x=delivery.read_text()
    x=x.replace("export interface DeliveryQuote{fee:number;zip:string;isEstimate:false;distanceBasis:'configured-zip-fee'}",
                "export interface DeliveryQuote{fee:number;zip:string;distance:number|null;isEstimate:false;distanceBasis:'configured-zip-fee'}")
    x=x.replace("return {fee:fees[zip],zip,isEstimate:false,distanceBasis:'configured-zip-fee'}",
                "return {fee:fees[zip],zip,distance:null,isEstimate:false,distanceBasis:'configured-zip-fee'}")
    delivery.write_text(x)

# NYC online orders/customers must default to New York, never SC.
orders_route = ROOT/"app/api/orders/route.ts"
if orders_route.exists():
    x=orders_route.read_text()
    x=x.replace("eventState || 'SC'","eventState || 'NY'")
    orders_route.write_text(x)

# Location-specific imports and copy in shared storefront components.
for rel in [
    "components/public/DesignYourEventCTA.tsx",
    "components/public/DesignYourEventLauncher.tsx",
    "components/public/StorefrontDesigner.tsx",
    "components/public/ItemGallery.tsx",
    "app/(public)/category/[slug]/CategoryClient.tsx",
    "app/(public)/category/[slug]/layout.tsx",
]:
    p=ROOT/rel
    if not p.exists(): continue
    x=p.read_text()
    x=x.replace("@/lib/scSearchReadiness","@/lib/nycSearchReadiness")
    x=x.replace("@/lib/scRentSketch","@/lib/nycRentSketch")
    x=x.replace("@/lib/scItemMedia","@/lib/nycItemMedia")
    x=x.replace("SC_RENTSKETCH_TENANT","NYC_RENTSKETCH_TENANT")
    x=x.replace("SC_ITEM_MEDIA","NYC_ITEM_MEDIA")
    x=x.replace("scOrderAccessUrl","nycOrderAccessUrl")
    x=x.replace("Greenville-area event","NYC / Downstate event").replace("Greenville team","NYC / Downstate team").replace("Greenville order","NYC / Downstate order")
    x=x.replace("['Greenville','Greer','Simpsonville','Mauldin','Taylors','Easley','Travelers Rest','Fountain Inn'].map(name=>({'@type':'Place',name:name+', SC'}))",
                "['Riverdale','Fieldston','Kingsbridge','The Bronx','Yonkers','Mount Vernon','New Rochelle','Bronxville','Tuckahoe','Eastchester','Pelham'].map(name=>({'@type':'Place',name}))")
    p.write_text(x)

# .env should describe NYC/private search settings, never SC build-time vars.
env = ROOT/".env.example"
if env.exists():
    x=env.read_text()
    x=x.replace("EMAIL_FROM=Friendly Party Rental SC <customerservice@friendlypartyrental.com>","EMAIL_FROM=Friendly Party Rental NYC <customerservice@friendlypartyrental.com>")
    x=x.replace("NEXT_PUBLIC_SC_GA_MEASUREMENT_ID=","NEXT_PUBLIC_NYC_GA_MEASUREMENT_ID=")
    x=x.replace("NEXT_PUBLIC_SC_GOOGLE_ADS_ID=","NEXT_PUBLIC_NYC_GOOGLE_ADS_ID=")
    x=x.replace("NEXT_PUBLIC_SC_GOOGLE_ADS_PURCHASE_LABEL=","NEXT_PUBLIC_NYC_GOOGLE_ADS_PURCHASE_LABEL=")
    x=x.replace("# Optional SC website tracking. Blank means off; no New York defaults.","# Optional NYC website analytics. Blank means off. Paid-ad configuration remains intentionally disabled unless explicitly added later.")
    env.write_text(x)

# Strict active-code guard: no South Carolina identity may survive the NYC app.
bad_patterns=[r"864[-. ]?610[-. ]?5324",r"friendlypartyrentalsc\\.com",r"Friendly Party Rental SC",r"Greenville, SC",r"Greenville SC",r"Upstate South Carolina"]
violations=[]
for base in ["app","components","lib","prisma","scripts"]:
    root=ROOT/base
    if not root.exists(): continue
    for p in root.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in TEXT_EXTS: continue
        try: data=p.read_text()
        except UnicodeDecodeError: continue
        for pat in bad_patterns:
            if re.search(pat,data,re.I):
                violations.append(f"{p.relative_to(ROOT)} :: {pat}")
                break
if violations:
    print("Active SC identity remains:\\n"+"\\n".join(violations[:100]),file=sys.stderr)
    sys.exit(2)

print("NYC localization transform complete")
