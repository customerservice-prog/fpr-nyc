import concurrent.futures, html, json, re, time, urllib.parse, urllib.request, urllib.error, xml.etree.ElementTree as ET
from collections import deque, Counter
from html.parser import HTMLParser

SITES = {
  "syracuse": {
    "base": "https://www.friendlypartyrental.com",
    "hosts": {"friendlypartyrental.com", "www.friendlypartyrental.com"},
  },
  "nyc": {
    "base": "https://friendlypartyrentalnyc.com",
    "hosts": {"friendlypartyrentalnyc.com", "www.friendlypartyrentalnyc.com"},
  },
}
SKIP_PREFIXES = ("/api/", "/admin/", "/driver/", "/_next/", "/uploads/")
SKIP_EXT = re.compile(r"\.(?:jpg|jpeg|png|gif|webp|svg|ico|pdf|zip|css|js|woff2?|ttf|mp4|mov|webm|xml|txt)$", re.I)
UA = "FriendlyPartyRental-LiveParityAudit/1.0"
MAX_PAGES = 800
TIMEOUT = 18

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links=[]; self.images=[]; self.title=[]; self.h1=[]; self.h2=[]
        self.meta={}; self.canonical=""; self.ld=[]; self.text=[]; self.forms=0
        self._stack=[]; self._capture=None
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        self._stack.append(tag)
        if tag=="a" and a.get("href"): self.links.append(a["href"])
        if tag=="img": self.images.append((a.get("src",""), a.get("alt")))
        if tag=="form": self.forms += 1
        if tag=="meta":
            key=(a.get("name") or a.get("property") or "").lower()
            if key and a.get("content") is not None: self.meta[key]=a.get("content","")
        if tag=="link" and (a.get("rel") or "").lower()=="canonical": self.canonical=a.get("href","")
        if tag in ("title","h1","h2"): self._capture=tag
        if tag=="script" and (a.get("type") or "").lower()=="application/ld+json": self._capture="ld"
    def handle_endtag(self, tag):
        if self._stack: self._stack.pop()
        if self._capture==tag or (tag=="script" and self._capture=="ld"): self._capture=None
    def handle_data(self, data):
        s=" ".join(data.split())
        if not s: return
        if self._capture=="title": self.title.append(s)
        elif self._capture=="h1": self.h1.append(s)
        elif self._capture=="h2": self.h2.append(s)
        elif self._capture=="ld": self.ld.append(s)
        if not any(x in ("script","style","noscript") for x in self._stack):
            self.text.append(s)

def norm_url(url, site):
    try:
        p=urllib.parse.urlsplit(url)
    except Exception:
        return None
    if not p.scheme: return None
    if p.scheme not in ("http","https"): return None
    host=(p.hostname or "").lower()
    if host not in site["hosts"]: return None
    path=urllib.parse.unquote(p.path or "/")
    if not path.startswith("/"): path="/"+path
    path=re.sub(r"/{2,}", "/", path)
    if path != "/" and path.endswith("/"): path=path[:-1]
    if any(path.startswith(x) for x in SKIP_PREFIXES): return None
    if SKIP_EXT.search(path): return None
    q=urllib.parse.parse_qs(p.query, keep_blank_values=False)
    # Only preserve queries that represent actual public content. Most site queries are tracking/search state.
    if q: 
        return urllib.parse.urlunsplit(("https", site["base"].split("//",1)[1], path, "", ""))
    return urllib.parse.urlunsplit(("https", site["base"].split("//",1)[1], path, "", ""))

def req(url, method="GET"):
    r=urllib.request.Request(url, method=method, headers={"User-Agent":UA, "Accept":"text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Encoding":"identity"})
    start=time.time()
    try:
        with urllib.request.urlopen(r, timeout=TIMEOUT) as resp:
            body=resp.read(3_000_000)
            return {
                "status": getattr(resp,"status",200),
                "final": resp.geturl(),
                "content_type": resp.headers.get("content-type",""),
                "body": body,
                "ms": round((time.time()-start)*1000),
            }
    except urllib.error.HTTPError as e:
        try: body=e.read(200000)
        except Exception: body=b""
        return {"status":e.code,"final":url,"content_type":e.headers.get("content-type","") if e.headers else "","body":body,"ms":round((time.time()-start)*1000)}
    except Exception as e:
        return {"status":0,"final":url,"content_type":"","body":b"","ms":round((time.time()-start)*1000),"error":str(e)}

def sitemap_urls(site):
    out=set()
    for path in ("/sitemap.xml","/sitemap_index.xml"):
        url=site["base"]+path
        r=req(url)
        if r["status"]!=200: continue
        try:
            root=ET.fromstring(r["body"])
            locs=[(el.text or "").strip() for el in root.iter() if el.tag.endswith("loc")]
            for loc in locs:
                if loc.endswith(".xml"):
                    rr=req(loc)
                    if rr["status"]==200:
                        rt=ET.fromstring(rr["body"])
                        for el in rt.iter():
                            if el.tag.endswith("loc") and el.text:
                                u=norm_url(el.text.strip(),site)
                                if u: out.add(u)
                else:
                    u=norm_url(loc,site)
                    if u: out.add(u)
        except Exception:
            pass
    return out

def parse_html(body):
    enc="utf-8"
    try: s=body.decode(enc,"replace")
    except Exception: s=str(body)
    p=Parser()
    try: p.feed(s)
    except Exception: pass
    text=" ".join(p.text)
    text=re.sub(r"\s+"," ",text).strip()
    return p,text,s

def schema_types(ld_chunks):
    types=[]
    for raw in ld_chunks:
        try:
            obj=json.loads(html.unescape(raw))
            stack=[obj]
            while stack:
                x=stack.pop()
                if isinstance(x,dict):
                    t=x.get("@type")
                    if isinstance(t,str): types.append(t)
                    elif isinstance(t,list): types.extend(str(v) for v in t)
                    stack.extend(x.values())
                elif isinstance(x,list): stack.extend(x)
        except Exception:
            # fallback quick type extraction
            types.extend(re.findall(r'"@type"\s*:\s*"([^"]+)"', raw))
    return sorted(set(types))

def classify(path):
    if path=="/": return "home"
    if path.startswith("/items/"): return "item"
    if path.startswith("/category/"): return "category"
    if path.startswith("/party-rentals-"): return "location"
    if "wedding" in path: return "wedding"
    if path.startswith("/pay/") or path.startswith("/contract/") or path.startswith("/schedule/"): return "transactional"
    return "static"

def crawl(name, site):
    seeds={site["base"]+"/"}
    seeds |= sitemap_urls(site)
    q=deque(sorted(seeds))
    seen=set()
    pages={}
    discovered_links=Counter()
    while q and len(seen)<MAX_PAGES:
        url=q.popleft()
        if url in seen: continue
        seen.add(url)
        r=req(url)
        path=urllib.parse.urlsplit(url).path or "/"
        rec={"url":url,"path":path,"status":r["status"],"ms":r["ms"],"final":r.get("final",url),"content_type":r.get("content_type",""),"error":r.get("error","")}
        if r["status"]==200 and "html" in r.get("content_type","").lower():
            p,text,raw=parse_html(r["body"])
            links=set()
            for href in p.links:
                absu=urllib.parse.urljoin(url, href)
                nu=norm_url(absu,site)
                if nu:
                    links.add(nu)
                    discovered_links[urllib.parse.urlsplit(nu).path or "/"] += 1
                    if nu not in seen: q.append(nu)
            rec.update({
                "title":" ".join(p.title).strip(),
                "h1":" | ".join(p.h1).strip(),
                "h2":p.h2,
                "meta_description":p.meta.get("description",""),
                "meta_robots":p.meta.get("robots",""),
                "canonical":p.canonical,
                "word_count":len(re.findall(r"\b\w+\b",text)),
                "text_sample":text[:1000],
                "links":sorted(links),
                "internal_link_count":len(links),
                "image_count":len(p.images),
                "missing_alt":sum(1 for _,alt in p.images if alt is None or not str(alt).strip()),
                "forms":p.forms,
                "schema_types":schema_types(p.ld),
                "content_size":len(r["body"]),
                "flags":{
                    "rentsketch": "rentsketch" in raw.lower() or "design your event" in text.lower(),
                    "google_reviews": "google review" in text.lower() or "what our customers say" in text.lower(),
                    "youtube": "youtube" in raw.lower(),
                    "wedding_packages": "wedding package" in text.lower(),
                    "event_planning": "event planning" in text.lower(),
                    "service_area": "service area" in text.lower() or "serving " in text.lower(),
                    "faq": "frequently asked" in text.lower() or "/frequently_asked_questions" in raw.lower(),
                    "gallery": "/gallery" in raw.lower(),
                    "employment": "/employment" in raw.lower(),
                }
            })
        pages[path]=rec
    # collect links that never became records (due MAX or queue)
    return pages

def bad_refs(pages, site_name):
    bad=[]
    forbidden = ["syracuse","minoa","central new york"] if site_name=="nyc" else ["riverdale","downstate new york","friendlypartyrentalnyc.com"]
    for path,r in pages.items():
        if r.get("status")!=200: continue
        hay=(" ".join([r.get("title",""),r.get("h1",""),r.get("text_sample","")])).lower()
        hits=[x for x in forbidden if x in hay]
        if hits: bad.append({"path":path,"hits":hits})
    return bad

def summarize(site_name,pages):
    bytype=Counter(classify(p) for p in pages)
    statuses=Counter(str(v.get("status")) for v in pages.values())
    broken=[p for p,v in pages.items() if v.get("status",0)>=400 or v.get("status",0)==0]
    no_title=[p for p,v in pages.items() if v.get("status")==200 and not v.get("title")]
    no_h1=[p for p,v in pages.items() if v.get("status")==200 and not v.get("h1")]
    no_desc=[p for p,v in pages.items() if v.get("status")==200 and not v.get("meta_description")]
    no_canon=[p for p,v in pages.items() if v.get("status")==200 and not v.get("canonical")]
    noindex=[p for p,v in pages.items() if "noindex" in v.get("meta_robots","").lower()]
    missing_alt=sum(v.get("missing_alt",0) for v in pages.values())
    imgs=sum(v.get("image_count",0) for v in pages.values())
    return {"count":len(pages),"types":dict(bytype),"statuses":dict(statuses),"broken":broken,"no_title":no_title,"no_h1":no_h1,"no_desc":no_desc,"no_canonical":no_canon,"noindex_count":len(noindex),"noindex_sample":noindex[:30],"missing_alt":missing_alt,"images":imgs,"bad_refs":bad_refs(pages,site_name)}

def path_sets(pages,kind):
    return {p for p in pages if classify(p)==kind and pages[p].get("status")==200}

def same_slug_set(pages, prefix):
    out={}
    for p,v in pages.items():
        if v.get("status")==200 and p.startswith(prefix):
            out[p[len(prefix):]]=p
    return out

def compare(a,b):
    result={}
    for kind in ("item","category","static","wedding","location"):
        A=path_sets(a,kind); B=path_sets(b,kind)
        result[kind]={"main_only":sorted(A-B),"nyc_only":sorted(B-A),"shared":len(A&B)}
    ai=same_slug_set(a,"/items/"); bi=same_slug_set(b,"/items/")
    ac=same_slug_set(a,"/category/"); bc=same_slug_set(b,"/category/")
    result["item_slugs"]={"main_only":sorted(set(ai)-set(bi)),"nyc_only":sorted(set(bi)-set(ai)),"shared":len(set(ai)&set(bi))}
    result["category_slugs"]={"main_only":sorted(set(ac)-set(bc)),"nyc_only":sorted(set(bc)-set(ac)),"shared":len(set(ac)&set(bc))}
    shared=sorted(set(a)&set(b))
    diffs=[]
    for p in shared:
        A=a[p]; B=b[p]
        if A.get("status")!=200 or B.get("status")!=200: continue
        aw=A.get("word_count",0); bw=B.get("word_count",0)
        diffs.append({
            "path":p,
            "type":classify(p),
            "main_words":aw,
            "nyc_words":bw,
            "word_delta":bw-aw,
            "word_ratio":round((bw/aw),2) if aw else None,
            "main_h2":len(A.get("h2",[])),
            "nyc_h2":len(B.get("h2",[])),
            "main_schema":A.get("schema_types",[]),
            "nyc_schema":B.get("schema_types",[]),
            "main_flags":A.get("flags",{}),
            "nyc_flags":B.get("flags",{}),
            "main_title":A.get("title",""),
            "nyc_title":B.get("title",""),
            "main_h1":A.get("h1",""),
            "nyc_h1":B.get("h1",""),
        })
    result["shared_page_diffs"]=diffs
    return result

main=crawl("syracuse",SITES["syracuse"])
nyc=crawl("nyc",SITES["nyc"])
report={
  "generated_at":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),
  "main":summarize("syracuse",main),
  "nyc":summarize("nyc",nyc),
  "comparison":compare(main,nyc),
  "pages":{"main":main,"nyc":nyc},
}
with open("live_site_audit.json","w",encoding="utf-8") as f: json.dump(report,f,indent=2,ensure_ascii=False)

# Human-readable summary
c=report["comparison"]; sm=report["main"]; sn=report["nyc"]
print("=== LIVE SITE PARITY AUDIT ===")
print("MAIN pages",sm["count"],sm["types"],"statuses",sm["statuses"])
print("NYC pages",sn["count"],sn["types"],"statuses",sn["statuses"])
print("MAIN broken",sm["broken"][:40])
print("NYC broken",sn["broken"][:40])
print("ITEM shared",c["item_slugs"]["shared"],"MAIN-only",c["item_slugs"]["main_only"],"NYC-only",c["item_slugs"]["nyc_only"])
print("CATEGORY shared",c["category_slugs"]["shared"],"MAIN-only",c["category_slugs"]["main_only"],"NYC-only",c["category_slugs"]["nyc_only"])
for kind in ("static","wedding","location"):
    print(kind.upper(),"MAIN-only",c[kind]["main_only"])
    print(kind.upper(),"NYC-only",c[kind]["nyc_only"])
print("MAIN bad geo refs",sm["bad_refs"][:80])
print("NYC bad geo refs",sn["bad_refs"][:80])
print("MAIN no title",sm["no_title"][:50],"no h1",sm["no_h1"][:50],"no desc",sm["no_desc"][:50],"no canonical",sm["no_canonical"][:50],"noindex",sm["noindex_count"])
print("NYC no title",sn["no_title"][:50],"no h1",sn["no_h1"][:50],"no desc",sn["no_desc"][:50],"no canonical",sn["no_canonical"][:50],"noindex",sn["noindex_count"])
# Biggest content deficits on NYC among same paths
shared=[x for x in c["shared_page_diffs"] if x["main_words"]>=120]
shared.sort(key=lambda x:x["word_ratio"] if x["word_ratio"] is not None else 99)
print("=== BIGGEST NYC CONTENT DEFICITS (shared paths) ===")
for x in shared[:80]:
    print(json.dumps(x,ensure_ascii=False))
# Feature deltas on shared pages
print("=== FEATURE DELTAS ON SHARED PAGES ===")
for x in c["shared_page_diffs"]:
    missing=[k for k,v in x["main_flags"].items() if v and not x["nyc_flags"].get(k)]
    if missing: print(x["path"],"NYC missing",missing)
