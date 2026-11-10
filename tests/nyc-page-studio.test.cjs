const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function transpile(file, mock = () => { throw Error('Unexpected runtime import') }) {
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(js, {
    module, exports: module.exports, require: mock,
    console, Date, JSON, Number, String, Object, Array, Map, Set, Error, RegExp, URL, process: { env: { NODE_ENV: 'production' } },
  }, { filename: file })
  return module.exports
}

const studioLib = transpile('lib/nycPageStudio.ts')
const goodBlock = { id: 'section_good', type: 'hero', heroTitle: 'Book NYC Rentals', heroButtonUrl: '/contact_us' }

test('custom page editor preserves legacy plain text instead of rendering blank', () => {
  const old = studioLib.parseNycStudioContent('Riverdale birthday parties & weddings')
  assert.equal(old[0].type, 'text')
  assert.equal(old[0].text, 'Riverdale birthday parties & weddings')
  const modern = studioLib.parseNycStudioContent(JSON.stringify([goodBlock]))
  assert.equal(modern[0].heroTitle, 'Book NYC Rentals')
})

test('new NYC page content normalization rejects cross-site script and unsafe markup', () => {
  assert.throws(() => studioLib.normalizeNycStudioContent([{...goodBlock, heroButtonUrl:'javascript:alert(1)'}]), /Links must/)
  assert.throws(() => studioLib.normalizeNycStudioContent([{...goodBlock, heroImageUrl:'data:text\/html,evil'}]), /Links must/)
  assert.throws(() => studioLib.normalizeNycStudioContent([{...goodBlock, type:'html', html:'<script>alert(1)</script>'}]), /unsupported/)
  assert.throws(() => studioLib.normalizeNycStudioContent([goodBlock,goodBlock]), /Duplicate/)
  assert.throws(() => studioLib.normalizeNycStudioContent(Array(61).fill(goodBlock)), /60/)
  const blocks=JSON.parse(studioLib.normalizeNycStudioContent([{...goodBlock, dangerousKey:'discard'}]))
  assert.equal(blocks[0].dangerousKey, undefined)
  assert.equal(blocks[0].heroButtonUrl, '/contact_us')
})

test('NYC custom pages use a shared visual renderer and both website editors point to Page Studio', () => {
  const publicPage = fs.readFileSync('app/(public)/[slug]/page.tsx', 'utf8')
  const shared = fs.readFileSync('components/public/NycCustomPageBlocks.tsx', 'utf8')
  const studio = fs.readFileSync('components/admin/NycPageStudio.tsx', 'utf8')
  const homepage = fs.readFileSync('components/admin/NycWebsiteBuilder.tsx', 'utf8')
  assert.match(publicPage, /import \{ RenderBlock, type Block \}/)
  assert.match(publicPage, /legacy-text/)
  assert.match(shared, /export function RenderBlock/)
  assert.match(studio, /<RenderBlock block=\{block\}/)
  assert.match(studio, /desktop.*tablet.*mobile/)
  assert.match(studio, /Publish Live/)
  assert.match(homepage, /href="\/admin\/website\/pages"/)
})

test('draft model and migration keep published website-page data isolated', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8')
  const migration = fs.readFileSync('prisma/migrations/20261109202000_nyc_custom_page_studio_private_drafts/migration.sql', 'utf8')
  const api = fs.readFileSync('app/api/admin/website-pages/studio/route.ts', 'utf8')
  assert.match(schema, /model NycCustomPageDraft/)
  assert.match(migration, /REFERENCES "WebsitePage"\("id"\)/)
  assert.match(migration, /ON DELETE CASCADE/)
  assert.match(api, /nycCustomPageDraft\.create/)
  assert.match(api, /nycCustomPageDraft\.updateMany/)
  assert.match(api, /expectedDraftUpdatedAt/)
  assert.match(api, /confirmNycPageAdminPassword/)
  assert.match(api, /updatedAt: expected/)
  assert.match(api, /Invalid NYC origin/)
  assert.doesNotMatch(api, /data: \{ title: data\.title\.trim\(\), content, isPublished: true \}/)
})

function setupApi() {
  const page = { id:'page-1', slug:'riverdale-party-tents', title:'Live headline', content:'[]', isPublished:true, updatedAt:new Date('2026-11-08T00:00:00Z') }
  let draft = null
  let updates = 0
  const prisma = {
    websitePage: {
      findUnique: async () => page,
      update: async ({data}) => { updates++; Object.assign(page, data); return { ...page } },
    },
    nycCustomPageDraft: {
      create: async ({data}) => {
        if (draft) { const conflict=Error('Draft already exists'); conflict.code='P2002'; throw conflict }
        draft = { ...data, updatedAt:new Date('2026-11-09T20:00:00Z') }
        return {updatedAt:draft.updatedAt}
      },
      updateMany: async ({where,data}) => {
        if (!draft || draft.pageId !== where.pageId ||
          draft.updatedAt.getTime() !== where.updatedAt.getTime()) return {count:0}
        draft = { ...draft, ...data }
        return {count:1}
      },
      findUnique: async () => draft,
      findUniqueOrThrow: async () => {
        if (!draft) throw Error('Draft missing')
        return {updatedAt:draft.updatedAt}
      },
      deleteMany: async ({where}) => {
        if (!draft || (where.updatedAt && draft.updatedAt.getTime() !== where.updatedAt.getTime())) return {count:0}
        draft = null
        return {count:1}
      },
    },
    $transaction: async f => f(prisma),
  }
  const route = transpile('app/api/admin/website-pages/studio/route.ts', id => {
    if (id === 'next/server') return { NextResponse:{ json:(body,options={}) => ({body,status:options.status||200}) } }
    if (id === 'next-auth') return { getServerSession:async () => ({user:{role:'admin',username:'nycadmin'}}) }
    if (id === '@/lib/auth') return { authOptions:{} }
    if (id === '@/lib/prisma') return {prisma}
    if (id === '@/lib/confirmNycPageAdminPassword') return {confirmNycPageAdminPassword:async (_,pwd)=>pwd==='strong-admin-password'}
    if (id === '@/lib/nycPageStudio') return studioLib
    if (id === '@/lib/nycCatalogCore.mjs') return {localizeNycContactText:raw=>raw}
    throw Error('Unexpected dependency '+id)
  })
  function request(data, origin='https://friendlypartyrentalnyc.com') {
    return {
      headers: {get:n=>n==='origin'?origin:n==='content-type'?'application/json':null},
      nextUrl:{hostname:'friendlypartyrentalnyc.com'},
      json:async()=>data,
    }
  }
  return {route,request,page,getDraft:()=>draft,getUpdates:()=>updates}
}

test('saving a private draft cannot modify a published NYC page', async () => {
  const f=setupApi()
  const r=await f.route.POST(f.request({action:'save',pageId:'page-1',title:'New draft headline',blocks:[goodBlock],expectedDraftUpdatedAt:null}))
  assert.equal(r.status,200)
  assert.equal(r.body.saved,true)
  assert.equal(f.getDraft().title,'New draft headline')
  assert.equal(f.page.title,'Live headline')
  assert.equal(f.page.content,'[]')
  assert.equal(f.getUpdates(),0)
  const foreign=await f.route.POST(f.request({action:'save',pageId:'page-1',title:'Bad',blocks:[goodBlock]},'https://evil.example'))
  assert.equal(foreign.status,403)
  assert.equal(f.getUpdates(),0)
})

test('server refuses to publish an empty NYC private page', async () => {
  const f=setupApi()
  const saved=await f.route.POST(f.request({action:'save',pageId:'page-1',title:'Empty pending page',blocks:[],expectedDraftUpdatedAt:null}))
  const result=await f.route.POST(f.request({
    action:'publish',pageId:'page-1',expectedDraftUpdatedAt:saved.body.draftUpdatedAt.toISOString(),
    adminPassword:'strong-admin-password',
  }))
  assert.equal(result.status,400)
  assert.equal(f.getUpdates(),0)
  assert.equal(f.page.title,'Live headline')
})

test('saved NYC page drafts reject stale and missing revisions', async () => {
  const f=setupApi()
  const first=await f.route.POST(f.request({action:'save',pageId:'page-1',title:'First editor',blocks:[goodBlock],expectedDraftUpdatedAt:null}))
  assert.equal(first.status,200)
  const duplicate=await f.route.POST(f.request({action:'save',pageId:'page-1',title:'Other first editor',blocks:[goodBlock],expectedDraftUpdatedAt:null}))
  assert.equal(duplicate.status,409)
  const missing=await f.route.POST(f.request({action:'save',pageId:'page-1',title:'No revision',blocks:[goodBlock]}))
  assert.equal(missing.status,409)
  const second=await f.route.POST(f.request({action:'save',pageId:'page-1',title:'Updated from current revision',blocks:[goodBlock],
    expectedDraftUpdatedAt:first.body.draftUpdatedAt.toISOString()}))
  assert.equal(second.status,200)
  assert.equal(f.getDraft().title,'Updated from current revision')
  const stale=await f.route.POST(f.request({action:'save',pageId:'page-1',title:'Old editor overwrite attempt',blocks:[goodBlock],
    expectedDraftUpdatedAt:first.body.draftUpdatedAt.toISOString()}))
  assert.equal(stale.status,409)
  assert.equal(f.getDraft().title,'Updated from current revision')
  assert.equal(f.getUpdates(),0)
})

const editHistory = transpile('lib/nycPageEditHistory.ts')
test('NYC page undo/redo groups typing, duplicates safely and clears redo after a fresh edit', () => {
  const empty={past:[],future:[],lastGroup:null,lastEditAt:0}
  const origin={title:'Live',blocks:[goodBlock]}
  const first={title:'New title',blocks:[goodBlock]}
  const second={title:'New title!',blocks:[goodBlock]}
  const h1=editHistory.recordNycPageEdit(empty,origin,first,'title',1000)
  assert.equal(h1.past.length,1)
  const h2=editHistory.recordNycPageEdit(h1,first,second,'title',1500)
  assert.equal(h2.past.length,1)
  const back=editHistory.undoNycPageEdit(h2,second)
  assert.equal(back.snapshot.title,'Live')
  assert.equal(back.history.future.length,1)
  const forward=editHistory.redoNycPageEdit(back.history,back.snapshot)
  assert.equal(forward.snapshot.title,'New title!')
  const changed=editHistory.recordNycPageEdit(back.history,back.snapshot,
    {title:'Alternate',blocks:[goodBlock]},'title',3000)
  assert.equal(changed.future.length,0)
  assert.equal(editHistory.redoNycPageEdit(changed,{title:'Alternate',blocks:[goodBlock]}),null)
})
test('NYC page studio exposes functional section duplication and live-vs-draft preview controls', () => {
  const ui=fs.readFileSync('components/admin/NycPageStudio.tsx','utf8')
  const api=fs.readFileSync('app/api/admin/website-pages/studio/route.ts','utf8')
  assert.match(ui,/duplicateBlock\(index\)/)
  assert.match(ui,/Duplicate section/)
  assert.match(ui,/undoNycPageEdit/)
  assert.match(ui,/redoNycPageEdit/)
  assert.match(ui,/expectedDraftUpdatedAt: draftVersion/)
  assert.match(ui,/setPreviewMode\('live'\)/)
  assert.match(ui,/previewBlocks\.map/)
  assert.match(api,/liveBlocks: parseNycStudioContent\(page\.content/)
})

test('publishing requires NYC admin password and exact current draft revision', async () => {
  const f=setupApi()
  const saved=await f.route.POST(f.request({action:'save',pageId:'page-1',title:'Published from private draft',blocks:[goodBlock],expectedDraftUpdatedAt:null}))
  const expectedDraftUpdatedAt=saved.body.draftUpdatedAt.toISOString()
  const noPassword=await f.route.POST(f.request({action:'publish',pageId:'page-1',expectedDraftUpdatedAt}))
  assert.equal(noPassword.status,403)
  assert.equal(f.getUpdates(),0)
  const stale=await f.route.POST(f.request({action:'publish',pageId:'page-1',expectedDraftUpdatedAt:'2026-11-01T00:00:00Z',adminPassword:'strong-admin-password'}))
  assert.equal(stale.status,409)
  assert.equal(f.getUpdates(),0)
  const result=await f.route.POST(f.request({action:'publish',pageId:'page-1',expectedDraftUpdatedAt,adminPassword:'strong-admin-password'}))
  assert.equal(result.status,200)
  assert.equal(f.page.title,'Published from private draft')
  assert.equal(f.page.isPublished,true)
  assert.equal(f.getUpdates(),1)
  assert.equal(f.getDraft(),null)
})
