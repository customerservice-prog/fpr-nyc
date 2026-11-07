import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile, mkdtemp, writeFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {balanceReminderWindow, isBalanceReminderEligible} from '../lib/nycBalanceReminder.ts'

test('the reminder requires authorization, dry-runs safely, and records only accepted mail', async () => {
  const source = await readFile('app/api/cron/balance-reminder/route.ts', 'utf8')
  const withoutImports = source.replace(/^import .*\n/gm, '')
  const preamble = `type NextRequest = any\nconst {NextResponse,isAuthorizedCronRequest,prisma,sendEmail,balanceReminderEmail,formatDate,isNycPublicBookingDateOpen,balanceReminderWindow,isBalanceReminderEligible} = (globalThis as any).__nycReminderDeps\n`
  const dir = await mkdtemp(join(tmpdir(), 'nyc-reminder-route-'))
  const file = join(dir, 'route.ts')
  await writeFile(file, preamble + withoutImports)
  let authorized = false, enabled = true, shouldFail = false
  const sent = [], updates = []
  const order = {id:'order-1',orderNumber:'123',status:'active',followUpsPaused:false,totalAmount:100,amountPaid:20,balanceReminderSentAt:null,eventDate:new Date('2027-01-03T00:00:00Z'),eventAddress:null,eventCity:null,eventState:null,eventZip:null,customer:{firstName:'Test',lastName:'Customer',email:'test@example.test'}}
  globalThis.__nycReminderDeps = {
    NextResponse:{json:(body, options) => ({body, status:options?.status || 200})},
    isAuthorizedCronRequest:async () => authorized,
    prisma:{automaticMessage:{findUnique:async()=>({enabled})}, order:{findMany:async()=>[order],update:async args=>updates.push(args)}},
    sendEmail:async args => { if(shouldFail) throw new Error('provider failed'); sent.push(args) },
    balanceReminderEmail:()=>({subject:'test',html:'test'}),formatDate:()=> 'Jan 3, 2027',
    isNycPublicBookingDateOpen:()=>true,balanceReminderWindow,isBalanceReminderEligible,
  }
  const old = process.env.NYC_BALANCE_REMINDERS_ENABLED
  const request = {nextUrl:new URL('https://example.test/api/cron/balance-reminder')}
  try {
    const {GET} = await import(pathToFileURL(file).href)
    assert.equal((await GET(request)).status, 401)
    authorized = true; enabled = false
    assert.equal((await GET(request)).body.skipped, true)
    enabled = true; delete process.env.NYC_BALANCE_REMINDERS_ENABLED
    const preview = await GET(request)
    assert.equal(preview.body.dryRun, true); assert.equal(preview.body.eligible, 1)
    assert.equal(sent.length, 0); assert.equal(updates.length, 0)
    process.env.NYC_BALANCE_REMINDERS_ENABLED = 'true'
    assert.equal((await GET(request)).body.sent, 1)
    assert.match(sent[0].idempotencyKey, /nyc-balance-reminder\/order-1\/2027-01-03/)
    assert.equal(updates.length, 1)
    shouldFail = true
    const failure = await GET(request)
    assert.equal(failure.status, 500); assert.equal(updates.length, 1)
  } finally {
    if (old === undefined) delete process.env.NYC_BALANCE_REMINDERS_ENABLED; else process.env.NYC_BALANCE_REMINDERS_ENABLED = old
    delete globalThis.__nycReminderDeps
    await rm(dir,{recursive:true,force:true})
  }
})
